import {
	getAllAboutBlockTexts,
	getAboutSectionsRaw,
	getAllWorkItems,
	getResumeTexts,
	getResumeSections,
	getContactsTexts,
	getContactMethods,
} from "./content";

// ─── "Dossier": all the public site content as one text, with page URLs ───────────
// Built from the DB (single source of truth), cached in memory with a short TTL.
// URLs come from the DB, so links in the assistant's answers don't go stale.

let cached: { doc: { full: string; compact: string }; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Site map, so the model understands what each page is for and where to send people.
const SITE_MAP = `КАРТА САЙТА (куда вести пользователя, других адресов нет):
- / — главная: кто я в двух словах и главные проекты
- /about — «Обо мне» с разделами
- /about/<раздел> — подробно по темам: кто я, опыт, навыки, чем полезен и т.д.
- /works — все работы с фильтром по разделам
- /works/<slug> — страница конкретной работы (адрес указан у каждой работы ниже)
- /resume-file — резюме, там же его можно скачать файлом
- /contacts — контакты`;

// Charts in work descriptions are stored as mini-markup (```stats, ```flow, etc.).
// The model doesn't need it: turn each block into plain "label: value" lines.
function chartsToText(src: string): string {
	return src.replace(/^```([a-z]+)[^\n]*\n([\s\S]*?)^```[ \t]*$/gm, (_m, _kind: string, body: string) => {
		const out: string[] = [];
		for (const raw of body.split("\n")) {
			const l = raw.trim();
			if (!l) continue;
			if (l.startsWith("# ")) { out.push(`Схема «${l.slice(2).trim()}»:`); continue; }
			if (l.startsWith("> ")) { out.push(`(${l.slice(2).trim()})`); continue; }
			const line = l.replace(/^\*\s*/, "").replace(/\s*->\s*/g, " → ");
			const m = line.match(/^(-*)\s*(.*?)\s*\|\s*(.*)$/);
			if (m) out.push(`${"  ".repeat(m[1].length)}- ${m[2]}: ${m[3]}`);
			else out.push(`- ${line.replace(/^-+\s*/, "")}`);
		}
		return out.join("\n");
	});
}

// Strips the special markup of the "About me" blocks (## , > , :quote:, :stat:, :tags:)
// so the dossier gets clean readable text.
function stripAboutMarkup(src: string): string {
	return src
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => {
			const l = line.trim();
			if (l === "" || /^---+$/.test(l)) return "";
			const heading = l.match(/^#{1,3}\s+(.*)$/);
			if (heading) return `\n${heading[1]}:`;
			const quote = l.match(/^:quote:\s*(.*)$/);
			if (quote) return `«${quote[1].replace(/\s—\s.*$/, "")}»`;
			const stat = l.match(/^:stat:\s*(.*)$/);
			if (stat) return stat[1].replace(/\s*\|\s*/, " — ");
			const tags = l.match(/^:tags:\s*(.*)$/);
			// "*N" after a skill is only a weight for the badge width; the assistant doesn't need it.
			if (tags) return tags[1].replace(/\s*\*[1-3](?=\s*(,|$))/g, "");
			const button = l.match(/^:button:\s*(.*)$/);
			if (button) {
				const [label, ...rest] = button[1].split("|");
				return `${label.trim()}: ${rest.join("|").trim()}`;
			}
			const callout = l.match(/^>\s*(.*)$/);
			if (callout) return callout[1];
			const bullet = l.match(/^[-—•*]\s+(.*)$/);
			if (bullet) return `- ${bullet[1]}`;
			return l;
		})
		.join("\n")
		.replace(/\*\*(.+?)\*\*/g, "$1")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function buildDoc(): Promise<{ full: string; compact: string }> {
	const [aboutTexts, aboutSections, works, resumeKV, resumeSections, contactsKV, contactMethods] =
		await Promise.all([
			getAllAboutBlockTexts(),
			getAboutSectionsRaw(),
			getAllWorkItems(),
			getResumeTexts(),
			getResumeSections(),
			getContactsTexts(),
			getContactMethods(),
		]);

	const parts: string[] = [];

	// ── About me ──
	const sectionMeta = new Map(
		aboutSections
			.filter((s) => !s.slug.endsWith("__en"))
			.map((s) => [s.slug, { title: s.title, url: `/about/${s.url_slug ?? s.slug}` }]),
	);
	const aboutChunks: string[] = [];
	for (const [slug, meta] of sectionMeta) {
		const raw = aboutTexts[slug];
		if (!raw || !raw.trim()) continue;
		aboutChunks.push(`### ${meta.title}\nURL: ${meta.url}\n${stripAboutMarkup(raw)}`);
	}
	if (aboutChunks.length) parts.push(`## ОБО МНЕ\n\n${aboutChunks.join("\n\n")}`);

	// ── Works ── (important ones first, as on the site; a short catalog next to them for picking a link)
	const ordered = [...works].sort((a, b) => Number(b.featured) - Number(a.featured));
	const catalog = ordered.map(
		(w) => `- ${w.title}${w.featured ? " [ВАЖНАЯ РАБОТА]" : ""} — /works/${w.slug} — ${w.categories.join(", ")}. ${w.description ?? ""}`.trim(),
	);
	if (catalog.length) parts.push(`## КАТАЛОГ РАБОТ (кратко)\n\n${catalog.join("\n")}`);
	const workChunks = ordered.map((w) => {
		const lines = [`### ${w.title}`, `URL: /works/${w.slug}`];
		if (w.featured) lines.push("Важная работа: да (выделена на сайте как одна из главных)");
		if (w.categories.length) lines.push(`Разделы: ${w.categories.join(", ")}`);
		if (w.description) lines.push(`Кратко: ${w.description}`);
		if (w.links?.length) lines.push(`Ссылки: ${w.links.map((l) => `${l.label || "ссылка"} ${l.url}`).join("; ")}`);
		if (w.overview) lines.push(chartsToText(w.overview));
		if (w.tags?.length) lines.push(`Стек: ${w.tags.join(", ")}`);
		if (w.whatIDid?.length) lines.push(`Что делал: ${w.whatIDid.join("; ")}`);
		if (w.result?.length) lines.push(`Результат: ${w.result.join("; ")}`);
		return lines.join("\n");
	});
	if (workChunks.length) parts.push(`## РАБОТЫ ПОДРОБНО\n\n${workChunks.join("\n\n")}`);

	// Short version for the voice call: the realtime session has a hard limit
	// on instructions, full descriptions don't fit there.
	const compactWorks = ordered.map((w) => {
		const lines = [`### ${w.title}${w.featured ? " [ВАЖНАЯ РАБОТА]" : ""}`, `URL: /works/${w.slug}`];
		if (w.categories.length) lines.push(`Разделы: ${w.categories.join(", ")}`);
		if (w.description) lines.push(w.description);
		if (w.result?.length) lines.push(`Результат: ${w.result.join("; ")}`);
		if (w.tags?.length) lines.push(`Стек: ${w.tags.join(", ")}`);
		return lines.join("\n");
	});

	// ── Resume ──
	const resumeLines: string[] = ["URL: /resume-file (там же скачать файлом)"];
	for (const [k, v] of Object.entries(resumeKV)) {
		if (v && v.trim()) resumeLines.push(`${k}: ${v}`);
	}
	for (const s of resumeSections) {
		if (s.title || s.body) resumeLines.push(`${s.title}: ${s.body}`.trim());
	}
	parts.push(`## РЕЗЮМЕ\n\n${resumeLines.join("\n")}`);

	// ── Contacts ──
	const contactLines: string[] = ["URL: /contacts"];
	for (const [k, v] of Object.entries(contactsKV)) {
		if (v && v.trim()) contactLines.push(`${k}: ${v}`);
	}
	for (const m of contactMethods) {
		contactLines.push(`${m.title || m.platform}: ${m.href}`);
	}
	parts.push(`## КОНТАКТЫ\n\n${contactLines.join("\n")}`);

	const full = `${SITE_MAP}\n\n${parts.join("\n\n")}`;
	const compactParts = parts.filter((p) => !p.startsWith("## РАБОТЫ ПОДРОБНО") && !p.startsWith("## КАТАЛОГ РАБОТ"));
	const aboutIdx = compactParts.findIndex((p) => p.startsWith("## ОБО МНЕ"));
	compactParts.splice(aboutIdx + 1, 0, `## РАБОТЫ\n\n${compactWorks.join("\n\n")}`);
	return { full, compact: `${SITE_MAP}\n\n${compactParts.join("\n\n")}` };
}

async function getDocs() {
	const now = Date.now();
	if (cached && now - cached.at < TTL_MS) return cached.doc;
	const doc = await buildDoc();
	cached = { doc, at: now };
	return doc;
}

// Full dossier for the text chat.
export async function getAiKnowledge(): Promise<string> {
	return (await getDocs()).full;
}

// Compact dossier for the voice call (without full work descriptions).
export async function getAiKnowledgeCompact(): Promise<string> {
	return (await getDocs()).compact;
}

// Reset the dossier cache (call after content edits in the admin).
export function invalidateAiKnowledge() {
	cached = null;
}
