import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db, withDbRetry } from "./db";
import {
	aboutBlockTexts,
	aboutSections,
	aiSettings,
	contactMethods,
	contactsTexts,
	galleryImages,
	personalGalleryImages,
	homeTexts,
	pageHeroes,
	quotes,
	resumeTexts,
	resumeSections,
	siteImages,
	siteNavigation,
	uiTexts,
	workCategories,
	workHowDone,
	workImages,
	workItemCategories,
	workItems,
	workLinks,
	workResults,
	workTags,
	workWhatIDid,
	worksTexts,
} from "./schema";

export type KV = Record<string, string>;

const toKV = <T extends { key: string; value: string }>(rows: T[]): KV =>
	Object.fromEntries(rows.map((r) => [r.key, r.value]));

// Picks the localized column for a row: `<base>_<lang>` (e.g. title_en / title_de),
// falling back to the base (ru) column when the translation is missing/empty.
const loc = (row: Record<string, unknown>, base: string, lang?: string): string => {
	if (lang && lang !== "ru") {
		const v = row[`${base}_${lang}`];
		if (typeof v === "string" && v) return v;
	}
	return (row[base] as string) ?? "";
};

// Suffix for KV/slug/page-style translations: "" for ru, "__en"/"__de" otherwise.
const LANG_SUFFIX_RE = /__(en|de)$/;

// ─── UI Texts ─────────────────────────────────────────────────────────────────

// ─── Content cache ────────────────────────────────────────────────────────────
// Content only changes through the admin panel, so DB responses are kept in the
// server cache and served to every visitor without hitting the database. Any admin
// save invalidates the tag (see lib/revalidate.ts); the cache also refreshes hourly.
// cache() on top avoids hitting the cache twice within a single render.
export const CONTENT_TAG = "content";

function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
	return cache(
		unstable_cache(fn, [key], {
			tags: [CONTENT_TAG],
			// In development the cache lives for seconds: otherwise a text edit in the DB
			// stays invisible until the hour expires or an admin save fires.
			revalidate: process.env.NODE_ENV === "development" ? 5 : 3600,
		}) as (...args: A) => Promise<R>,
	);
}

export const getUiTexts = cached("getUiTexts", async () =>
	toKV(await withDbRetry(() => db.select().from(uiTexts))),
);

// ─── Navigation ───────────────────────────────────────────────────────────────

export const getNavigation = cached("getNavigation", async () =>
	withDbRetry(() => db.select().from(siteNavigation).orderBy(asc(siteNavigation.sort_order))),
);

// ─── Page Hero ────────────────────────────────────────────────────────────────

export const getPageHero = cached("getPageHero", async (page: string) => {
	const [hero] = await withDbRetry(() =>
		db.select().from(pageHeroes).where(eq(pageHeroes.page, page)),
	);
	return hero ?? null;
});

