import { asc, eq } from "drizzle-orm";
import { db, withDbRetry } from "@/lib/db";
import {
	aiCapabilities,
	contactMethods,
	quotes,
	resumeSections,
	workHowDone,
	workImages,
	workItems,
	workLinks,
	workResults,
	workTags,
	workWhatIDid,
} from "@/lib/schema";
import { auditReady, record, type Step } from "./audit-core";
import { ApiError, bad, flag, lines, onlyKnown, safeHref, text } from "./http";
import { audit, publish, type Target } from "./publish";
import { GROUPS, pick, readLists, writeLists, type Lists } from "./work-lists";

// Records with several fields: works, contact methods, resume blocks, quotes, AI assistant capabilities.
// Only the fields the admin edits can be changed. Works cannot be created or deleted from here (they have images and files) -
// that stays in the admin. Each change is written to the journal (audit-core) in the same transaction and can be rolled back.

export type FieldChange = { field: string; old: unknown; new: unknown };
type Fields = Record<string, unknown>;

/** Compare "before" and "after" only on the fields that came in the request. */
function diff(before: Fields, patch: Fields): FieldChange[] {
	return Object.keys(patch)
		.filter((f) => JSON.stringify(before[f] ?? null) !== JSON.stringify(patch[f] ?? null))
		.map((f) => ({ field: f, old: before[f] ?? null, new: patch[f] ?? null }));
}

/** Field values from the "before" record: needed so a rollback can restore them. */
const olds = (before: Fields, keys: string[]): Fields => Object.fromEntries(keys.map((k) => [k, before[k] ?? null]));

/** Optional translation: a string (may be empty - then the site shows the Russian text) or null. */
function translation(value: unknown, name: string, max: number): string | null {
	if (value === null) return null;
	const v = text(value, name, { max, allowEmpty: true });
	return v.trim() ? v : null;
}

const fields = (changes: FieldChange[]) => changes.map((c) => c.field).join(", ");

const WORKS: Target[] = [{ path: "/works", type: "layout" }];

// ─── Works ─────────────────────────────────────────────────────────────────────────────────────────

async function loadWorks(slug?: string) {
	const all = await withDbRetry(async () => {
		const items = await db.select().from(workItems).orderBy(asc(workItems.sort_order));
		const [tags, did, how, results, links, images] = await Promise.all([
			db.select().from(workTags).orderBy(asc(workTags.sort_order)),
			db.select().from(workWhatIDid).orderBy(asc(workWhatIDid.sort_order)),
			db.select().from(workHowDone).orderBy(asc(workHowDone.sort_order)),
			db.select().from(workResults).orderBy(asc(workResults.sort_order)),
			db.select().from(workLinks).orderBy(asc(workLinks.sort_order)),
			db.select().from(workImages).orderBy(asc(workImages.sort_order)),
		]);
		return { items, tags, did, how, results, links, images };
	});
	const by = <T extends { work_id: number }>(rows: T[], id: number) => rows.filter((r) => r.work_id === id);
	return all.items
		.filter((w) => !slug || w.slug === slug)
		.map((w) => ({
			id: w.id,
			slug: w.slug,
			title: w.title,
			title_en: w.title_en,
			title_de: w.title_de,
			category: w.category,
			description: w.description,
			description_en: w.description_en,
			description_de: w.description_de,
			overview: w.overview,
			overview_en: w.overview_en,
			overview_de: w.overview_de,
			featured: w.featured,
			sort_order: w.sort_order,
			tags: by(all.tags, w.id).map((t) => t.tag),
			tags_en: by(all.tags, w.id).map((t) => t.tag_en),
			tags_de: by(all.tags, w.id).map((t) => t.tag_de),
			what_i_did: by(all.did, w.id).map((r) => r.text),
			how_done: by(all.how, w.id).map((r) => r.text),
			results: by(all.results, w.id).map((r) => r.text),
			results_en: by(all.results, w.id).map((r) => r.text_en),
			results_de: by(all.results, w.id).map((r) => r.text_de),
			links: by(all.links, w.id).map((l) => ({ url: l.url, label: l.label })),
			images: by(all.images, w.id).map((i) => i.url),
		}));
}

export const listWorks = () => loadWorks();

export async function getWork(slug: string) {
	const [work] = await loadWorks(slug);
	if (!work) throw new ApiError(404, "not_found", `Работы «${slug}» нет`);
	return work;
}

