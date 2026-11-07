import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { senaAudit } from "@/lib/schema";
import { ApiError, bad, errorReason } from "./http";

// Sena's action log. One rule: no edit exists without a log entry. The entry is written in the same transaction as the
// edit itself, so if the log is unavailable, the edit is not performed at all. Reads, dry runs and rejections are short rows;
// an error there does not block the work (after 30 days they are erased on their own).

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type RowTable = "work_items" | "contact_methods" | "resume_sections" | "quotes" | "ai_capabilities" | "analytics_links";

/** Undo step. old - what was there before the edit, expect - what the edit wrote (if it differs now, someone changed it afterwards: a conflict). */
export type Step =
	| { t: "text"; scope: string; key: string; old: string | null; expect: string | null }
	| { t: "ai"; key: string; old: string | null; expect: string | null }
	| { t: "row"; table: RowTable; key: string; set: Record<string, unknown>; expect: Record<string, unknown> } // restore the row's fields
	| { t: "row_insert"; table: RowTable; row: Record<string, unknown> } // recreate (undoes a delete)
	| { t: "row_delete"; table: RowTable; key: string; expect: Record<string, unknown> | null } // remove (undoes a create)
	| { t: "work_lists"; slug: string; lists: Record<string, unknown>; expect: Record<string, unknown> }; // the work's lists as a whole

export type Entry = { action: string; target: string; summary: string; changes: unknown; undo: Step[] | null; revertsId?: number | null };

// ─── One writing request at a time ────────────────────────────────────────────────────────────────────
// The site runs as a single process (PM2), so Sena's edits are queued: the "before" value is read and written with no other request in between,
// and two simultaneous reverts of one entry can't both pass. (This does not protect against an admin edit in the same second; revert checks the DB itself.)
let tail: Promise<unknown> = Promise.resolve();
export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
	const run = tail.then(fn, fn);
	tail = run.catch(() => undefined);
	return run;
}

// ─── Where the request came from ──────────────────────────────────────────────────────────────────

type Ctx = { ip: string; method: string; path: string; logged: boolean };
const store = new AsyncLocalStorage<Ctx>();

export const runWithContext = <T>(c: Omit<Ctx, "logged">, fn: () => Promise<T>) => store.run({ ...c, logged: false }, fn);
export const currentContext = () => store.getStore();

// ─── Table ───────────────────────────────────────────────────────────────────────────────────────────

// The table is defined in lib/schema.ts (npm run db:push creates it too). This statement creates the same table itself if it is missing,
// so deploying the site does not depend on someone remembering db:push. The columns match the schema definition one to one.
let ready: Promise<void> | null = null;

export function auditReady(): Promise<void> {
	ready ??= (async () => {
		await db.execute(sql`
			create table if not exists future_face.sena_audit (
				id serial primary key,
				created_at timestamp not null default now(),
				kind varchar(16) not null,
				action varchar(64) not null,
				target text not null default '',
				method varchar(8) not null default '',
				path text not null default '',
				status integer not null default 200,
				ip varchar(64),
				summary text not null default '',
				changes text,
				undo text,
				reverts_id integer,
				reverted_by integer,
				reverted_at timestamp
			)
		`);
	})();
	return ready.catch((e) => {
		ready = null; // the next request will try again
		console.error("[sena-api] журнал недоступен:", errorReason(e));
		throw new ApiError(503, "audit_unavailable", "Журнал действий недоступен, поэтому правки сейчас не выполняются. Проверь базу или запусти npm run db:push");
	});
}

/** Forget that the table exists: if it was dropped, the next edit will recreate it. */
function forgetReady() {
	ready = null;
}

// ─── Writing ────────────────────────────────────────────────────────────────────────────────────────

/** Write an edit to the log inside its transaction. Returns the entry number. */
export async function record(tx: Tx, e: Entry): Promise<number> {
	const c = currentContext();
	try {
		const [row] = await tx
			.insert(senaAudit)
			.values({
				kind: "write",
				action: e.action,
				target: e.target.slice(0, 500),
				method: c?.method ?? "",
				path: (c?.path ?? "").slice(0, 1000),
				status: 200,
				ip: c?.ip ? c.ip.slice(0, 64) : null,
				summary: e.summary.slice(0, 1000),
				changes: JSON.stringify(e.changes ?? null),
				undo: e.undo ? JSON.stringify(e.undo) : null,
				reverts_id: e.revertsId ?? null,
			})
			.returning({ id: senaAudit.id });
		if (c) c.logged = true;
		return row.id;
	} catch (err) {
		forgetReady();
		console.error("[sena-api] запись в журнал не удалась, правка отменена:", errorReason(err));
		throw new ApiError(503, "audit_unavailable", "Не удалось записать правку в журнал, поэтому она отменена. Повтори; если не проходит, проверь базу");
	}
}

