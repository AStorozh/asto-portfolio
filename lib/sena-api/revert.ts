import { and, eq, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { aiCapabilities, aiSettings, analyticsLinks, contactMethods, quotes, resumeSections, senaAudit, workItems } from "@/lib/schema";
import { ApiError, flag, onlyKnown } from "./http";
import { auditReady, getAudit, record, type RowTable, type Step, type Tx } from "./audit-core";
import { publish } from "./publish";
import { scopeOf } from "./texts";
import { readLists, writeLists, type Lists } from "./work-lists";

// Reverting a log entry. An entry stores the "how to undo" steps (undo) and what the edit wrote (expect). Before reverting, each step
// is checked against the DB: if the value was changed after the edit (in the admin, by another edit), that is a conflict, and a revert without force: true
// does not go through - otherwise it would overwrite someone else's newer edit. The revert is itself logged and can itself be reverted (re-applying the edit).

type AnyTable = PgTable & Record<string, AnyPgColumn>;
type Row = Record<string, unknown>;

const TABLES: Record<RowTable, { table: AnyTable; key: string }> = {
	work_items: { table: workItems as unknown as AnyTable, key: "slug" },
	contact_methods: { table: contactMethods as unknown as AnyTable, key: "slug" },
	resume_sections: { table: resumeSections as unknown as AnyTable, key: "slug" },
	quotes: { table: quotes as unknown as AnyTable, key: "slug" },
	ai_capabilities: { table: aiCapabilities as unknown as AnyTable, key: "slug" },
	analytics_links: { table: analyticsLinks as unknown as AnyTable, key: "code" },
};

const norm = (v: unknown): unknown => (v instanceof Date ? v.toISOString() : v === undefined ? null : Array.isArray(v) ? v.map(norm) : v);
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const without = (row: Row, field: string): Row => Object.fromEntries(Object.entries(row).filter(([k]) => k !== field));
const coerce = (row: Row): Row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, k === "created_at" && typeof v === "string" ? new Date(v) : v]));
const picked = (row: Row, keys: string[]): Row => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]));

async function getRow(tx: Tx, name: RowTable, key: string): Promise<Row | undefined> {
	const { table, key: col } = TABLES[name];
	const rows = await tx.select().from(table).where(eq(table[col], key));
	return rows[0] as Row | undefined;
}

async function workId(tx: Tx, slug: string): Promise<number | null> {
	const [w] = await tx.select({ id: workItems.id }).from(workItems).where(eq(workItems.slug, slug));
	return w?.id ?? null;
}

const diffFields = (current: Row, expect: Row) => Object.keys(expect).filter((k) => !same(current[k], expect[k]));

/** Description of the conflict in words, or null if the step can be reverted. */
async function check(tx: Tx, s: Step): Promise<string | null> {
	switch (s.t) {
		case "text": {
			const cur = (await scopeOf(s.scope).current()).get(s.key) ?? null;
			return cur === s.expect ? null : `текст «${s.key}» (${s.scope}) уже изменён после этой правки`;
		}
		case "ai": {
			const [row] = await tx.select().from(aiSettings).where(eq(aiSettings.key, s.key));
			return (row?.value ?? null) === s.expect ? null : `настройка ассистента «${s.key}» уже изменена после этой правки`;
		}
		case "row": {
			const row = await getRow(tx, s.table, s.key);
			if (!row) return `записи ${s.table}/${s.key} уже нет`;
			const d = diffFields(row, s.expect);
			return d.length ? `${s.table}/${s.key}: после правки изменены поля ${d.join(", ")}` : null;
		}
		case "row_insert": {
			const { key } = TABLES[s.table];
			return (await getRow(tx, s.table, String(s.row[key]))) ? `запись ${s.table}/${String(s.row[key])} уже существует` : null;
		}
		case "row_delete": {
			const row = await getRow(tx, s.table, s.key);
			if (!row) return `записи ${s.table}/${s.key} уже нет`;
			const d = s.expect ? diffFields(row, s.expect) : [];
			return d.length ? `${s.table}/${s.key}: после правки изменены поля ${d.join(", ")}` : null;
		}
		case "work_lists": {
			const id = await workId(tx, s.slug);
			if (id === null) return `работы «${s.slug}» уже нет`;
			const cur = (await readLists(tx, id)) as unknown as Row;
			const d = diffFields(cur, s.expect);
			return d.length ? `работа «${s.slug}»: после правки изменены списки ${d.join(", ")}` : null;
		}
	}
}