const WORK_TEXT_FIELDS = { title: 200, description: 5_000, overview: 30_000 } as const;
const WORK_FIELDS = [
	"title", "title_en", "title_de", "description", "description_en", "description_de", "overview", "overview_en", "overview_de",
	"featured", "tags", "tags_en", "tags_de", "what_i_did", "how_done", "results", "results_en", "results_de", "dry_run",
] as const;

/**
 * Translation lists go consecutively from the start, empty ones only at the end. The admin stores translations as one comma-separated string (tags) or one per line,
 * empty slots collapse on save, so a translation "in the middle" would shift onto someone else's item after the next save in the admin.
 */
function tailOnly(list: (string | null)[], name: string): (string | null)[] {
	let gap = false;
	for (const v of list) {
		if (v === null) gap = true;
		else if (gap) bad(`В «${name}» пустые переводы должны идти только в конце списка: иначе админка при сохранении сдвинет переводы на чужие пункты. Передай переводы для всех пунктов подряд или пустой список`);
	}
	return list;
}

/** Parallel list of translations: the same length as the Russian list. */
function parallel(value: unknown, name: string, size: number, maxLen: number): (string | null)[] {
	if (!Array.isArray(value) || value.length !== size) bad(`Поле «${name}» должно быть списком из ${size} элементов (по числу русских пунктов)`);
	return tailOnly(value.map((v, i) => translation(v, `${name}[${i}]`, maxLen)), name);
}

/** Characters the admin splits lists on (tags - comma, the rest - line): they cannot appear in an item. */
function noSplit(list: string[], name: string, re: RegExp, what: string): string[] {
	const badItem = list.find((v) => re.test(v));
	if (badItem !== undefined) bad(`В «${name}» пункт «${badItem.slice(0, 40)}» содержит ${what}: админка разрежет его на два. Раздели на отдельные пункты`);
	return list;
}

export async function patchWork(slug: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, WORK_FIELDS);
	const before = await getWork(slug);
	const set: Fields = {};
	for (const f of ["title", "description", "overview"] as const) {
		if (f in body) set[f] = text(body[f], f, { max: WORK_TEXT_FIELDS[f] });
		for (const lang of ["en", "de"] as const) {
			const k = `${f}_${lang}`;
			if (k in body) set[k] = translation(body[k], k, WORK_TEXT_FIELDS[f]);
		}
	}
	if ("featured" in body) set.featured = flag(body.featured, "featured");

	const lists: Fields = {};
	if ("tags" in body) lists.tags = noSplit(lines(body.tags, "tags", { maxItems: 30, maxLen: 60 }), "tags", /,/, "запятую");
	if ("what_i_did" in body) lists.what_i_did = noSplit(lines(body.what_i_did, "what_i_did", { maxItems: 30, maxLen: 1_000 }), "what_i_did", /[\r\n]/, "перевод строки");
	if ("how_done" in body) lists.how_done = noSplit(lines(body.how_done, "how_done", { maxItems: 30, maxLen: 1_000 }), "how_done", /[\r\n]/, "перевод строки");
	if ("results" in body) lists.results = noSplit(lines(body.results, "results", { maxItems: 30, maxLen: 1_000 }), "results", /[\r\n]/, "перевод строки");
	for (const [name, base, max] of [["tags", "tags", 60], ["results", "results", 1_000]] as const) {
		for (const lang of ["en", "de"] as const) {
			const k = `${name}_${lang}`;
			if (!(k in body)) continue;
			if (!(base in lists)) bad(`Переводы «${k}» передаются вместе с русским списком «${base}»`);
			lists[k] = parallel(body[k], k, (lists[base] as string[]).length, max);
		}
	}

	// The final lists (preserving translations of unchanged items) are computed before writing: this way a bad result is rejected as a whole
	const oldTags = new Map(before.tags.map((t, i) => [t, [before.tags_en[i], before.tags_de[i]] as const]));
	const oldResults = new Map(before.results.map((t, i) => [t, [before.results_en[i], before.results_de[i]] as const]));
	const next: Partial<Lists> = {};
	if ("tags" in lists) {
		const ru = lists.tags as string[];
		next.tags = ru;
		next.tags_en = tailOnly("tags_en" in lists ? (lists.tags_en as (string | null)[]) : ru.map((t) => oldTags.get(t)?.[0] ?? null), "tags_en (переводы тегов разошлись после правки: передай tags_en и tags_de полностью)");
		next.tags_de = tailOnly("tags_de" in lists ? (lists.tags_de as (string | null)[]) : ru.map((t) => oldTags.get(t)?.[1] ?? null), "tags_de (переводы тегов разошлись после правки: передай tags_en и tags_de полностью)");
	}
	if ("what_i_did" in lists) next.what_i_did = lists.what_i_did as string[];
	if ("how_done" in lists) next.how_done = lists.how_done as string[];
	if ("results" in lists) {
		const ru = lists.results as string[];
		next.results = ru;
		next.results_en = tailOnly("results_en" in lists ? (lists.results_en as (string | null)[]) : ru.map((t) => oldResults.get(t)?.[0] ?? null), "results_en (переводы результатов разошлись после правки: передай results_en и results_de полностью)");
		next.results_de = tailOnly("results_de" in lists ? (lists.results_de as (string | null)[]) : ru.map((t) => oldResults.get(t)?.[1] ?? null), "results_de (переводы результатов разошлись после правки: передай results_en и results_de полностью)");
	}
	// "before → after" also includes implicit changes (translations that had to be adjusted to the new list)
	const changes = diff(before as unknown as Fields, { ...set, ...(next as Fields) });
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		const groups = Object.keys(GROUPS).filter((g) => GROUPS[g].some((f) => f in next));
		auditId = await db.transaction(async (tx) => {
			if (Object.keys(set).length) await tx.update(workItems).set(set).where(eq(workItems.id, before.id));
			await writeLists(tx, before.id, next);
			const undo: Step[] = [];
			if (Object.keys(set).length) undo.push({ t: "row", table: "work_items", key: slug, set: olds(before as unknown as Fields, Object.keys(set)), expect: set });
			if (groups.length) {
				const after = await readLists(tx, before.id);
				undo.push({ t: "work_lists", slug, lists: pick(before as unknown as Lists, groups) as Fields, expect: pick(after, groups) as Fields });
			}
			return record(tx, { action: "work.patch", target: `works/${slug}`, summary: `Работа «${slug}»: ${fields(changes)}`, changes, undo });
		});
		publish(WORKS);
		audit("work", { id: auditId, slug, fields: changes.map((c) => c.field) });
	}
	return { slug, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}

