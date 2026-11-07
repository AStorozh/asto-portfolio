import { asc, eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db, withDbRetry } from "@/lib/db";
import {
	aboutBlockTexts,
	aboutSections,
	aboutTexts,
	aiAssistantTexts,
	contactsTexts,
	homeTexts,
	pageHeroes,
	resumeTexts,
	siteNavigation,
	uiTexts,
	worksTexts,
} from "@/lib/schema";
import { translations } from "@/lib/translations";
import { ApiError, bad, text as checkText } from "./http";
import { auditReady, record, type Step } from "./audit-core";
import { audit, publish, type Target } from "./publish";

// Site texts. Stored the way the admin panel writes them: Russian text is the main record, translations into
// English and German are "shadow" records with the suffix `__en` / `__de` (key `hero_title__en`).
// The format and tables are the same here, so anything Sena writes is shown by the admin panel as usual.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type KvTable = PgTable & { key: AnyPgColumn; value: AnyPgColumn };
type Row = { key: string; value: string; source?: "db" | "default" };

const SHADOW_RE = /__(en|de)$/;
const KEY_RE = /^[A-Za-z0-9_.:\-]{1,150}$/;
const MAX_CHANGES = 100;

export type Change = { key: string; value: string | null; allowEmpty?: boolean };
export type ChangeResult = { key: string; old: string | null; new: string | null; changed: boolean; created: boolean; deleted: boolean };

interface Scope {
	name: string;
	about: string;
	maxLen: number;
	targets: Target[];
	read(): Promise<Row[]>;
	/** Supplement the edit with whatever it needs to work on the site (e.g. missing translations). Called before the checks. */
	expand?(changes: Change[], known: Map<string, string>): Change[];
	/** Validate the key and value before any write; known is what is currently in the database. */
	check(key: string, value: string | null, known: Map<string, string>): void | Promise<void>;
	/** Current values by key (not in the database - not in the map). */
	current(): Promise<Map<string, string>>;
	write(tx: Tx, key: string, value: string): Promise<void>;
	remove(tx: Tx, key: string): Promise<void>;
	/** Return the key to its previous state on rollback: old === null means there was no record before, so it is removed. No "is this allowed" checks here: the rollback has already been verified against the journal. */
	undo(tx: Tx, key: string, old: string | null): Promise<void>;
}

const baseOf = (key: string) => key.replace(SHADOW_RE, "");
const isShadow = (key: string) => SHADOW_RE.test(key);

// ─── Simple "key → value" tables ────────────────────────────────────────

function kvScope(name: string, about: string, table: KvTable, opts: { targets: Target[]; updateOnly?: boolean; maxLen?: number }): Scope {
	const rows = async () =>
		(await withDbRetry(() => db.select({ key: table.key, value: table.value }).from(table))) as unknown as { key: string; value: string }[];
	return {
		name,
		about,
		maxLen: opts.maxLen ?? 20_000,
		targets: opts.targets,
		read: async () => (await rows()).sort((a, b) => a.key.localeCompare(b.key)),
		current: async () => new Map((await rows()).map((r) => [r.key, r.value])),
		check(key, value, known) {
			if (!KEY_RE.test(key) || key.length > 100) bad(`Ключ «${key}» записан неверно`);
			const exists = known.has(key);
			const shadowOk = !opts.updateOnly && isShadow(key) && known.has(baseOf(key));
			if (!exists && !shadowOk) {
				bad(`Ключа «${key}» в разделе «${name}» нет. Править можно существующие ключи и их переводы (${baseOf(key)}__en, ${baseOf(key)}__de)`);
			}
			if (value === null && !(isShadow(key) && exists)) bad(`Удалять можно только существующий перевод (ключ с __en или __de): «${key}»`);
			if (value !== null && isShadow(key) && !value.trim()) {
				bad(`Пустой перевод «${key}» оставил бы страницу без текста; чтобы вернуть русский текст, передай value: null`);
			}
		},
		async write(tx, key, value) {
			await tx.insert(table).values({ key, value }).onConflictDoUpdate({ target: table.key, set: { value } });
		},
		async remove(tx, key) {
			await tx.delete(table).where(eq(table.key, key));
		},
		async undo(tx, key, old) {
			if (old === null) await tx.delete(table).where(eq(table.key, key));
			else await tx.insert(table).values({ key, value: old }).onConflictDoUpdate({ target: table.key, set: { value: old } });
		},
	};
}