/** Execute a revert step. Returns the inverse step, which lets the revert itself be reverted. */
async function apply(tx: Tx, s: Step): Promise<Step> {
	switch (s.t) {
		case "text": {
			const scope = scopeOf(s.scope);
			const cur = (await scope.current()).get(s.key) ?? null;
			await scope.undo(tx, s.key, s.old);
			return { t: "text", scope: s.scope, key: s.key, old: cur, expect: s.old };
		}
		case "ai": {
			const [row] = await tx.select().from(aiSettings).where(eq(aiSettings.key, s.key));
			if (s.old === null) await tx.delete(aiSettings).where(eq(aiSettings.key, s.key));
			else await tx.insert(aiSettings).values({ key: s.key, value: s.old }).onConflictDoUpdate({ target: aiSettings.key, set: { value: s.old } });
			return { t: "ai", key: s.key, old: row?.value ?? null, expect: s.old };
		}
		case "row": {
			const { table, key: col } = TABLES[s.table];
			const cur = (await getRow(tx, s.table, s.key)) as Row;
			await tx.update(table).set(coerce(s.set)).where(eq(table[col], s.key));
			return { t: "row", table: s.table, key: String(s.set[col] ?? s.key), set: picked(cur, Object.keys(s.set)), expect: s.set };
		}
		case "row_insert": {
			const { table, key: col } = TABLES[s.table];
			await tx.insert(table).values(coerce(s.row)); // with the previous id: the order of entries (quotes are sorted by id) does not change
			return { t: "row_delete", table: s.table, key: String(s.row[col]), expect: without(s.row, "id") };
		}
		case "row_delete": {
			const { table, key: col } = TABLES[s.table];
			const cur = (await getRow(tx, s.table, s.key)) as Row;
			await tx.delete(table).where(eq(table[col], s.key));
			return { t: "row_insert", table: s.table, row: cur };
		}
		case "work_lists": {
			const id = (await workId(tx, s.slug)) as number;
			const cur = (await readLists(tx, id)) as unknown as Row;
			await writeLists(tx, id, s.lists as Partial<Lists>);
			return { t: "work_lists", slug: s.slug, lists: picked(cur, Object.keys(s.lists)), expect: s.lists };
		}
	}
}

function describe(s: Step): Row {
	switch (s.t) {
		case "text": return { what: `${s.scope}/${s.key}`, from: s.expect, to: s.old };
		case "ai": return { what: `ai/${s.key}`, from: s.expect, to: s.old };
		case "row": return { what: `${s.table}/${s.key}`, fields: Object.keys(s.set), to: s.set };
		case "row_insert": return { what: `${s.table}: вернуть удалённую запись`, row: s.row };
		case "row_delete": return { what: `${s.table}/${s.key}: убрать созданную запись` };
		case "work_lists": return { what: `works/${s.slug}`, lists: Object.keys(s.lists), to: s.lists };
	}
}

/** Revert a log entry. dry_run - only check and show what will be restored; force - revert even if there are conflicts. */
export async function revertEntry(id: number, body: Row, dryRun: boolean) {
	onlyKnown(body, ["dry_run", "force"]);
	const force = "force" in body ? flag(body.force, "force") : false;
	const entry = await getAudit(id);
	if (entry.kind !== "write") throw new ApiError(409, "not_revertable", `Запись №${id} — не правка (${entry.kind}), откатывать нечего`);
	if (entry.undo === null) throw new ApiError(409, "not_revertable", `Запись №${id} откатить нельзя: у этого действия нет отката (${entry.action})`);
	if (entry.reverted_by !== null) throw new ApiError(409, "already_reverted", `Запись №${id} уже откатили записью №${entry.reverted_by}`);
	const steps = JSON.parse(entry.undo) as Step[];

	if (dryRun) {
		const conflicts = await db.transaction(async (tx) => (await Promise.all(steps.map((s) => check(tx, s)))).filter((c): c is string => c !== null));
		return { dry_run: true, applied: false, revert: id, can_revert: conflicts.length === 0, conflicts, would_restore: steps.map(describe) };
	}

	await auditReady();
	const { newId, conflicts } = await db.transaction(async (tx) => {
		const found: string[] = [];
		for (const s of steps) {
			const c = await check(tx, s);
			if (c) found.push(c);
		}
		if (found.length && !force) {
			throw new ApiError(409, "conflict", "После этой правки данные менялись, откат затёр бы новое. Проверь conflicts; если откат всё равно нужен, повтори с force: true", { conflicts: found });
		}
		const redo: Step[] = [];
		for (const s of [...steps].reverse()) redo.push(await apply(tx, s));
		const newId = await record(tx, {
			action: "revert",
			target: entry.target,
			summary: `Откат записи №${id}: ${entry.summary}`,
			changes: { reverts: id, forced: force && found.length > 0, conflicts: found, restored: steps.map(describe) },
			undo: redo,
			revertsId: id,
		});
		// condition reverted_by is null: if a parallel request managed to revert this entry first, this revert is cancelled entirely
		const marked = await tx.update(senaAudit).set({ reverted_by: newId, reverted_at: sql`now()` }).where(and(eq(senaAudit.id, id), isNull(senaAudit.reverted_by))).returning({ id: senaAudit.id });
		if (!marked.length) throw new ApiError(409, "already_reverted", `Запись №${id} уже откатили`);
		return { newId, conflicts: found };
	});
	publish([{ path: "/", type: "layout" }]);
	return { dry_run: false, applied: true, revert: id, audit_id: newId, forced: force && conflicts.length > 0, conflicts, restored: steps.length };
}