// ─── Contact methods ───────────────────────────────────────────────────────────────────────────────

export const listContactMethods = () => withDbRetry(() => db.select().from(contactMethods).orderBy(asc(contactMethods.sort_order)));

export async function patchContactMethod(slug: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, ["platform", "title", "title_en", "title_de", "href", "dry_run"]);
	const [before] = await db.select().from(contactMethods).where(eq(contactMethods.slug, slug));
	if (!before) throw new ApiError(404, "not_found", `Способа связи «${slug}» нет`);
	const set: Fields = {};
	if ("platform" in body) set.platform = text(body.platform, "platform", { max: 60 });
	if ("title" in body) set.title = text(body.title, "title", { max: 200 });
	if ("title_en" in body) set.title_en = translation(body.title_en, "title_en", 200);
	if ("title_de" in body) set.title_de = translation(body.title_de, "title_de", 200);
	if ("href" in body) set.href = safeHref(body.href, "href");
	const changes = diff(before as unknown as Fields, set);
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.update(contactMethods).set(set).where(eq(contactMethods.id, before.id));
			const undo: Step[] = [{ t: "row", table: "contact_methods", key: slug, set: olds(before as unknown as Fields, Object.keys(set)), expect: set }];
			return record(tx, { action: "contact.patch", target: `contacts/methods/${slug}`, summary: `Контакт «${slug}»: ${fields(changes)}`, changes, undo });
		});
		publish(["/contacts"]);
		audit("contact", { id: auditId, slug, fields: changes.map((c) => c.field) });
	}
	return { slug, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}

// ─── Resume blocks ─────────────────────────────────────────────────────────────────────────────────

const RESUME: Target[] = ["/resume-file", "/resume-file/embed", "/resume-file/print"];
export const listResumeSections = () => withDbRetry(() => db.select().from(resumeSections).orderBy(asc(resumeSections.sort_order)));

const RESUME_FIELDS = ["title", "title_en", "title_de", "body", "body_en", "body_de"] as const;

function resumeFields(body: Fields): Fields {
	const set: Fields = {};
	for (const f of ["title", "body"] as const) {
		const max = f === "title" ? 200 : 20_000;
		if (f in body) set[f] = text(body[f], f, { max, allowEmpty: true });
		for (const lang of ["en", "de"] as const) {
			if (`${f}_${lang}` in body) set[`${f}_${lang}`] = translation(body[`${f}_${lang}`], `${f}_${lang}`, max);
		}
	}
	return set;
}

