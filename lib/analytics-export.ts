import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { writeSheets } from "@/lib/google-sheets";
import { pageSeconds, secondsByLink, secondsByLinkPath } from "@/lib/analytics-time";
import { getVisits } from "@/lib/analytics-visits";
import { behaviorFrom, returnsStats, timeProfile, DAY_NAMES } from "@/lib/analytics-insights";

async function rows<T = Record<string, unknown>>(q: ReturnType<typeof sql>): Promise<T[]> {
	return (await db.execute(q)) as unknown as T[];
}
const n = (v: unknown) => Number(v ?? 0);
const mins = (secs: number) => Math.round((secs / 60) * 10) / 10;

// Page classification by key type.
function pageType(path: string): string {
	if (path === "/") return "Главная";
	if (path.startsWith("/works")) return "Работы";
	if (path.startsWith("/resume")) return "Резюме";
	if (path.startsWith("/ai-assistant")) return "AI";
	if (path.startsWith("/contacts")) return "Контакты";
	if (path.startsWith("/products")) return "Продукты";
	if (path.startsWith("/about/personal")) return "Галерея";
	if (path.startsWith("/about")) return "Обо мне";
	return "Прочее";
}

// Summing numeric meta. Suitable for events with a ONE-TIME value
// (call duration, request cost). Not for page_time - it is
// cumulative, see lib/analytics-time.ts.
const intSum = (type: string, extra = "") =>
	sql.raw(
		`sum(case when type='${type}'${extra} and meta ~ '^[0-9]+$' then meta::int else 0 end)`,
	);

type Src = { key: string; label: string };

