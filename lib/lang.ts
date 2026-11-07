import { cookies, headers } from "next/headers";
import type { KV } from "./content";
import { getUiTexts } from "./content";
import { translations, type Translations } from "./translations";

export type Lang = "ru" | "en" | "de";

export const LANGS: readonly Lang[] = ["ru", "en", "de"];

export async function getLang(): Promise<Lang> {
	// An explicit user choice (the switcher in the header) always takes priority.
	const stored = (await cookies()).get("lang")?.value;
	if (stored === "ru" || stored === "en" || stored === "de") return stored;

	// First visit: take the language from the browser. A guest from Asia or Europe immediately
	// gets a version they understand, not Russian "by default".
	return detectBrowserLang((await headers()).get("accept-language"));
}

// Parses the Accept-Language header ("de-CH,de;q=0.9,en;q=0.7") taking
// q-weights into account and returns the first supported language. Unknown languages (French, Chinese
// etc.) lead to English: for a guest from anywhere in the world it is clearer
// than Russian.
export function detectBrowserLang(header: string | null | undefined): Lang {
	if (!header) return "en";

	const ranked = header
		.split(",")
		.map((part) => {
			const [tag, ...params] = part.split(";");
			const qParam = params.find((p) => p.trim().startsWith("q="));
			const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
			return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
		})
		.filter((entry) => entry.tag.length > 0)
		.sort((a, b) => b.q - a.q);

	for (const { tag } of ranked) {
		// "ru-RU" → "ru". Skip "*": it says nothing about preference.
		const base = tag.split("-")[0];
		if (base === "ru" || base === "en" || base === "de") return base;
	}

	return "en";
}

// Text language heuristic for the AI assistant: whichever alphabet has more letters wins.
// We count letters (not just "is there Cyrillic") so that an English question with
// an inserted Russian work title is not detected as Russian.
// null - if there are no letters (only a link/digits/emoji): then take the site language.
export function detectTextLang(text: string): Lang | null {
	const cyr = (text.match(/[а-яё]/gi) ?? []).length;
	const lat = (text.match(/[a-z]/gi) ?? []).length;
	if (cyr === 0 && lat === 0) return null;
	return cyr > lat ? "ru" : "en";
}

// Removes a hard binding to one language from the prompt ("in Russian", "in English"
// etc.) so it does not conflict with the dynamic choice of the reply language.
export function stripLanguageLock(prompt: string): string {
	return prompt
		.replace(
			/[,;]?\s*(?:по-?русски|на\s+русском(?:\s+языке)?|in\s+Russian|по-?английски|на\s+английском(?:\s+языке)?|in\s+English)\b/gi,
			"",
		)
		.replace(/\s{2,}/g, " ")
		.replace(/\s+([,.;])/g, "$1");
}

// For a non-default lang: replaces each key's value with the key__<lang> value
// if it exists, falling back to the base (ru) value. Entries with a language
// suffix (__en / __de) are internal and stripped from the result.
const LANG_SUFFIX_RE = /__(en|de)$/;

export function withLang(t: KV, lang: Lang): KV {
	if (lang === "ru") return t;
	const result: KV = {};
	for (const [key, value] of Object.entries(t)) {
		if (LANG_SUFFIX_RE.test(key)) continue;
		result[key] = t[`${key}__${lang}`] ?? value;
	}
	return result;
}

// Builds a Translations object from DB ui_texts KV, falling back to translations.ts.
export function buildTranslations(raw: KV, lang: Lang): Translations {
	const langTexts = withLang(raw, lang);
	const fallback = translations[lang];
	return { ...fallback, ...langTexts } as Translations;
}

// Fetches UI texts from DB and returns a fully merged Translations object.
// Cached per request via getUiTexts(), so safe to call from multiple server components.
export async function getTranslations(lang: Lang): Promise<Translations> {
	const raw = await getUiTexts();
	return buildTranslations(raw, lang);
}