// ─── UI texts: only edits are in the database, the rest comes from lib/translations.ts ─────────

function uiScope(): Scope {
	const defaults = translations.ru as Record<string, string>;
	const base = kvScope("ui", "", uiTexts as unknown as KvTable, { targets: [] });
	return {
		...base,
		name: "ui",
		about: "Подписи интерфейса сайта (кнопки, заголовки блоков, подсказки). В базе лежат только изменённые; остальные берутся из кода.",
		targets: [{ path: "/", type: "layout" }],
		async read() {
			const fromDb = new Map((await base.read()).map((r) => [r.key, r.value]));
			const out: Row[] = [];
			for (const key of Object.keys(defaults)) {
				for (const suffix of ["", "__en", "__de"]) {
					const lang = suffix ? suffix.slice(2) : "ru";
					const fallback = (translations as unknown as Record<string, Record<string, string>>)[lang][key] ?? "";
					const k = key + suffix;
					out.push(fromDb.has(k) ? { key: k, value: fromDb.get(k)!, source: "db" } : { key: k, value: fallback, source: "default" });
				}
			}
			for (const [k, v] of fromDb) if (!(baseOf(k) in defaults)) out.push({ key: k, value: v, source: "db" });
			return out.sort((a, b) => a.key.localeCompare(b.key));
		},
		// The site takes a label's translation only together with the main record in the database, and shows a main record without a translation in Russian in all languages.
		// So an edit to any of the three records (ru, __en, __de) creates the missing ones from the built-in texts: otherwise the English version of the site would start speaking Russian.
		expand(changes, known) {
			const out = [...changes];
			const have = new Set(changes.map((c) => c.key));
			for (const c of changes) {
				if (c.value === null) continue;
				for (const suffix of ["", "__en", "__de"]) {
					const k = baseOf(c.key) + suffix;
					if (have.has(k) || known.has(k)) continue;
					const builtin = (translations as unknown as Record<string, Record<string, string>>)[suffix ? suffix.slice(2) : "ru"][baseOf(c.key)];
					if (typeof builtin === "string") {
						out.push({ key: k, value: builtin });
						have.add(k);
					}
				}
			}
			return out;
		},
		check(key, value, known) {
			if (!KEY_RE.test(key) || key.length > 150) bad(`Ключ «${key}» записан неверно`);
			const all = new Set([...known.keys(), ...Object.keys(defaults)]);
			if (!all.has(baseOf(key))) bad(`Ключа «${baseOf(key)}» среди подписей интерфейса нет`);
			if (value === null) bad(`Подпись интерфейса «${key}» не удаляют: впиши нужный текст (вернуть как было можно откатом записи журнала)`);
			if (!value.trim()) bad(`Пустая подпись «${key}» оставила бы кнопку без текста`);
		},
	};
}

// ─── Page headers: key `page.field`, fields label / title / subtitle ──────────────────────

const HERO_FIELDS = ["label", "title", "subtitle"] as const;
type HeroField = (typeof HERO_FIELDS)[number];

