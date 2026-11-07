"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import {
	aboutSections,
	adminNotes,
	aiAssistantTexts,
	aiCapabilities,
	contactMethods,
	contactsTexts,
	homeTexts,
	pageHeroes,
	quotes,
	resumeTexts,
	resumeSections,
	siteNavigation,
	workHowDone,
	workItems,
	workResults,
	workTags,
	workWhatIDid,
	worksTexts,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { revalidateContent } from "@/lib/revalidate";

// All text sections of the admin work the same way: the form sends pairs
// "key -> value", which must be written to their own table and the cache of the pages
// that show this text reset. There used to be five nearly identical functions.
type KVTable = { key: AnyPgColumn; value: AnyPgColumn };

async function saveKV(table: PgTable & KVTable, formData: FormData, paths: RevalidateTarget[]) {
	await requireAdmin();
	for (const [key, value] of formData.entries()) {
		await db
			.insert(table)
			.values({ key, value: value as string })
			.onConflictDoUpdate({ target: table.key, set: { value: value as string } });
	}
	for (const target of paths) {
		if (typeof target === "string") revalidateContent(target);
		else revalidateContent(target.path, target.type);
	}
}

type RevalidateTarget = string | { path: string; type: "layout" | "page" };

// ─── Page Heroes ─────────────────────────────────────────────────────────────