export async function patchResumeSection(slug: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, [...RESUME_FIELDS, "dry_run"]);
	const [before] = await db.select().from(resumeSections).where(eq(resumeSections.slug, slug));
	if (!before) throw new ApiError(404, "not_found", `Блока резюме «${slug}» нет`);
	const set = resumeFields(body);
	const changes = diff(before as unknown as Fields, set);
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.update(resumeSections).set(set).where(eq(resumeSections.id, before.id));
			const undo: Step[] = [{ t: "row", table: "resume_sections", key: slug, set: olds(before as unknown as Fields, Object.keys(set)), expect: set }];
			return record(tx, { action: "resume.patch", target: `resume/sections/${slug}`, summary: `Блок резюме «${slug}»: ${fields(changes)}`, changes, undo });
		});
		publish(RESUME);
		audit("resume_section", { id: auditId, slug, fields: changes.map((c) => c.field) });
	}
	return { slug, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}

export async function createResumeSection(body: Fields, dryRun: boolean) {
	onlyKnown(body, [...RESUME_FIELDS, "part", "dry_run"]);
	const part = body.part === undefined ? "sidebar" : body.part;
	if (part !== "main" && part !== "sidebar") bad("Поле «part» — main или sidebar");
	const values = resumeFields(body);
	if (dryRun) return { dry_run: true, applied: false, audit_id: null, part, ...values };
	await auditReady();
	const slug = `rsec-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	const auditId = await db.transaction(async (tx) => {
		const rows = await tx.select({ s: resumeSections.sort_order }).from(resumeSections);
		const next = rows.reduce((m, r) => Math.max(m, r.s), 0) + 1;
		await tx.insert(resumeSections).values({ slug, part, sort_order: next, ...values });
		const undo: Step[] = [{ t: "row_delete", table: "resume_sections", key: slug, expect: { part, ...values } }];
		return record(tx, { action: "resume.create", target: `resume/sections/${slug}`, summary: `Новый блок резюме «${slug}» (${part})`, changes: { slug, part, ...values }, undo });
	});
	publish(RESUME);
	audit("resume_section_create", { id: auditId, slug, part });
	return { dry_run: false, applied: true, audit_id: auditId, slug, part, ...values };
}

export async function deleteResumeSection(slug: string, dryRun: boolean) {
	const [before] = await db.select().from(resumeSections).where(eq(resumeSections.slug, slug));
	if (!before) throw new ApiError(404, "not_found", `Блока резюме «${slug}» нет`);
	let auditId: number | null = null;
	if (!dryRun) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.delete(resumeSections).where(eq(resumeSections.id, before.id));
			const undo: Step[] = [{ t: "row_insert", table: "resume_sections", row: before as unknown as Record<string, unknown> }];
			return record(tx, { action: "resume.delete", target: `resume/sections/${slug}`, summary: `Удалён блок резюме «${slug}» («${before.title}»)`, changes: { deleted: before }, undo });
		});
		publish(RESUME);
		audit("resume_section_delete", { id: auditId, slug });
	}
	// a deleted record is returned in full: it can be used to recreate the block (or to roll back the journal edit)
	return { dry_run: dryRun, applied: !dryRun, audit_id: auditId, deleted: before };
}

// ─── Quotes ────────────────────────────────────────────────────────────────────────────────────────

const QUOTE_PAGES: Target[] = ["/", "/about"];
export const listQuotes = () => withDbRetry(() => db.select().from(quotes).orderBy(asc(quotes.slug)));

export async function patchQuote(slug: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, ["text", "author", "dry_run"]);
	if (!/^[A-Za-z0-9_\-]{1,50}(__(en|de))?$/.test(slug)) bad(`Слаг цитаты «${slug}» записан неверно`);
	const [before] = await db.select().from(quotes).where(eq(quotes.slug, slug));
	const [base] = /__(en|de)$/.test(slug) ? await db.select().from(quotes).where(eq(quotes.slug, slug.replace(/__(en|de)$/, ""))) : [before];
	if (!before && !base) throw new ApiError(404, "not_found", `Цитаты «${slug}» нет`);
	const set: Fields = {};
	if ("text" in body) set.text = text(body.text, "text", { max: 1_000 });
	if ("author" in body) set.author = text(body.author, "author", { max: 200 });
	if (!before && !("text" in set)) bad("Для нового перевода цитаты нужен текст (поле «text»)");
	const changes = diff((before ?? { text: null, author: base.author }) as unknown as Fields, set);
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			let undo: Step[];
			if (before) {
				await tx.update(quotes).set(set).where(eq(quotes.id, before.id));
				undo = [{ t: "row", table: "quotes", key: slug, set: olds(before as unknown as Fields, Object.keys(set)), expect: set }];
			} else {
				// the quote's translation has no record yet: create it from the Russian one (author and pages are the same)
				const row = { slug, text: String(set.text), author: String(set.author ?? base.author), pages: base.pages };
				await tx.insert(quotes).values(row);
				undo = [{ t: "row_delete", table: "quotes", key: slug, expect: { text: row.text, author: row.author } }];
			}
			return record(tx, { action: "quote.patch", target: `quotes/${slug}`, summary: `Цитата «${slug}»: ${fields(changes)}`, changes, undo });
		});
		publish(QUOTE_PAGES);
		audit("quote", { id: auditId, slug, fields: changes.map((c) => c.field) });
	}
	return { slug, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}

export async function createQuote(body: Fields, dryRun: boolean) {
	onlyKnown(body, ["text", "author", "pages", "dry_run"]);
	const values = {
		text: text(body.text, "text", { max: 1_000 }).trim(),
		author: text(body.author, "author", { max: 200 }).trim(),
		pages: "pages" in body ? lines(body.pages, "pages", { maxItems: 10, maxLen: 50 }) : [],
	};
	if (dryRun) return { dry_run: true, applied: false, audit_id: null, ...values };
	await auditReady();
	const slug = `quote-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	const auditId = await db.transaction(async (tx) => {
		await tx.insert(quotes).values({ slug, ...values });
		const undo: Step[] = [{ t: "row_delete", table: "quotes", key: slug, expect: values }];
		return record(tx, { action: "quote.create", target: `quotes/${slug}`, summary: `Новая цитата «${slug}»`, changes: { slug, ...values }, undo });
	});
	publish(QUOTE_PAGES);
	audit("quote_create", { id: auditId, slug });
	return { dry_run: false, applied: true, audit_id: auditId, slug, ...values };
}

