"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import {
	aboutBlockTexts,
	aboutSections,
	contactMethods,
	contactsTexts,
	homeTexts,
	pageHeroes,
	quotes,
	resumeTexts,
	workCategories,
	workItems,
	workResults,
} from "@/lib/schema";
import { not, like, eq } from "drizzle-orm";
import { revalidateContent } from "@/lib/revalidate";

// Translation of a single text RU → EN (for the "Translate" button next to the field).
export async function translateTextToEn(
	text: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
	await requireAdmin();
	try {
		if (!text.trim()) return { ok: true, text: "" };
		const [translated] = await googleTranslate([text]);
		return { ok: true, text: translated ?? "" };
	} catch (err) {
		return { ok: false, error: (err as Error).message };
	}
}

// ─── Google Cloud Translation v2 ─────────────────────────────────────────────

async function googleTranslate(texts: string[]): Promise<string[]> {
	const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY не задан в .env.local");

	const nonEmpty = texts.map((t) => t?.trim() || "");
	const results: string[] = new Array(nonEmpty.length).fill("");

	// batch in chunks of 100 (API limit)
	const chunkSize = 100;
	let offset = 0;

	while (offset < nonEmpty.length) {
		const chunk = nonEmpty.slice(offset, offset + chunkSize);
		const nonEmptyChunk = chunk.filter(Boolean);

		if (nonEmptyChunk.length === 0) {
			offset += chunkSize;
			continue;
		}

		const res = await fetch(
			`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ q: nonEmptyChunk, source: "ru", target: "en", format: "text" }),
			},
		);

		if (!res.ok) {
			const err = await res.text();
			throw new Error(`Google Translate API error: ${err}`);
		}

		const data = await res.json();
		const translated: string[] = data.data.translations.map(
			(t: { translatedText: string }) => t.translatedText,
		);

		// map back (skip empty items)
		let ti = 0;
		for (let i = 0; i < chunk.length; i++) {
			if (chunk[i]) {
				results[offset + i] = translated[ti++];
			}
		}

		offset += chunkSize;
	}

	return results;
}

// ─── Main action ─────────────────────────────────────────────────────────────

export async function translateAllToEn(): Promise<{ ok: boolean; count: number; error?: string }> {
	await requireAdmin();
	try {
		const queue: { text: string; save: (tr: string) => Promise<void> }[] = [];

		// ── aboutSections (shadow records) ──────────────────────────────────────
		const sections = await db
			.select()
			.from(aboutSections)
			.where(not(like(aboutSections.slug, "%__en")));

		for (const s of sections) {
			if (!s.title.trim()) continue;
			queue.push({
				text: s.title,
				save: async (tr) => {
					await db
						.insert(aboutSections)
						.values({ slug: `${s.slug}__en`, title: tr, sort_order: s.sort_order })
						.onConflictDoUpdate({ target: aboutSections.slug, set: { title: tr } });
				},
			});
		}

		// ── aboutBlockTexts (shadow records) ────────────────────────────────────
		const blocks = await db
			.select()
			.from(aboutBlockTexts)
			.where(not(like(aboutBlockTexts.slug, "%__en")));

		for (const b of blocks) {
			if (!b.content.trim()) continue;
			queue.push({
				text: b.content,
				save: async (tr) => {
					await db
						.insert(aboutBlockTexts)
						.values({ slug: `${b.slug}__en`, content: tr })
						.onConflictDoUpdate({ target: aboutBlockTexts.slug, set: { content: tr } });
				},
			});
		}

		// ── quotes (shadow records) ─────────────────────────────────────────────
		const allQuotes = await db
			.select()
			.from(quotes)
			.where(not(like(quotes.slug, "%__en")));

		for (const q of allQuotes) {
			if (!q.text.trim()) continue;
			queue.push({
				text: q.text,
				save: async (tr) => {
					await db
						.insert(quotes)
						.values({ slug: `${q.slug}__en`, text: tr, author: q.author, pages: q.pages })
						.onConflictDoUpdate({ target: quotes.slug, set: { text: tr, author: q.author } });
				},
			});
		}

		// ── pageHeroes (shadow records) ─────────────────────────────────────────
		const heroes = await db
			.select()
			.from(pageHeroes)
			.where(not(like(pageHeroes.page, "%__en")));

		for (const h of heroes) {
			const textsToTr = [h.label, h.title, h.subtitle ?? ""].filter(Boolean);
			if (textsToTr.length === 0) continue;

			// translate all 3 in one push (we handle multi-field via a small helper)
			const fullText = [h.label, h.title, h.subtitle ?? ""].join("\n||||\n");
			queue.push({
				text: fullText,
				save: async (tr) => {
					const parts = tr.split(/\n\|\|\|\|\n/);
					const [label_en, title_en, subtitle_en] = parts;
					await db
						.insert(pageHeroes)
						.values({
							page: `${h.page}__en`,
							label: label_en ?? h.label,
							title: title_en ?? h.title,
							subtitle: subtitle_en?.trim() || h.subtitle,
						})
						.onConflictDoUpdate({
							target: pageHeroes.page,
							set: {
								label: label_en ?? h.label,
								title: title_en ?? h.title,
								subtitle: subtitle_en?.trim() || h.subtitle,
							},
						});
				},
			});
		}

		// ── workItems (EN columns) ──────────────────────────────────────────────
		const works = await db.select().from(workItems);

		for (const w of works) {
			const id = w.id;
			if (w.title) queue.push({ text: w.title, save: async (tr) => { await db.update(workItems).set({ title_en: tr }).where(eq(workItems.id, id)); } });
			if (w.description) queue.push({ text: w.description, save: async (tr) => { await db.update(workItems).set({ description_en: tr }).where(eq(workItems.id, id)); } });
			if (w.overview) queue.push({ text: w.overview, save: async (tr) => { await db.update(workItems).set({ overview_en: tr }).where(eq(workItems.id, id)); } });
			if (w.category) queue.push({ text: w.category, save: async (tr) => { await db.update(workItems).set({ category_en: tr }).where(eq(workItems.id, id)); } });
		}

		// ── workCategories (EN column) ──────────────────────────────────────────
		const cats = await db.select().from(workCategories);

		for (const c of cats) {
			if (!c.label.trim()) continue;
			const id = c.id;
			queue.push({ text: c.label, save: async (tr) => { await db.update(workCategories).set({ label_en: tr }).where(eq(workCategories.id, id)); } });
		}

		// ── workResults (EN column) ─────────────────────────────────────────────
		const results = await db.select().from(workResults);

		for (const r of results) {
			if (!r.text.trim()) continue;
			const id = r.id;
			queue.push({ text: r.text, save: async (tr) => { await db.update(workResults).set({ text_en: tr }).where(eq(workResults.id, id)); } });
		}

		// ── contactMethods (EN column) ──────────────────────────────────────────
		const cms = await db.select().from(contactMethods);

		for (const cm of cms) {
			if (!cm.title.trim()) continue;
			const id = cm.id;
			queue.push({ text: cm.title, save: async (tr) => { await db.update(contactMethods).set({ title_en: tr }).where(eq(contactMethods.id, id)); } });
		}

		// ── KV tables (__en key pattern) ────────────────────────────────────────
		const kvTables = [
			{ table: homeTexts, target: homeTexts },
			{ table: resumeTexts, target: resumeTexts },
			{ table: contactsTexts, target: contactsTexts },
		] as const;

		for (const { table } of kvTables) {
			const rows = await db.select().from(table).where(not(like(table.key, "%__en")));
			for (const row of rows) {
				if (!row.value.trim()) continue;
				queue.push({
					text: row.value,
					save: async (tr) => {
						await db
							.insert(table)
							.values({ key: `${row.key}__en`, value: tr })
							.onConflictDoUpdate({ target: table.key, set: { value: tr } });
					},
				});
			}
		}

		if (queue.length === 0) {
			return { ok: true, count: 0 };
		}

		// ── Translate all at once ───────────────────────────────────────────────
		const texts = queue.map((q) => q.text);
		const translated = await googleTranslate(texts);

		// ── Save results ────────────────────────────────────────────────────────
		for (let i = 0; i < queue.length; i++) {
			if (translated[i]) {
				await queue[i].save(translated[i]);
			}
		}

		revalidateContent("/", "layout");

		return { ok: true, count: queue.length };
	} catch (err) {
		console.error("translateAllToEn error:", err);
		return { ok: false, count: 0, error: (err as Error).message };
	}
}