function heroScope(): Scope {
	const rows = () => withDbRetry(() => db.select().from(pageHeroes));
	const parse = (key: string): { page: string; field: HeroField } => {
		const dot = key.lastIndexOf(".");
		const page = key.slice(0, dot);
		const field = key.slice(dot + 1) as HeroField;
		if (dot < 1 || !HERO_FIELDS.includes(field)) bad(`Ключ шапки должен быть вида «страница.поле», поле — одно из ${HERO_FIELDS.join(", ")}: «${key}»`);
		return { page, field };
	};
	return {
		name: "heroes",
		about: "Шапки страниц (метка, заголовок, подзаголовок). Ключ вида about.title; перевод — about__en.title.",
		maxLen: 2000,
		targets: [{ path: "/", type: "layout" }],
		async read() {
			const out: Row[] = [];
			for (const r of await rows()) {
				out.push({ key: `${r.page}.label`, value: r.label }, { key: `${r.page}.title`, value: r.title }, { key: `${r.page}.subtitle`, value: r.subtitle ?? "" });
			}
			return out.sort((a, b) => a.key.localeCompare(b.key));
		},
		async current() {
			return new Map((await this.read()).map((r) => [r.key, r.value]));
		},
		// A header translation is stored as one row of three fields: editing one field of a new translation also creates the other two (as copies of the Russian ones),
		// so that the journal, rollback and conflict checks see the whole row at once.
		expand(changes, known) {
			const out = [...changes];
			const have = new Set(changes.map((c) => c.key));
			for (const c of changes) {
				if (c.value === null || !c.key.includes(".")) continue;
				const page = c.key.slice(0, c.key.lastIndexOf("."));
				if (!isShadow(page) || [...known.keys()].some((k) => k.startsWith(page + "."))) continue;
				for (const f of HERO_FIELDS) {
					const k = `${page}.${f}`;
					const base = known.get(`${baseOf(page)}.${f}`);
					if (!have.has(k) && base !== undefined) {
						out.push({ key: k, value: base });
						have.add(k);
					}
				}
			}
			return out;
		},
		check(key, value, known) {
			const { page, field } = parse(key);
			if (page.length > 50) bad(`Название страницы «${page}» длиннее 50 знаков`);
			if (value === null) bad("Шапку страницы удалять нельзя");
			const pages = new Set([...known.keys()].map((k) => k.slice(0, k.lastIndexOf("."))));
			if (!pages.has(page) && !(isShadow(page) && pages.has(baseOf(page)))) bad(`Страницы «${page}» среди шапок нет`);
			if (field === "title" && !value.trim()) bad("Заголовок шапки не должен быть пустым");
		},
		async write(tx, key, value) {
			const { page, field } = parse(key);
			const [existing] = await tx.select().from(pageHeroes).where(eq(pageHeroes.page, page));
			const nextValue = field === "subtitle" ? value || null : value;
			if (existing) {
				await tx.update(pageHeroes).set({ [field]: nextValue }).where(eq(pageHeroes.page, page));
				return;
			}
			// The header has no translation yet: create it as a copy of the Russian one, otherwise unfilled fields in this language would be empty
			const [ru] = await tx.select().from(pageHeroes).where(eq(pageHeroes.page, baseOf(page)));
			await tx.insert(pageHeroes).values({
				page,
				label: field === "label" ? value : (ru?.label ?? ""),
				title: field === "title" ? value : (ru?.title ?? ""),
				subtitle: field === "subtitle" ? nextValue : (ru?.subtitle ?? null),
			});
		},
		async remove() {
			bad("Шапку страницы удалять нельзя");
		},
		async undo(tx, key, old) {
			const { page } = parse(key);
			if (old === null) {
				// there was no header translation before - remove its whole record; the Russian header is never deleted
				if (!isShadow(page)) bad("Основную шапку страницы не удаляют");
				await tx.delete(pageHeroes).where(eq(pageHeroes.page, page));
				return;
			}
			await this.write(tx, key, old);
		},
	};
}

// ─── Menu item names ────────────────────────────────────────────────────────────────────

function navScope(): Scope {
	const rows = () => withDbRetry(() => db.select().from(siteNavigation).orderBy(asc(siteNavigation.sort_order)));
	return {
		name: "nav",
		about: "Названия пунктов меню сайта. Перевод — ключ с __en / __de.",
		maxLen: 100,
		targets: [{ path: "/", type: "layout" }],
		read: async () => (await rows()).map((r) => ({ key: r.key, value: r.label })),
		current: async () => new Map((await rows()).map((r) => [r.key, r.label])),
		check(key, value, known) {
			if (!KEY_RE.test(key) || key.length > 50) bad(`Ключ «${key}» записан неверно`);
			if (!known.has(key) && !(isShadow(key) && known.has(baseOf(key)))) bad(`Пункта меню «${baseOf(key)}» нет`);
			if (value === null && !(isShadow(key) && known.has(key))) bad(`Удалять можно только существующий перевод: «${key}»`);
			if (value !== null && !value.trim()) bad("Название пункта меню не должно быть пустым");
		},
		async write(tx, key, value) {
			await tx.insert(siteNavigation).values({ key, label: value }).onConflictDoUpdate({ target: siteNavigation.key, set: { label: value } });
		},
		async remove(tx, key) {
			await tx.delete(siteNavigation).where(eq(siteNavigation.key, key));
		},
		async undo(tx, key, old) {
			if (old === null) await tx.delete(siteNavigation).where(eq(siteNavigation.key, key));
			else await tx.insert(siteNavigation).values({ key, label: old }).onConflictDoUpdate({ target: siteNavigation.key, set: { label: old } });
		},
	};
}