export async function exportAnalyticsToSheet(): Promise<{ ok: boolean; error?: string }> {
	const sheetId = process.env.GOOGLE_SHEET_ID;
	if (!sheetId) return { ok: false, error: "GOOGLE_SHEET_ID не задан в .env.local" };

	try {
		// Sources: All + each link with tracking enabled + Direct.
		const links = await rows<{ code: string; label: string; tracking: boolean }>(sql`
			select code, label, tracking from future_face.analytics_links order by created_at
		`);
		const tracked = links.filter((l) => l.tracking);
		const noTrack = new Set(links.filter((l) => !l.tracking).map((l) => l.code));
		const sources: Src[] = [
			{ key: "all", label: "Все" },
			...tracked.map((l) => ({ key: l.code, label: l.label || l.code })),
			{ key: "__direct", label: "Прямые" },
		];
		// ── Summary by source ─────────────────────────────────────────────────
		const sum = await rows<{
			src: string;
			visitors: number;
			downloads: number;
			contacts: number;
			ai_messages: number;
			ai_calls: number;
			total_secs: number;
			ai_secs: number;
			call_secs: number;
		}>(sql`
			select coalesce(link_code, '__direct') as src,
				count(distinct visitor_id) as visitors,
				count(*) filter (where type='resume_download') as downloads,
				count(*) filter (where type='contact_click') as contacts,
				count(*) filter (where type='ai_message') as ai_messages,
				count(*) filter (where type='ai_call') as ai_calls,
				${intSum("ai_call_end")} as call_secs
			from future_face.analytics_events
			group by 1
		`);

		// Time on pages - a separate query with reconstruction of increments.
		const secRows = await pageSeconds();
		const secByLink = secondsByLink(secRows);
		const secByLinkPath = secondsByLinkPath(secRows);
		const aiSecByLink = new Map<string, number>();
		for (const r of secRows) {
			if (r.path !== "/ai-assistant") continue;
			const k = r.link_code ?? "__direct";
			aiSecByLink.set(k, (aiSecByLink.get(k) ?? 0) + r.secs);
		}
		for (const r of sum) {
			r.total_secs = secByLink.get(r.src) ?? 0;
			r.ai_secs = aiSecByLink.get(r.src) ?? 0;
		}
		const sumBySrc = new Map(sum.map((r) => [r.src, r]));
		const sumAll = sum
			.filter((r) => !noTrack.has(r.src))
			.reduce(
			(a, r) => ({
				visitors: a.visitors + n(r.visitors),
				downloads: a.downloads + n(r.downloads),
				contacts: a.contacts + n(r.contacts),
				ai_messages: a.ai_messages + n(r.ai_messages),
				ai_calls: a.ai_calls + n(r.ai_calls),
				total_secs: a.total_secs + n(r.total_secs),
				ai_secs: a.ai_secs + n(r.ai_secs),
				call_secs: a.call_secs + n(r.call_secs),
			}),
			{ visitors: 0, downloads: 0, contacts: 0, ai_messages: 0, ai_calls: 0, total_secs: 0, ai_secs: 0, call_secs: 0 },
		);
		const sumFor = (key: string) =>
			key === "all" ? sumAll : sumBySrc.get(key) ?? { visitors: 0, downloads: 0, contacts: 0, ai_messages: 0, ai_calls: 0, total_secs: 0, ai_secs: 0, call_secs: 0 };

		const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
		const summaryValues: (string | number)[][] = [
			["Источник", "Посетители", "Скачиваний резюме", "Кликов по контактам", "Сообщений в чат AI", "Голосовых звонков AI", "Время на странице AI, мин", "Длительность звонков, мин", "Общее время на сайте, мин", "", "Обновлено:", now],
			...sources.map((s) => {
				const r = sumFor(s.key);
				return [
					s.label,
					n(r.visitors),
					n(r.downloads),
					n(r.contacts),
					n(r.ai_messages),
					n(r.ai_calls),
					mins(n(r.ai_secs)),
					mins(n(r.call_secs)),
					mins(n(r.total_secs)),
				];
			}),
		];

		// ── Pages (all pages and views) ───────────────────────────────────────
		const pageViewRows = await rows<{ src: string; path: string; views: number }>(sql`
			select coalesce(link_code, '__direct') as src, path,
				count(*) filter (where type='pageview') as views
			from future_face.analytics_events
			where path is not null and path not like '/admin%'
			group by 1, 2
		`);
		// Pages that have time but no views (the visit began before the edits) are needed too.
		const pageKeys = new Set(pageViewRows.map((r) => `${r.src}|${r.path}`));
		const pageRows: { src: string; path: string; views: number; secs: number }[] = pageViewRows.map((r) => ({
			src: r.src,
			path: r.path,
			views: n(r.views),
			secs: secByLinkPath.get(`${r.src}|${r.path}`) ?? 0,
		}));
		for (const r of secRows) {
			const src = r.link_code ?? "__direct";
			const key = `${src}|${r.path ?? ""}`;
			if (r.path && !pageKeys.has(key)) pageRows.push({ src, path: r.path, views: 0, secs: r.secs });
		}
		// "All" aggregate per page (excluding sources with tracking turned off).
		const allPages = new Map<string, { views: number; secs: number }>();
		for (const r of pageRows) {
			if (noTrack.has(r.src)) continue;
			const cur = allPages.get(r.path) ?? { views: 0, secs: 0 };
			cur.views += n(r.views);
			cur.secs += n(r.secs);
			allPages.set(r.path, cur);
		}
		const pagesBySrc = new Map<string, { path: string; views: number; secs: number }[]>();
		for (const r of pageRows) {
			const arr = pagesBySrc.get(r.src) ?? [];
			arr.push({ path: r.path, views: n(r.views), secs: n(r.secs) });
			pagesBySrc.set(r.src, arr);
		}
		const pageBase = (process.env.SITE_URL || "https://asto-portfolio.ru").replace(/\/$/, "");
		const pagesValues: (string | number)[][] = [
			["Источник", "Страница", "Ссылка", "Тип страницы", "", "Просмотры", "Время на странице, мин"],
		];
		for (const s of sources) {
			const list =
				s.key === "all"
					? [...allPages.entries()].map(([path, v]) => ({ path, ...v }))
					: pagesBySrc.get(s.key) ?? [];
			list
				.filter((p) => p.views > 0 || p.secs > 0)
				.sort((a, b) => b.views - a.views)
				.forEach((p) =>
					pagesValues.push([s.label, p.path, pageBase + p.path, pageType(p.path), "", p.views, mins(p.secs)]),
				);
		}

		// ── Contacts (all contacts and clicks) ────────────────────────────────
		const contactRows = await rows<{ src: string; contact: string; clicks: number }>(sql`
			select coalesce(link_code, '__direct') as src, coalesce(nullif(meta, ''), '—') as contact, count(*) as clicks
			from future_face.analytics_events where type='contact_click' group by 1, 2
		`);
		const allContacts = new Map<string, number>();
		for (const r of contactRows) {
			if (noTrack.has(r.src)) continue;
			allContacts.set(r.contact, (allContacts.get(r.contact) ?? 0) + n(r.clicks));
		}
		const contactsBySrc = new Map<string, { contact: string; clicks: number }[]>();
		for (const r of contactRows) {
			const arr = contactsBySrc.get(r.src) ?? [];
			arr.push({ contact: r.contact, clicks: n(r.clicks) });
			contactsBySrc.set(r.src, arr);
		}
		const contactsValues: (string | number)[][] = [["Источник", "Контакт", "", "Кликов по контакту"]];
		for (const s of sources) {
			const list =
				s.key === "all"
					? [...allContacts.entries()].map(([contact, clicks]) => ({ contact, clicks }))
					: contactsBySrc.get(s.key) ?? [];
			list
				.sort((a, b) => b.clicks - a.clicks)
				.forEach((c) => contactsValues.push([s.label, c.contact, "", c.clicks]));
		}

		// ── AI assistant ──────────────────────────────────────────────────────
		const REALTIME_USD_PER_MIN = 0.1; // approximate price per minute of a voice call
		const usd4 = (micro: number) => Math.round((micro / 1e6) * 10000) / 10000;

		const aiSum = await rows<{
			src: string;
			opens: number;
			messages: number;
			tasks: number;
			calls: number;
			call_secs: number;
			ai_secs: number;
			cost_micro: number;
		}>(sql`
			select coalesce(link_code, '__direct') as src,
				count(*) filter (where type='pageview' and path='/ai-assistant') as opens,
				count(*) filter (where type='ai_message') as messages,
				count(*) filter (where type='ai_task') as tasks,
				count(*) filter (where type='ai_call') as calls,
				${intSum("ai_call_end")} as call_secs,
				${intSum("ai_cost")} as cost_micro
			from future_face.analytics_events group by 1
		`);
		for (const r of aiSum) r.ai_secs = aiSecByLink.get(r.src) ?? 0;
		const aiBySrc = new Map(aiSum.map((r) => [r.src, r]));
		const aiAll = aiSum
			.filter((r) => !noTrack.has(r.src))
			.reduce(
				(a, r) => ({
					opens: a.opens + n(r.opens),
					messages: a.messages + n(r.messages),
					tasks: a.tasks + n(r.tasks),
					calls: a.calls + n(r.calls),
					call_secs: a.call_secs + n(r.call_secs),
					ai_secs: a.ai_secs + n(r.ai_secs),
					cost_micro: a.cost_micro + n(r.cost_micro),
				}),
				{ opens: 0, messages: 0, tasks: 0, calls: 0, call_secs: 0, ai_secs: 0, cost_micro: 0 },
			);
		const aiFor = (key: string) =>
			key === "all" ? aiAll : aiBySrc.get(key) ?? { opens: 0, messages: 0, tasks: 0, calls: 0, call_secs: 0, ai_secs: 0, cost_micro: 0 };

		// Where people come to the AI from (previous page).
		const fromRows = await rows<{ src: string; from_path: string; cnt: number }>(sql`
			select coalesce(link_code, '__direct') as src,
				coalesce(nullif(meta, ''), '(прямой / внешний переход)') as from_path,
				count(*) as cnt
			from future_face.analytics_events
			where type='pageview' and path='/ai-assistant'
			group by 1, 2
		`);
		const allFrom = new Map<string, number>();
		for (const r of fromRows) {
			if (noTrack.has(r.src)) continue;
			allFrom.set(r.from_path, (allFrom.get(r.from_path) ?? 0) + n(r.cnt));
		}
		const fromBySrc = new Map<string, { from_path: string; cnt: number }[]>();
		for (const r of fromRows) {
			const arr = fromBySrc.get(r.src) ?? [];
			arr.push({ from_path: r.from_path, cnt: n(r.cnt) });
			fromBySrc.set(r.src, arr);
		}

		// Left table - AI summary.
		const leftHeader: (string | number)[] = [
			"Источник", "", "Заходов на AI", "Сообщений", "Задач", "Звонков", "Длит. звонков, мин", "Время на AI, мин", "", "Стоимость чата, $", "Стоимость звонков, $",
		];
		const leftRows: (string | number)[][] = [
			leftHeader,
			...sources.map((s) => {
				const r = aiFor(s.key);
				return [
					s.label,
					"",
					n(r.opens),
					n(r.messages),
					n(r.tasks),
					n(r.calls),
					mins(n(r.call_secs)),
					mins(n(r.ai_secs)),
					"",
					usd4(n(r.cost_micro)),
					Math.round((n(r.call_secs) / 60) * REALTIME_USD_PER_MIN * 10000) / 10000,
				];
			}),
		];

		// Right table - where people come to the AI from (as separate columns).
		const rightHeader: (string | number)[] = ["Источник", "", "Откуда пришли (страница)", "Переходов"];
		const rightRows: (string | number)[][] = [rightHeader];
		for (const s of sources) {
			const list =
				s.key === "all"
					? [...allFrom.entries()].map(([from_path, cnt]) => ({ from_path, cnt }))
					: fromBySrc.get(s.key) ?? [];
			list.sort((a, b) => b.cnt - a.cnt).forEach((f) => rightRows.push([s.label, "", f.from_path, f.cnt]));
		}

		// Glue side by side: summary on the left, an empty separator column, "from where" on the right.
		const blanksL = Array(leftHeader.length).fill("");
		const blanksR = Array(rightHeader.length).fill("");
		const aiValues: (string | number)[][] = [];
		const maxLen = Math.max(leftRows.length, rightRows.length);
		for (let i = 0; i < maxLen; i++) {
			const row: (string | number)[] = [...(leftRows[i] ?? blanksL), "", ...(rightRows[i] ?? blanksR)];
			aiValues.push(row);
		}

		// ── Visits: each visit as a separate row ──────────────────────────────
		const visits = await getVisits({ days: null, scope: "all", limit: 2000, skipCodes: noTrack });
		const labelOf = (code: string | null) =>
			code ? (links.find((l) => l.code === code)?.label || code) : "Прямой";
		const dt = (iso: string) =>
			new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

		const visitValues: (string | number)[][] = [
			[
				"Когда (МСК)", "Источник", "Гость", "Повторный", "Устройство", "Страна", "Язык",
				"Откуда пришёл", "Страниц", "Время на сайте, мин", "Скачал резюме", "Кликов по контактам",
				"Сообщений AI", "Звонков AI", "Маршрут по страницам",
			],
			...visits.slice(0, 500).map((v) => [
				dt(v.started),
				labelOf(v.link_code),
				v.visitor,
				v.returning ? "да" : "",
				v.device ?? "",
				v.country ?? "",
				v.lang ?? "",
				v.referrer ?? "",
				v.pages.length,
				mins(v.secs),
				v.downloads,
				v.contacts,
				v.ai_messages,
				v.ai_calls,
				v.pages.map((p) => p.path).join(" → "),
			]),
		];

		// The same slice row by row - handy for building pivot tables by visit page.
		const visitPageValues: (string | number)[][] = [
			["Когда (МСК)", "Источник", "Гость", "Шаг", "Страница", "Открывал раз", "Время на странице, мин"],
		];
		for (const v of visits.slice(0, 500)) {
			v.pages.forEach((p, i) =>
				visitPageValues.push([dt(v.started), labelOf(v.link_code), v.visitor, i + 1, p.path, p.views, mins(p.secs)]),
			);
		}

		// ── Behavior: bounces, depth, path to action, returns, time of day ────
		const [ret, times] = await Promise.all([returnsStats(), timeProfile()]);
		const bySource = new Map<string, typeof visits>();
		for (const v of visits) {
			const key = v.link_code ?? "__direct";
			bySource.set(key, [...(bySource.get(key) ?? []), v]);
		}
		const behaviorValues: (string | number)[][] = [
			[
				"Источник", "Визитов", "Отказы, %", "Страниц за визит", "Время за визит, мин",
				"Дошли до действия, %", "Визитов с действием", "Страниц до действия", "Время до действия, мин",
			],
		];
		for (const src of sources) {
			const list = src.key === "all" ? visits : bySource.get(src.key) ?? [];
			const b = behaviorFrom(list);
			behaviorValues.push([
				src.label, b.visits, b.bounceRate, b.avgPages, mins(b.avgSecs),
				b.actionRate, b.withAction, b.pagesToAction, mins(b.secsToAction),
			]);
		}
		const all = behaviorFrom(visits);
		behaviorValues.push([], ["Где уходят — последняя страница визита"], ["Страница", "Уходов", "Доля, %"]);
		for (const e of all.exits.slice(0, 20)) {
			behaviorValues.push([e.path, e.count, all.visits ? Math.round((e.count / all.visits) * 100) : 0]);
		}
		behaviorValues.push([], ["Возвраты (гость = суточный анонимный хэш, возврат на другой день считается новым гостем)"]);
		behaviorValues.push(["Гостей", ret.visitors], ["Приходили снова", ret.repeat], ["Доля повторных, %", ret.repeatRate], ["Визитов на гостя", ret.avgVisits]);
		behaviorValues.push([], ["Часы активности (МСК)"], ["Час", "Просмотров"]);
		times.hours.forEach((v, h) => behaviorValues.push([`${String(h).padStart(2, "0")}:00`, v]));
		behaviorValues.push([], ["Дни недели"], ["День", "Просмотров"]);
		times.days.forEach((v, i) => behaviorValues.push([DAY_NAMES[i], v]));

		await writeSheets(sheetId, [
			{ title: "Сводка", values: summaryValues },
			{ title: "AI-ассистент", values: aiValues },
			{ title: "Страницы", values: pagesValues },
			{ title: "Контакты", values: contactsValues },
			{ title: "Визиты", values: visitValues },
			{ title: "Визиты — страницы", values: visitPageValues },
			{ title: "Поведение", values: behaviorValues },
		]);

		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "Неизвестная ошибка" };
	}
}
