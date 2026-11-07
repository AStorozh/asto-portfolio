import { bad } from "./http";
import { readAiSettings } from "./ai";
import { listAiCapabilities, listContactMethods, listQuotes, listResumeSections, listWorks } from "./structured";
import { SCOPES } from "./texts";

// Phrase search across the whole site: "where does this text live?". Searches Russian text, translations and key names,
// in page texts, interface labels, works, contacts, resume, quotes and assistant settings.
// Each finding comes with the query to use to edit it, so the assistant doesn't have to guess the section.

type Hit = { where: string; field: string; text: string; edit: string };

const around = (text: string, q: string): string => {
	const i = text.toLowerCase().indexOf(q);
	if (i < 0 || text.length <= 240) return text.slice(0, 240);
	const from = Math.max(0, i - 80);
	return (from > 0 ? "…" : "") + text.slice(from, from + 240) + (from + 240 < text.length ? "…" : "");
};

export async function searchSite(url: URL) {
	const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
	if (q.length < 2 || q.length > 100) bad("q — искомая фраза от 2 до 100 знаков");
	const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 40) || 40, 1), 100);
	const hits: Hit[] = [];
	const add = (where: string, field: string, value: unknown, edit: string) => {
		if (typeof value === "string" && value.toLowerCase().includes(q)) hits.push({ where, field, text: around(value, q), edit });
	};

	for (const scope of Object.values(SCOPES)) {
		for (const row of await scope.read()) {
			if (row.key.toLowerCase().includes(q) || row.value.toLowerCase().includes(q)) {
				hits.push({ where: `texts/${scope.name}`, field: row.key, text: around(row.value, q), edit: `PUT /texts/${scope.name} {changes:[{key:"${row.key}", value}]}` });
			}
		}
	}
	for (const w of await listWorks()) {
		const edit = `PATCH /works/${w.slug}`;
		for (const f of ["title", "title_en", "title_de", "description", "description_en", "description_de", "overview", "overview_en", "overview_de"] as const) add(`works/${w.slug}`, f, w[f], edit);
		for (const f of ["tags", "what_i_did", "how_done", "results"] as const) w[f].forEach((v) => add(`works/${w.slug}`, f, v, edit));
	}
	for (const m of await listContactMethods()) {
		for (const f of ["platform", "title", "title_en", "title_de", "href"] as const) add(`contacts/methods/${m.slug}`, f, m[f], `PATCH /contacts/methods/${m.slug}`);
	}
	for (const s of await listResumeSections()) {
		for (const f of ["title", "title_en", "title_de", "body", "body_en", "body_de"] as const) add(`resume/sections/${s.slug}`, f, s[f], `PATCH /resume/sections/${s.slug}`);
	}
	for (const qt of await listQuotes()) {
		for (const f of ["text", "author"] as const) add(`quotes/${qt.slug}`, f, qt[f], `PATCH /quotes/${qt.slug}`);
	}
	for (const c of await listAiCapabilities()) {
		for (const f of ["title", "description", "hint"] as const) add(`ai/capabilities/${c.slug}`, f, c[f], `PATCH /ai/capabilities/${c.slug}`);
	}
	for (const s of (await readAiSettings()).items) add("ai/settings", s.key, s.value, `PUT /ai/settings {changes:[{key:"${s.key}", value}]}`);

	return {
		query: q,
		total: hits.length,
		truncated: hits.length > limit,
		hits: hits.slice(0, limit),
		note: hits.length ? "У каждой находки в edit указано, каким запросом её править." : "Нигде не найдено. Подписи, которых нет ни в одном из разделов, зашиты в коде сайта и отсюда не меняются.",
	};
}