export async function getPageHeroForLang(page: string, lang: string) {
	if (lang && lang !== "ru") {
		const [row] = await withDbRetry(() =>
			db.select().from(pageHeroes).where(eq(pageHeroes.page, `${page}__${lang}`)),
		);
		if (row) return row;
	}
	return getPageHero(page);
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export const getHomeTexts = cached("getHomeTexts", async () =>
	toKV(await withDbRetry(() => db.select().from(homeTexts))),
);

// ─── About ────────────────────────────────────────────────────────────────────

export const getAboutSections = cached("getAboutSections", async () => {
	const all = await withDbRetry(() =>
		db.select().from(aboutSections).orderBy(asc(aboutSections.sort_order)),
	);
	return all.filter((s) => !LANG_SUFFIX_RE.test(s.slug));
});

export const getAboutSectionsRaw = cached("getAboutSectionsRaw", async () =>
	withDbRetry(() => db.select().from(aboutSections).orderBy(asc(aboutSections.sort_order))),
);

export async function getAboutBlockText(slug: string, lang?: string): Promise<string> {
	if (lang && lang !== "ru") {
		const [row] = await withDbRetry(() =>
			db.select().from(aboutBlockTexts).where(eq(aboutBlockTexts.slug, `${slug}__${lang}`)),
		);
		if (row?.content) return row.content;
	}
	const [row] = await withDbRetry(() =>
		db.select().from(aboutBlockTexts).where(eq(aboutBlockTexts.slug, slug)),
	);
	return row?.content ?? "";
}

export const getAllAboutBlockTexts = cached("getAllAboutBlockTexts", async (): Promise<Record<string, string>> => {
	const rows = await withDbRetry(() => db.select().from(aboutBlockTexts));
	return Object.fromEntries(rows.map((r) => [r.slug, r.content]));
});

// ─── Works ────────────────────────────────────────────────────────────────────

export const getWorksTexts = cached("getWorksTexts", async () =>
	toKV(await withDbRetry(() => db.select().from(worksTexts))),
);

export const getWorkCategories = cached("getWorkCategories", async (lang?: string) => {
	const rows = await withDbRetry(() =>
		db.select().from(workCategories).orderBy(asc(workCategories.sort_order)),
	);
	if (lang && lang !== "ru") {
		return rows.map((r) => ({ ...r, label: loc(r, "label", lang) }));
	}
	return rows;
});

export const getAllWorkItems = cached("getAllWorkItems", async (lang?: string) => {
	const [works, tags, what, how, results, images, cats, catMap, links] = await withDbRetry(() => Promise.all([
		db.select().from(workItems).orderBy(asc(workItems.sort_order)),
		db.select().from(workTags),
		db.select().from(workWhatIDid),
		db.select().from(workHowDone),
		db.select().from(workResults),
		db.select().from(workImages),
		db.select().from(workCategories).orderBy(asc(workCategories.sort_order)),
		db.select().from(workItemCategories),
		db.select().from(workLinks),
	]));
	const catLabel = (id: number): string => {
		const c = cats.find((x) => x.id === id);
		return c ? loc(c, "label", lang) : "";
	};
	const categoriesFor = (workId: number): string[] => {
		const ordered = cats
			.filter((c) => catMap.some((m) => m.work_id === workId && m.category_id === c.id))
			.map((c) => catLabel(c.id))
			.filter(Boolean);
		return ordered;
	};
	return works.map((w) => {
		const categories = categoriesFor(w.id);
		const primary = categories[0] ?? loc(w, "category", lang);
		return {
		...w,
		title: loc(w, "title", lang),
		categories,
		category: primary,
		description: loc(w, "description", lang),
		overview: loc(w, "overview", lang),
		tags: tags
			.filter((t) => t.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((t) => loc(t, "tag", lang)),
		whatIDid: what
			.filter((x) => x.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.text),
		howItWasDone: how
			.filter((x) => x.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.text),
		result: results
			.filter((x) => x.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => loc(x, "text", lang)),
		dbImages: images
			.filter((x) => x.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.url),
		links: links
			.filter((x) => x.work_id === w.id)
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => ({ url: x.url, label: x.label })),
		};
	});
});

export const getWorkBySlug = cached("getWorkBySlug", async (slug: string, lang?: string) => {
	const [work] = await withDbRetry(() => db
		.select()
		.from(workItems)
		.where(eq(workItems.slug, slug)));
	if (!work) return null;
	const [tags, what, how, results, images, cats, catMap, links] = await withDbRetry(() => Promise.all([
		db.select().from(workTags).where(eq(workTags.work_id, work.id)),
		db.select().from(workWhatIDid).where(eq(workWhatIDid.work_id, work.id)),
		db.select().from(workHowDone).where(eq(workHowDone.work_id, work.id)),
		db.select().from(workResults).where(eq(workResults.work_id, work.id)),
		db.select().from(workImages).where(eq(workImages.work_id, work.id)),
		db.select().from(workCategories).orderBy(asc(workCategories.sort_order)),
		db.select().from(workItemCategories).where(eq(workItemCategories.work_id, work.id)),
		db.select().from(workLinks).where(eq(workLinks.work_id, work.id)),
	]));
	const categories = cats
		.filter((c) => catMap.some((m) => m.category_id === c.id))
		.map((c) => loc(c, "label", lang))
		.filter(Boolean);
	return {
		...work,
		title: loc(work, "title", lang),
		categories,
		category: categories[0] ?? loc(work, "category", lang),
		description: loc(work, "description", lang),
		overview: loc(work, "overview", lang),
		tags: tags.sort((a, b) => a.sort_order - b.sort_order).map((t) => loc(t, "tag", lang)),
		whatIDid: what
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.text),
		howItWasDone: how
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.text),
		result: results
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => loc(x, "text", lang)),
		dbImages: images
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => x.url),
		links: links
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((x) => ({ url: x.url, label: x.label })),
	};
});

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const getContactsTexts = cached("getContactsTexts", async () =>
	toKV(await withDbRetry(() => db.select().from(contactsTexts))),
);