// ─── "About me" section texts: key is the section slug, translation is slug__en / slug__de ────────────

function aboutBlocksScope(): Scope {
	const rows = () => withDbRetry(() => db.select().from(aboutBlockTexts));
	const sectionSlugs = async () =>
		(await withDbRetry(() => db.select({ slug: aboutSections.slug }).from(aboutSections))).map((s) => s.slug).filter((s) => !isShadow(s));
	return {
		name: "about_blocks",
		about: "Тексты разделов страницы «Обо мне» (разметка: ## заголовок, > выноска, - список). Ключ — раздел, например who; перевод — who__en, who__de.",
		maxLen: 60_000,
		targets: [{ path: "/about", type: "layout" }],
		async read() {
			const have = new Map((await rows()).map((r) => [r.slug, r.content]));
			const out: Row[] = [];
			for (const slug of new Set([...(await sectionSlugs()), ...[...have.keys()].filter((k) => !isShadow(k))])) {
				for (const suffix of ["", "__en", "__de"]) out.push({ key: slug + suffix, value: have.get(slug + suffix) ?? "" });
			}
			return out.sort((a, b) => a.key.localeCompare(b.key));
		},
		async current() {
			return new Map((await rows()).map((r) => [r.slug, r.content]));
		},
		async check(key, value, known) {
			if (!/^[a-z0-9_\-]+(__(en|de))?$/.test(key) || key.length > 50) bad(`Ключ раздела «${key}» записан неверно`);
			if (value === null) bad("Текст раздела не удаляют: пустой перевод уже показывает русский текст");
			const base = baseOf(key);
			if (!known.has(base) && !(await sectionSlugs()).includes(base)) bad(`Раздела «${base}» на странице «Обо мне» нет`);
		},
		async write(tx, key, value) {
			await tx.insert(aboutBlockTexts).values({ slug: key, content: value }).onConflictDoUpdate({ target: aboutBlockTexts.slug, set: { content: value } });
		},
		async remove() {
			bad("Текст раздела не удаляют: пустой перевод уже показывает русский текст");
		},
		async undo(tx, key, old) {
			if (old === null) await tx.delete(aboutBlockTexts).where(eq(aboutBlockTexts.slug, key));
			else await tx.insert(aboutBlockTexts).values({ slug: key, content: old }).onConflictDoUpdate({ target: aboutBlockTexts.slug, set: { content: old } });
		},
	};
}

// ─── Registry ────────────────────────────────────────────────────────────────────────────────────

const RESUME_PAGES: Target[] = ["/resume-file", "/resume-file/embed", "/resume-file/print"];

export const SCOPES: Record<string, Scope> = Object.fromEntries(
	[
		kvScope("home", "Тексты главной страницы (заголовок, подзаголовок, бейджи — по одному в строке).", homeTexts as unknown as KvTable, { targets: ["/"] }),
		kvScope("about", "Общие тексты страницы «Обо мне».", aboutTexts as unknown as KvTable, { targets: [{ path: "/about", type: "layout" }] }),
		kvScope("works", "Общие тексты страницы «Работы».", worksTexts as unknown as KvTable, { targets: [{ path: "/works", type: "layout" }] }),
		kvScope("contacts", "Общие тексты страницы «Контакты».", contactsTexts as unknown as KvTable, { targets: ["/contacts"] }),
		kvScope("resume", "Тексты резюме (заголовки, контакты, строки шапки).", resumeTexts as unknown as KvTable, { targets: RESUME_PAGES }),
		kvScope("ai_assistant", "Тексты страницы AI-ассистента (приветствие, подсказки). Только существующие ключи.", aiAssistantTexts as unknown as KvTable, {
			targets: ["/ai-assistant"],
			updateOnly: true,
		}),
		uiScope(),
		heroScope(),
		navScope(),
		aboutBlocksScope(),
	].map((s) => [s.name, s]),
);

export function scopeOf(name: string): Scope {
	const scope = Object.hasOwn(SCOPES, name) ? SCOPES[name] : undefined;
	if (!scope) throw new ApiError(404, "unknown_scope", `Раздела текстов «${name}» нет`, { scopes: Object.keys(SCOPES) });
	return scope;
}

// ─── Reading ────────────────────────────────────────────────────────────────────────────────────