export async function deleteQuote(slug: string, dryRun: boolean) {
	const [before] = await db.select().from(quotes).where(eq(quotes.slug, slug));
	if (!before) throw new ApiError(404, "not_found", `Цитаты «${slug}» нет`);
	let auditId: number | null = null;
	if (!dryRun) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.delete(quotes).where(eq(quotes.id, before.id));
			const undo: Step[] = [{ t: "row_insert", table: "quotes", row: before as unknown as Record<string, unknown> }];
			return record(tx, { action: "quote.delete", target: `quotes/${slug}`, summary: `Удалена цитата «${slug}»`, changes: { deleted: before }, undo });
		});
		publish(QUOTE_PAGES);
		audit("quote_delete", { id: auditId, slug });
	}
	return { dry_run: dryRun, applied: !dryRun, audit_id: auditId, deleted: before };
}

// ─── AI assistant capabilities (cards on its page) ─────────────────────────────────────────────────────

export const listAiCapabilities = () => withDbRetry(() => db.select().from(aiCapabilities).orderBy(asc(aiCapabilities.sort_order)));

export async function patchAiCapability(slug: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, ["title", "description", "hint", "dry_run"]);
	const [before] = await db.select().from(aiCapabilities).where(eq(aiCapabilities.slug, slug));
	if (!before) throw new ApiError(404, "not_found", `Возможности «${slug}» нет`);
	const set: Fields = {};
	if ("title" in body) set.title = text(body.title, "title", { max: 200 });
	if ("description" in body) set.description = text(body.description, "description", { max: 2_000 });
	if ("hint" in body) set.hint = text(body.hint, "hint", { max: 1_000 });
	const changes = diff(before as unknown as Fields, set);
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.update(aiCapabilities).set(set).where(eq(aiCapabilities.id, before.id));
			const undo: Step[] = [{ t: "row", table: "ai_capabilities", key: slug, set: olds(before as unknown as Fields, Object.keys(set)), expect: set }];
			return record(tx, { action: "ai.capability", target: `ai/capabilities/${slug}`, summary: `Возможность ассистента «${slug}»: ${fields(changes)}`, changes, undo });
		});
		publish(["/ai-assistant"]);
		audit("ai_capability", { id: auditId, slug, fields: changes.map((c) => c.field) });
	}
	return { slug, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}