export const getContactMethods = cached("getContactMethods", async (lang?: string) => {
	const rows = await withDbRetry(() =>
		db.select().from(contactMethods).orderBy(asc(contactMethods.sort_order)),
	);
	if (lang && lang !== "ru") {
		return rows.map((r) => ({ ...r, title: loc(r, "title", lang) }));
	}
	return rows;
});

// ─── Resume ───────────────────────────────────────────────────────────────────

export const getResumeTexts = cached("getResumeTexts", async () =>
	toKV(await withDbRetry(() => db.select().from(resumeTexts))),
);

export const getResumeSections = cached("getResumeSections", async () =>
	withDbRetry(() =>
		db
			.select()
			.from(resumeSections)
			.orderBy(asc(resumeSections.sort_order), asc(resumeSections.id)),
	),
);


// ─── AI-assistant ─────────────────────────────────────────────────────────────

export const getAiSettings = cached("getAiSettings", async (): Promise<KV> =>
	Object.fromEntries((await withDbRetry(() => db.select().from(aiSettings))).map((r) => [r.key, r.value])),
);

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const getAllQuotes = cached("getAllQuotes", async (lang?: string) => {
	const all = await withDbRetry(() => db.select().from(quotes).orderBy(asc(quotes.id)));
	const base = all.filter((q) => !LANG_SUFFIX_RE.test(q.slug));
	if (lang && lang !== "ru") {
		const map = new Map(
			all
				.filter((q) => q.slug.endsWith(`__${lang}`))
				.map((q) => [q.slug.replace(`__${lang}`, ""), q]),
		);
		return base.map((q) => map.get(q.slug) ?? q);
	}
	return base;
});

// ─── Gallery ──────────────────────────────────────────────────────────────────

export const getGalleryImages = cached("getGalleryImages", async () =>
	withDbRetry(() => db.select().from(galleryImages).orderBy(desc(galleryImages.created_at))),
);

export const getPersonalGalleryImages = cached("getPersonalGalleryImages", async () =>
	withDbRetry(() =>
		db
			.select({
				id: personalGalleryImages.id,
				gallery_image_id: personalGalleryImages.gallery_image_id,
				url: galleryImages.url,
				filename: galleryImages.filename,
				media_type: galleryImages.media_type,
				width: galleryImages.width,
				height: galleryImages.height,
			})
			.from(personalGalleryImages)
			.innerJoin(galleryImages, eq(personalGalleryImages.gallery_image_id, galleryImages.id))
			.orderBy(asc(personalGalleryImages.sort_order)),
	),
);

export const getAllSiteImages = cached("getAllSiteImages", async (): Promise<Record<string, string>> => {
	const rows = await withDbRetry(() => db.select().from(siteImages));
	const out: Record<string, string> = {};
	for (const r of rows) {
		if (r.url) out[r.slot] = r.url;
	}
	return out;
});