export async function listScopes() {
	return Promise.all(
		Object.values(SCOPES).map(async (s) => ({ scope: s.name, about: s.about, keys: (await s.read()).length })),
	);
}

export async function readScope(name: string, opts: { prefix?: string; search?: string; limit?: number }) {
	const scope = scopeOf(name);
	let items = await scope.read();
	if (opts.prefix) items = items.filter((r) => r.key.startsWith(opts.prefix!));
	if (opts.search) {
		const q = opts.search.toLowerCase();
		items = items.filter((r) => r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q));
	}
	const limit = Math.min(Math.max(Number.isFinite(opts.limit) ? (opts.limit as number) : 300, 1), 1000);
	return { scope: scope.name, about: scope.about, total: items.length, truncated: items.length > limit, items: items.slice(0, limit) };
}

// ─── Writing ────────────────────────────────────────────────────────────────────────────────────

export function parseChanges(body: Record<string, unknown>): Change[] {
	const raw = body.changes;
	if (!Array.isArray(raw) || raw.length === 0) bad("Нужен непустой список changes: [{key, value}]");
	if (raw.length > MAX_CHANGES) bad(`За раз можно менять не больше ${MAX_CHANGES} ключей`);
	const seen = new Set<string>();
	return raw.map((c, i) => {
		if (!c || typeof c !== "object") bad(`changes[${i}] должен быть объектом {key, value}`);
		const { key, value, allow_empty } = c as Record<string, unknown>;
		if (typeof key !== "string" || !key) bad(`changes[${i}].key должен быть строкой`);
		if (allow_empty !== undefined && typeof allow_empty !== "boolean") bad(`changes[${i}].allow_empty должен быть true или false`);
		if (seen.has(key)) bad(`Ключ «${key}» указан дважды`);
		seen.add(key);
		if (value !== null && typeof value !== "string") bad(`changes[${i}].value должен быть строкой или null`);
		return { key, value: value as string | null, allowEmpty: allow_empty === true };
	});
}

/** Apply edits to a section. dryRun - only show what would change. All or nothing: one transaction. */
export async function applyChanges(name: string, asked: Change[], dryRun: boolean) {
	const scope = scopeOf(name);
	const known = await scope.current();
	const changes = scope.expand ? scope.expand(asked, known) : asked;

	const results: ChangeResult[] = [];
	for (const c of changes) {
		await scope.check(c.key, c.value, known);
		if (c.value !== null) checkText(c.value, c.key, { max: scope.maxLen, allowEmpty: true });
		// An empty main text would leave a hole on the page; to erase the text deliberately, the edit needs allow_empty: true
		if (c.value !== null && !c.value.trim() && !isShadow(c.key) && !c.allowEmpty && (known.get(c.key) ?? "").trim()) {
			bad(`Ключ «${c.key}» стал бы пустым и на странице осталась бы дыра. Если так и нужно, добавь к правке allow_empty: true`);
		}
		const old = known.get(c.key) ?? null;
		results.push({
			key: c.key,
			old,
			new: c.value,
			changed: c.value !== old,
			created: old === null && c.value !== null,
			deleted: c.value === null && old !== null,
		});
	}

	const todo = results.filter((r) => r.changed);
	let auditId: number | null = null;
	if (!dryRun && todo.length) {
		await auditReady();
		const undo: Step[] = todo.map((r) => ({ t: "text", scope: name, key: r.key, old: r.old, expect: r.new }));
		auditId = await db.transaction(async (tx) => {
			for (const r of todo) {
				if (r.new === null) await scope.remove(tx, r.key);
				else await scope.write(tx, r.key, r.new);
			}
			return record(tx, {
				action: "texts.put",
				target: `texts/${name}`,
				summary: `Тексты «${name}»: ${todo.map((r) => r.key).slice(0, 6).join(", ")}${todo.length > 6 ? ` и ещё ${todo.length - 6}` : ""}`,
				changes: todo.map((r) => ({ key: r.key, old: r.old, new: r.new })),
				undo,
			});
		});
		publish(scope.targets);
		audit("texts", { id: auditId, scope: name, keys: todo.map((r) => [r.key, r.old?.length ?? 0, r.new?.length ?? 0]) });
	}
	return { scope: name, dry_run: dryRun, applied: !dryRun && todo.length > 0, changed: todo.length, audit_id: auditId, results };
}
