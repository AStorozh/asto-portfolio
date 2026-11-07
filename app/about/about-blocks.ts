export const aboutBlocks = [
	{ slug: "kto-ya",       title: "КТО Я",                 num: 1 },
	{ slug: "chem-polezen", title: "ЧЕМ ПОЛЕЗЕН",           num: 2 },
	{ slug: "opyt",         title: "ОПЫТ",                   num: 3 },
	{ slug: "galereya",     title: "ГАЛЕРЕЯ",                num: 4 }, // tall block on the right spanning all three rows
	{ slug: "interesy",     title: "ИНТЕРЕСЫ",               num: 5 },
	{ slug: "seychas",      title: "СЕЙЧАС",                 num: 0 }, // quote - the number is not displayed
	{ slug: "navyki",       title: "НАВЫКИ / ИНСТРУМЕНТЫ",  num: 7 },
	{ slug: "hobi",         title: "ХОББИ",                  num: 6 }, // AI assistant
] as const;

export type AboutBlock = (typeof aboutBlocks)[number];

export function getAboutBlockBySlug(slug: string): AboutBlock | undefined {
	return aboutBlocks.find((b) => b.slug === slug);
}