/** Short entry for a read, dry run or rejection. An error here must not break the response. */
export async function recordLight(kind: "read" | "preview" | "rejected", f: { action: string; target: string; status: number; summary?: string }): Promise<void> {
	const c = currentContext();
	try {
		await auditReady();
		await db.insert(senaAudit).values({
			kind,
			action: f.action.slice(0, 64),
			target: f.target.slice(0, 500),
			method: c?.method ?? "",
			path: (c?.path ?? "").slice(0, 1000),
			status: f.status,
			ip: c?.ip ? c.ip.slice(0, 64) : null,
			summary: (f.summary ?? "").slice(0, 1000),
		});
	} catch (e) {
		console.error("[sena-api] запись в журнал не удалась:", errorReason(e));
	}
}

let lastPrune = 0;
/** Reads and dry runs older than 30 days are erased (every six hours). Edits and rejections are never erased. */
export async function pruneOld(): Promise<void> {
	if (Date.now() - lastPrune < 6 * 3600_000) return;
	lastPrune = Date.now();
	try {
		await db.execute(sql`delete from future_face.sena_audit where kind in ('read', 'preview') and created_at < now() - interval '30 days'`);
	} catch {
		/* not critical: we'll erase them next time */
	}
}

// ─── Viewing ────────────────────────────────────────────────────────────────────────────────────────

const KINDS = ["write", "preview", "rejected", "read"] as const;

type AuditRow = {
	id: number;
	created_at: string | Date;
	kind: string;
	action: string;
	target: string;
	method: string;
	path: string;
	status: number;
	ip: string | null;
	summary: string;
	changes: string | null;
	undo: string | null;
	reverts_id: number | null;
	reverted_by: number | null;
	reverted_at: string | Date | null;
	created_iso: string;
	reverted_iso: string | null;
};

const parse = (s: string | null): unknown => {
	if (s === null) return null;
	try {
		return JSON.parse(s);
	} catch {
		return null;
	}
};

// Time columns store the DB server's local time (now() by default). The driver and JS read such time differently and shift it by the time zone,
// so the DB itself converts it to ISO with UTC time (AT TIME ZONE), the same way in the list and in a single entry.
const ISO = (col: string) => sql.raw(`to_char(${col} at time zone current_setting('TimeZone') at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`);
const SELECT_ISO = sql`select *, ${ISO("created_at")} as created_iso, ${ISO("reverted_at")} as reverted_iso from future_face.sena_audit`;
const iso = (v: string | null): string | null => v;

function shape(r: AuditRow, full: boolean) {
	const out: Record<string, unknown> = {
		id: Number(r.id),
		at: iso(r.created_iso),
		kind: r.kind,
		action: r.action,
		target: r.target,
		method: r.method,
		path: r.path,
		status: Number(r.status),
		ip: r.ip,
		summary: r.summary,
		reverts: r.reverts_id,
		reverted_by: r.reverted_by,
		reverted_at: iso(r.reverted_iso),
		can_revert: r.kind === "write" && r.undo !== null && r.reverted_by === null,
	};
	if (full) {
		out.changes = parse(r.changes);
		out.undo = parse(r.undo);
	}
	return out;
}

export async function listAudit(url: URL) {
	const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50) || 50, 1), 200);
	const kinds = (url.searchParams.get("kind") ?? "write").split(",").map((k) => k.trim()).filter(Boolean);
	if (!kinds.length || kinds.some((k) => !(KINDS as readonly string[]).includes(k))) bad(`kind — одно или несколько из ${KINDS.join(", ")}`);
	const conds = [sql`kind in (${sql.join(kinds.map((k) => sql`${k}`), sql`, `)})`];
	const since = url.searchParams.get("since");
	if (since) {
		const d = new Date(since);
		if (Number.isNaN(d.getTime())) bad("since — дата, например 2026-10-19 или 2026-10-19T12:00:00Z");
		conds.push(sql`created_at >= ${d.toISOString()}::timestamptz`);
	}
	const target = url.searchParams.get("target");
	if (target) conds.push(sql`target ilike ${"%" + target.replace(/[%_\\]/g, "\\$&").slice(0, 100) + "%"}`);
	const action = url.searchParams.get("action");
	if (action) conds.push(sql`action = ${action.slice(0, 64)}`);
	const full = url.searchParams.get("full") === "1";
	await auditReady();
	const rows = (await db.execute(sql`${SELECT_ISO} where ${sql.join(conds, sql` and `)} order by id desc limit ${limit}`)) as unknown as AuditRow[];
	return { total_shown: rows.length, entries: rows.map((r) => shape(r, full)) };
}

export async function getAudit(id: number) {
	await auditReady();
	const rows = (await db.execute(sql`${SELECT_ISO} where id = ${id}`)) as unknown as AuditRow[];
	if (!rows.length) throw new ApiError(404, "not_found", `Записи журнала №${id} нет`);
	return rows[0];
}

export async function auditEntry(id: number) {
	return shape(await getAudit(id), true);
}
