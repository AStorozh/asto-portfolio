// Chart kinds for a work description (see work-charts.tsx). A separate file without
// "use client" so that text parsing works on the server too.
export const CHART_KINDS = [
	"stats",
	"bars",
	"columns",
	"donut",
	"progress",
	"line",
	"flow",
	"compare",
	"funnel",
	"timeline",
	"waffle",
	"layers",
	"stacked",
	"radar",
	"gauge",
	"heatmap",
	"tree",
	"cycle",
	"checklist",
	"scatter",
	"sparklines",
	"network",
	"sequence",
] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export function isChartKind(s: string): s is ChartKind {
	return (CHART_KINDS as readonly string[]).includes(s);
}

// Templates for the admin buttons.
export const CHART_TEMPLATES: Record<ChartKind, { label: string; text: string }> = {
	stats: { label: "Цифры", text: "```stats\n3201 | автотест, все проходят\n131 | инструмент для агента\n44 | таблицы в базе\n```" },
	bars: { label: "Столбцы", text: "```bars\n# Заголовок\nЧтение | 36\nЗапись | 95\n```" },
	donut: { label: "Кольцо", text: "```donut\n# Заголовок\nЧтение | 36\nЗапись | 95\n```" },
	line: { label: "Линия", text: "```line\n# Заголовок\nЯнв | 12\nФев | 18\nМар | 25\nАпр | 31\n```" },
	flow: { label: "Шаги", text: "```flow\n# Заголовок\nЗапрос | MCP, REST или чат\nПроверка | права и данные\nДействие | запись в базу\nЖурнал | аудит\n```" },
	compare: { label: "Было / стало", text: "```compare\n# Заголовок\nБыло | 100\nСтало | 26\n```" },
	columns: { label: "Колонки", text: "```columns\n# Заголовок\nПн | 12\nВт | 18\nСр | 9\nЧт | 24\nПт | 15\n```" },
	progress: { label: "Проценты", text: "```progress\n# Заголовок\nТесты проходят | 100%\nКейсы в норме | 97%\nГотово | 47/50\n```" },
	funnel: { label: "Воронка", text: "```funnel\n# Заголовок\nВакансии | 1200\nПодходят | 340\nОтклики | 85\nСобеседования | 12\n```" },
	timeline: { label: "Хронология", text: "```timeline\n# Заголовок\n13 окт | Первая версия\n17 окт | Программа для Mac\n20 окт | Приложение для Android\n1 ноя | Публикация\n```" },
	waffle: { label: "Сетка 100", text: "```waffle\n# Заголовок\nКод | 136\nТесты | 48\n```" },
	layers: { label: "Слои", text: "```layers\n# Заголовок\nИнтерфейс | окно Mac и телефон\nAPI | MCP, REST, чат\nЛогика | сервисы\nБаза | PGlite\n```" },
	stacked: { label: "Доли", text: "```stacked\n# Заголовок\nЧтение | 36\nЗапись | 95\n```" },
	radar: { label: "Паутинка", text: "```radar\n# Заголовок\nАгенты | 9\nДанные | 8\nИнтеграции | 9\nИнтерфейс | 7\nТесты | 8\n```" },
	gauge: { label: "Спидометр", text: "```gauge\n# Заголовок\nКейсы в норме | 97%\nЗагрузка | 64%\n```" },
	heatmap: { label: "Тепловая карта", text: "```heatmap\n# Заголовок\nПн | 0 2 5 3 1 4 6\nВт | 1 3 2 6 4 2 1\nСр | 4 5 7 3 2 0 2\n```" },
	tree: { label: "Дерево", text: "```tree\n# Заголовок\nПроект\n- Модуль | описание\n-- Часть\n- Модуль\n```" },
	cycle: { label: "Цикл", text: "```cycle\n# Заголовок\nПлан | цели\nДействие | работа\nОбзор | итоги\nПоправка | выводы\n```" },
	checklist: { label: "Чек-лист", text: "```checklist\n# Заголовок\nСделано | +\nСделано с пояснением | детали\nЕщё нет | -\n```" },
	scatter: { label: "Точки", text: "```scatter\n# Заголовок\nx | Сложность\ny | Польза\nПроект A | 3, 8\nПроект B | 7, 6\nПроект C | 5, 3\n```" },
	sparklines: { label: "Мини-графики", text: "```sparklines\n# Заголовок\nПоказатель | 3 5 4 8 12\nДругой | 20 18 15 11 9\n```" },
	network: { label: "Сеть", text: "```network\n# Заголовок\nЦентр -> Узел 1 | связь\nЦентр -> Узел 2\nЦентр -> Узел 3\nУзел 1 -> Узел 2\n```" },
	sequence: { label: "Последовательность", text: "```sequence\n# Заголовок\nКлиент -> Сервер | запрос\nСервер -> База | чтение\nБаза -> Сервер | данные\nСервер -> Клиент | ответ\n```" },
};