export async function savePageHero(page: string, formData: FormData) {
	await requireAdmin();
	// Update only the submitted fields - the form may not contain all of them
	// (e.g. the AI assistant's header has only the title left).
	const set: Partial<{ label: string; title: string; subtitle: string | null }> = {};
	if (formData.has("label")) set.label = formData.get("label") as string;
	if (formData.has("title")) set.title = formData.get("title") as string;
	if (formData.has("subtitle")) set.subtitle = (formData.get("subtitle") as string) || null;
	if (Object.keys(set).length > 0) {
		await db.update(pageHeroes).set(set).where(eq(pageHeroes.page, page));
	}

	// Translated versions of the header are stored as shadow records `${page}__<lang>`.
	for (const lang of ["en", "de"] as const) {
		const label = formData.get(`label__${lang}`) as string | null;
		const title = formData.get(`title__${lang}`) as string | null;
		const subtitle = formData.get(`subtitle__${lang}`) as string | null;
		if (label !== null) {
			await db
				.insert(pageHeroes)
				.values({
					page: `${page}__${lang}`,
					label,
					title: title ?? "",
					subtitle: subtitle || null,
				})
				.onConflictDoUpdate({
					target: pageHeroes.page,
					set: { label, title: title ?? "", subtitle: subtitle || null },
				});
		}
	}

	revalidateContent(`/admin/text/${page === "ai_assistant" ? "ai-assistant" : page}`);
	revalidateContent(`/${page === "ai_assistant" ? "ai-assistant" : page}`);
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export async function saveNavigation(formData: FormData) {
	await requireAdmin();
	for (const [key, value] of formData.entries()) {
		await db
			.insert(siteNavigation)
			.values({ key, label: value as string })
			.onConflictDoUpdate({ target: siteNavigation.key, set: { label: value as string } });
	}
	revalidateContent("/admin/text/navigation");
	revalidateContent("/", "layout");
}

// ─── Home ────────────────────────────────────────────────────────────────────

export async function saveHomeTexts(formData: FormData) {
	await saveKV(homeTexts, formData, ["/admin/text/home", "/"]);
}

export async function addHomeBadge(formData: FormData) {
	await requireAdmin();
	const block = formData.get("block") as string;
	const text = (formData.get("text") as string)?.trim();
	if (!block || !text) return;
	const key = `${block}_badges`;
	const [row] = await db.select().from(homeTexts).where(eq(homeTexts.key, key));
	let badges: string[];
	if (row !== undefined) {
		badges = row.value.split("\n").map((b) => b.trim()).filter(Boolean);
	} else {
		const existing = (formData.get("existing") as string) ?? "";
		badges = existing.split("\n").map((b) => b.trim()).filter(Boolean);
	}
	if (!badges.includes(text)) badges.push(text);
	await db.insert(homeTexts).values({ key, value: badges.join("\n") })
		.onConflictDoUpdate({ target: homeTexts.key, set: { value: badges.join("\n") } });
	revalidateContent("/admin/text/home");
	revalidateContent("/");
}

export async function deleteHomeBadge(formData: FormData) {
	await requireAdmin();
	const block = formData.get("block") as string;
	const text = formData.get("text") as string;
	if (!block || !text) return;
	const key = `${block}_badges`;
	const [row] = await db.select().from(homeTexts).where(eq(homeTexts.key, key));
	const current = row?.value ?? "";
	const badges = current.split("\n").map((b) => b.trim()).filter((b) => b && b !== text);
	await db.insert(homeTexts).values({ key, value: badges.join("\n") })
		.onConflictDoUpdate({ target: homeTexts.key, set: { value: badges.join("\n") } });
	revalidateContent("/admin/text/home");
	revalidateContent("/");
}

// ─── About ───────────────────────────────────────────────────────────────────

export async function saveAboutSections(formData: FormData) {
	await requireAdmin();
	for (const [name, value] of formData.entries()) {
		const titleMatch = name.match(/^section_(\d+)_title$/);
		if (titleMatch) {
			await db
				.update(aboutSections)
				.set({ title: value as string })
				.where(eq(aboutSections.id, parseInt(titleMatch[1])));
			continue;
		}
		const titleTrMatch = name.match(/^section_(\d+)_title__(en|de)$/);
		if (titleTrMatch) {
			const lang = titleTrMatch[2];
			const [section] = await db
				.select({ slug: aboutSections.slug, sort_order: aboutSections.sort_order })
				.from(aboutSections)
				.where(eq(aboutSections.id, parseInt(titleTrMatch[1])));
			if (section) {
				await db
					.insert(aboutSections)
					.values({ slug: `${section.slug}__${lang}`, title: value as string, sort_order: section.sort_order })
					.onConflictDoUpdate({ target: aboutSections.slug, set: { title: value as string } });
			}
			continue;
		}
		const slugMatch = name.match(/^section_(\d+)_url_slug$/);
		if (slugMatch) {
			const raw = (value as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
			if (raw) {
				await db
					.update(aboutSections)
					.set({ url_slug: raw })
					.where(eq(aboutSections.id, parseInt(slugMatch[1])));
			}
		}
	}
	revalidateContent("/admin/text/about");
	revalidateContent("/about");
	revalidateContent("/about", "layout");
}

// ─── Works ───────────────────────────────────────────────────────────────────

export async function saveWorksTexts(formData: FormData) {
	await saveKV(worksTexts, formData, ["/admin/text/works", { path: "/works", type: "layout" }]);
}

export async function saveWorkItem(formData: FormData) {
	await requireAdmin();
	const id = parseInt(formData.get("id") as string);

	await db
		.update(workItems)
		.set({
			title: formData.get("title") as string,
			title_en: (formData.get("title_en") as string) || null,
			title_de: (formData.get("title_de") as string) || null,
			description: formData.get("description") as string,
			description_en: (formData.get("description_en") as string) || null,
			description_de: (formData.get("description_de") as string) || null,
			overview: formData.get("overview") as string,
			overview_en: (formData.get("overview_en") as string) || null,
			overview_de: (formData.get("overview_de") as string) || null,
		})
		.where(eq(workItems.id, id));

	const tags = (formData.get("tags") as string)
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
	await db.delete(workTags).where(eq(workTags.work_id, id));
	if (tags.length)
		await db
			.insert(workTags)
			.values(tags.map((tag, i) => ({ work_id: id, tag, sort_order: i })));

	const parseLines = (key: string) =>
		(formData.get(key) as string)
			.split("\n")
			.map((t) => t.trim())
			.filter(Boolean);

	const whatIDid = parseLines("what_i_did");
	await db.delete(workWhatIDid).where(eq(workWhatIDid.work_id, id));
	if (whatIDid.length)
		await db
			.insert(workWhatIDid)
			.values(whatIDid.map((text, i) => ({ work_id: id, text, sort_order: i })));

	const howDone = parseLines("how_done");
	await db.delete(workHowDone).where(eq(workHowDone.work_id, id));
	if (howDone.length)
		await db
			.insert(workHowDone)
			.values(howDone.map((text, i) => ({ work_id: id, text, sort_order: i })));

	const results = parseLines("results");
	await db.delete(workResults).where(eq(workResults.work_id, id));
	if (results.length)
		await db
			.insert(workResults)
			.values(results.map((text, i) => ({ work_id: id, text, sort_order: i })));

	revalidateContent("/admin/text/works");
	revalidateContent("/works");
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function saveContactsTexts(formData: FormData) {
	await saveKV(contactsTexts, formData, ["/admin/text/contacts", "/contacts"]);
}

export async function saveContactMethods(formData: FormData) {
	await requireAdmin();
	const updates: Record<number, Partial<{ platform: string; title: string; title_en: string; title_de: string; href: string }>> = {};
	for (const [name, value] of formData.entries()) {
		const match = name.match(/^method_(\d+)_(platform|title|href)$/);
		if (match) {
			const id = parseInt(match[1]);
			const field = match[2] as "platform" | "title" | "href";
			(updates[id] ??= {})[field] = value as string;
			continue;
		}
		const trMatch = name.match(/^method_(\d+)_title__(en|de)$/);
		if (trMatch) {
			const id = parseInt(trMatch[1]);
			(updates[id] ??= {})[trMatch[2] === "en" ? "title_en" : "title_de"] = value as string;
		}
	}
	for (const [id, data] of Object.entries(updates)) {
		await db
			.update(contactMethods)
			.set(data)
			.where(eq(contactMethods.id, parseInt(id)));
	}
	revalidateContent("/admin/text/contacts");
	revalidateContent("/contacts");
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function saveResumeTexts(formData: FormData) {
	await saveKV(resumeTexts, formData, ["/admin/text/resume", "/admin/resume", "/resume-file", "/resume-file/embed", "/resume-file/print"]);
}

function revalidateResumeFile() {
	revalidateContent("/admin/resume");
	revalidateContent("/resume-file");
	revalidateContent("/resume-file/embed");
	revalidateContent("/resume-file/print");
}

export async function addResumeSection(formData: FormData) {
	await requireAdmin();
	const part = (formData.get("part") as string) === "main" ? "main" : "sidebar";
	const rows = await db.select({ s: resumeSections.sort_order }).from(resumeSections);
	const nextOrder = rows.reduce((m, r) => Math.max(m, r.s), 0) + 1;
	await db.insert(resumeSections).values({
		slug: `rsec-${Date.now()}`,
		part,
		sort_order: nextOrder,
	});
	revalidateResumeFile();
}

export async function saveResumeSections(formData: FormData) {
	await requireAdmin();
	const updates: Record<number, Partial<{ title: string; body: string; title_en: string; body_en: string; title_de: string; body_de: string }>> = {};
	for (const [name, value] of formData.entries()) {
		const tr = name.match(/^rsec_(\d+)_(title|body)__(en|de)$/);
		if (tr) {
			const id = parseInt(tr[1]);
			const key = `${tr[2]}_${tr[3]}` as "title_en" | "body_en" | "title_de" | "body_de";
			(updates[id] ??= {})[key] = value as string;
			continue;
		}
		const m = name.match(/^rsec_(\d+)_(title|body)$/);
		if (m) {
			const id = parseInt(m[1]);
			(updates[id] ??= {})[m[2] as "title" | "body"] = value as string;
		}
	}
	for (const [id, data] of Object.entries(updates)) {
		await db.update(resumeSections).set(data).where(eq(resumeSections.id, parseInt(id)));
	}
	revalidateResumeFile();
}

export async function deleteResumeSection(formData: FormData) {
	await requireAdmin();
	const id = parseInt(formData.get("id") as string);
	if (!id) return;
	await db.delete(resumeSections).where(eq(resumeSections.id, id));
	revalidateResumeFile();
}

// ─── AI-assistant ────────────────────────────────────────────────────────────

export async function saveAiAssistantTexts(formData: FormData) {
	await requireAdmin();
	for (const [key, value] of formData.entries()) {
		await db
			.update(aiAssistantTexts)
			.set({ value: value as string })
			.where(eq(aiAssistantTexts.key, key));
	}
	revalidateContent("/admin/text/ai-assistant");
	revalidateContent("/ai-assistant");
}

export async function saveAiCapabilities(formData: FormData) {
	await requireAdmin();
	const updates: Record<number, Partial<{ title: string; description: string; hint: string }>> = {};
	for (const [name, value] of formData.entries()) {
		const match = name.match(/^cap_(\d+)_(title|description|hint)$/);
		if (!match) continue;
		const id = parseInt(match[1]);
		const field = match[2] as "title" | "description" | "hint";
		(updates[id] ??= {})[field] = value as string;
	}
	for (const [id, data] of Object.entries(updates)) {
		await db
			.update(aiCapabilities)
			.set(data)
			.where(eq(aiCapabilities.id, parseInt(id)));
	}
	revalidateContent("/admin/text/ai-assistant");
	revalidateContent("/ai-assistant");
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export async function saveQuotes(formData: FormData) {
	await requireAdmin();
	const updates: Record<number, Partial<{ text: string; author: string }>> = {};
	// Quote translations: { lang: { id: {text?, author?} } }
	const trUpdates: Record<"en" | "de", Record<number, Partial<{ text: string; author: string }>>> = { en: {}, de: {} };

	for (const [name, value] of formData.entries()) {
		const match = name.match(/^quote_(\d+)_(text|author)$/);
		if (match) {
			const id = parseInt(match[1]);
			const field = match[2] as "text" | "author";
			(updates[id] ??= {})[field] = value as string;
			continue;
		}
		const trMatch = name.match(/^quote_(\d+)_(text|author)__(en|de)$/);
		if (trMatch) {
			const id = parseInt(trMatch[1]);
			const field = trMatch[2] as "text" | "author";
			const lang = trMatch[3] as "en" | "de";
			(trUpdates[lang][id] ??= {})[field] = value as string;
		}
	}

	for (const [id, data] of Object.entries(updates)) {
		await db.update(quotes).set(data).where(eq(quotes.id, parseInt(id)));
	}

	for (const lang of ["en", "de"] as const) {
		for (const [id, data] of Object.entries(trUpdates[lang])) {
			const [ruQuote] = await db
				.select({ slug: quotes.slug, author: quotes.author, pages: quotes.pages })
				.from(quotes)
				.where(eq(quotes.id, parseInt(id)));
			if (ruQuote) {
				await db
					.insert(quotes)
					.values({
						slug: `${ruQuote.slug}__${lang}`,
						text: data.text ?? "",
						author: data.author ?? ruQuote.author,
						pages: ruQuote.pages,
					})
					.onConflictDoUpdate({
						target: quotes.slug,
						set: { text: data.text ?? "", author: data.author ?? ruQuote.author },
					});
			}
		}
	}

	revalidateContent("/admin/text/quotes");
	revalidateContent("/");
	revalidateContent("/about");
}

export async function addQuote(formData: FormData) {
	await requireAdmin();
	const text = (formData.get("text") as string)?.trim();
	const author = (formData.get("author") as string)?.trim();
	if (!text || !author) return;
	await db.insert(quotes).values({ slug: `quote-${Date.now()}`, text, author, pages: [] });
	revalidateContent("/admin/text/quotes");
	revalidateContent("/");
	revalidateContent("/about");
}

export async function deleteQuote(formData: FormData) {
	await requireAdmin();
	const id = parseInt(formData.get("id") as string);
	if (!id) return;
	await db.delete(quotes).where(eq(quotes.id, id));
	revalidateContent("/admin/text/quotes");
	revalidateContent("/");
	revalidateContent("/about");
}

// ─── Admin Notes ──────────────────────────────────────────────────────────────

export async function saveNote(formData: FormData) {
	await requireAdmin();
	const content = (formData.get("content") as string) ?? "";
	await db.insert(adminNotes).values({ id: 1, content })
		.onConflictDoUpdate({ target: adminNotes.id, set: { content } });
	revalidateContent("/admin/notes");
}
