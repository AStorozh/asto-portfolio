// Cyrillic transliteration + normalization into a URL slug.
// Used both on the client (live hint from the title) and on the server.
const translit: Record<string, string> = {
	а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
	з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
	п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
	ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
	return (input ?? "")
		.toLowerCase()
		.split("")
		.map((ch) => translit[ch] ?? ch)
		.join("")
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}
