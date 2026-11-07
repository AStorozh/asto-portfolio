import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { type AnalyticsLinkRow, type LinkGroupRow } from "./links-manager";
import { pageSeconds, secondsByPath, dailySeconds } from "@/lib/analytics-time";
import { type TrendSeries, type TrendValues } from "./trend-chart";
import { getVisits } from "@/lib/analytics-visits";
import { behaviorFrom, returnsStats, timeProfile } from "@/lib/analytics-insights";

// Dashboard data collection: about twenty queries and preparing the series for the charts.
// Extracted from the page so that only markup stays there; previously the queries and
// layout lived in one 660-line file.

async function rows<T = Record<string, unknown>>(q: ReturnType<typeof sql>): Promise<T[]> {
	return (await db.execute(q)) as unknown as T[];
}
const n = (v: unknown) => Number(v ?? 0);

// Period of the report: dates "from" and "to" inclusive (YYYY-MM-DD, UTC days); none = all time.
// The old ?range=7|30|90|all still works (the Sena API uses it).
export type Period = { from: string | null; to: string | null };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parsePeriod(sp: { range?: string; from?: string; to?: string }): Period {
	let from = sp.from && ISO_DAY.test(sp.from) ? sp.from : null;
	let to = sp.to && ISO_DAY.test(sp.to) ? sp.to : null;
	if (!from && !to && sp.range && sp.range !== "all") {
		const days = Math.max(1, Number(sp.range) || 30);
		from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
	}
	if (from && to && from > to) [from, to] = [to, from];
	return { from, to };
}

export function periodConds(p: Period): ReturnType<typeof sql>[] {
	const out: ReturnType<typeof sql>[] = [];
	if (p.from) out.push(sql`created_at >= ${`${p.from} 00:00:00`}::timestamp`);
	if (p.to) out.push(sql`created_at < (${p.to}::date + 1)::timestamp`);
	return out;
}

export async function loadDashboard(searchParams: Promise<{ range?: string; link?: string; from?: string; to?: string }>) {
	const sp = await searchParams;
	const scope = sp.link ?? "all"; // "all" | "direct" | <code>
	const period = parsePeriod(sp);
	const timeConds = periodConds(period);
	const periodQs = [period.from ? `&from=${period.from}` : "", period.to ? `&to=${period.to}` : ""].join("");
	const qs = (link: string) => `/admin/analytics?link=${link}${periodQs}`;
	const sheetId = process.env.GOOGLE_SHEET_ID;
	const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : "";

	// Link labels.
	const linkRows = await rows<AnalyticsLinkRow>(sql`
		select id, code, label, audience, tracking, target, group_id,
			(select count(distinct e.visitor_id) from future_face.analytics_events e where e.link_code = analytics_links.code) as visitors
		from future_face.analytics_links
		order by created_at
	`);
	const linkGroups = await rows<LinkGroupRow>(sql`
		select id, name from future_face.analytics_link_groups order by sort_order, id
	`);
	const trackedLinks = linkRows.filter((l) => l.tracking);
	const labelByCode = new Map(linkRows.map((l) => [l.code, l.label || l.code]));

	const timeCond = timeConds.length ? sql`where ${sql.join(timeConds, sql` and `)}` : sql``;

	// Per-link summary for the period (for the cards).
	const summaryRows = await rows<{
		link_code: string | null;
		visitors: number;
		real_visitors: number;
		resume: number;
		downloads: number;
		ai: number;
		contacts: number;
	}>(sql`
		select link_code,
			count(distinct visitor_id) as visitors,
			-- "live" = stayed on the page longer than a couple of seconds (has page_time)
			-- or clicked. The rest are mostly crawlers: opened and left.
			count(distinct visitor_id) filter (
				where type in ('page_time','resume_download','ai_message','ai_call','contact_click','ai_task','lang_switch')
			) as real_visitors,
			count(*) filter (where type='pageview' and path like '/resume%') as resume,
			count(*) filter (where type='resume_download') as downloads,
			count(*) filter (where type in ('ai_message','ai_call') or (type='pageview' and path='/ai-assistant')) as ai,
			count(*) filter (where type='contact_click') as contacts
		from future_face.analytics_events
		${timeCond}
		group by link_code
	`);
	const byCode = new Map<string, (typeof summaryRows)[number]>();
	for (const r of summaryRows) byCode.set(r.link_code ?? "__direct", r);
	const agg = (key: string) => byCode.get(key);

	// Labels with tracking turned off (e.g. "Me") are excluded from the overall totals, same
	// as in the Google Sheets export. The dashboard used to count them, so the numbers in the two
	// reports diverged.
	const noTrack = new Set(linkRows.filter((l) => !l.tracking).map((l) => l.code));
	const countedRows = summaryRows.filter((r) => !r.link_code || !noTrack.has(r.link_code));

	// Visitors cannot be summed across labels: one person arriving via two
	// links would be counted twice. Take an honest distinct count with a separate query.
	const visitorConds: ReturnType<typeof sql>[] = [];
	visitorConds.push(...timeConds);
	for (const code of noTrack) visitorConds.push(sql`link_code is distinct from ${code}`);
	const [allVisitors] = await rows<{ visitors: number; real_visitors: number }>(sql`
		select count(distinct visitor_id) as visitors,
			count(distinct visitor_id) filter (
				where type in ('page_time','resume_download','ai_message','ai_call','contact_click','ai_task','lang_switch')
			) as real_visitors
		from future_face.analytics_events
		${visitorConds.length ? sql`where ${sql.join(visitorConds, sql` and `)}` : sql``}
	`);

	const sumAll = countedRows.reduce(
		(a, r) => ({
			visitors: a.visitors,
			real_visitors: a.real_visitors,
			resume: a.resume + n(r.resume),
			downloads: a.downloads + n(r.downloads),
			ai: a.ai + n(r.ai),
			contacts: a.contacts + n(r.contacts),
		}),
		{ visitors: n(allVisitors?.visitors), real_visitors: n(allVisitors?.real_visitors), resume: 0, downloads: 0, ai: 0, contacts: 0 },
	);

	type Scope = { key: string; label: string; sub?: string; group?: number | null; s: { visitors: number; real_visitors: number; resume: number; downloads: number; ai: number; contacts: number } };
	const pick = (r?: (typeof summaryRows)[number]) => ({
		visitors: n(r?.visitors), real_visitors: n(r?.real_visitors), resume: n(r?.resume), downloads: n(r?.downloads), ai: n(r?.ai), contacts: n(r?.contacts),
	});
	const scopeCards: Scope[] = [
		{ key: "all", label: "Все", sub: "все источники", s: sumAll },
		...trackedLinks.map((l) => ({ key: l.code, label: l.label || l.code, sub: l.audience ?? undefined, group: l.group_id, s: pick(agg(l.code)) })),
		{ key: "direct", label: "Прямые", sub: "без метки", s: pick(agg("__direct")) },
	];

	// ── Detail filter for the selected link ───────────────────────────────────
	const conds = [] as ReturnType<typeof sql>[];
	conds.push(...timeConds);
	if (scope === "direct") conds.push(sql`link_code is null`);
	else if (scope !== "all") conds.push(sql`link_code = ${scope}`);
	const whereSql = (extra: ReturnType<typeof sql>[] = []) => {
		const all = [...conds, ...extra];
		return all.length ? sql`where ${sql.join(all, sql` and `)}` : sql``;
	};

	// ── Dynamics chart: by day and source ────────────────────────────────────
	// Count all sources at once (except untracked ones): the client builds both the total line
	// for the selected label and the per-link breakdown from this same data.
	const chartConds: ReturnType<typeof sql>[] = [];
	chartConds.push(...timeConds);
	for (const code of noTrack) chartConds.push(sql`link_code is distinct from ${code}`);
	const chartWhere = chartConds.length ? sql`where ${sql.join(chartConds, sql` and `)}` : sql``;

	const [dayRows, dayVisitRows, daySecRows] = await Promise.all([
		rows<{ d: string; k: string; views: number }>(sql`
			select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d,
				coalesce(link_code, '__direct') as k,
				count(*) filter (where type='pageview') as views
			from future_face.analytics_events ${chartWhere}
			group by 1, 2
		`),
		// Attribute a visit to the day it STARTED: otherwise a session that crossed
		// midnight would land in both days and the sum would exceed the number of visits.
		rows<{ d: string; k: string; visits: number }>(sql`
			select to_char(date_trunc('day', started), 'YYYY-MM-DD') as d, k, count(*) as visits
			from (
				select session_id, coalesce(max(link_code), '__direct') as k, min(created_at) as started
				from future_face.analytics_events ${chartWhere}${chartConds.length ? sql` and ` : sql`where `}session_id is not null and session_id <> ''
				group by session_id
			) s
			group by 1, 2
		`),
		dailySeconds(chartConds),
	]);

	// The day axis is continuous, without gaps: in a line chart a hole in the dates lies
	// more than a zero does.
	const dayKeys = [
		...new Set([...dayRows.map((r) => r.d), ...dayVisitRows.map((r) => r.d), ...daySecRows.map((r) => r.d)]),
	].sort();
	const chartDays: string[] = [];
	if (dayKeys.length) {
		const from = new Date(`${period.from ?? dayKeys[0]}T00:00:00Z`);
		const today = new Date();
		const end = period.to ? new Date(Math.min(new Date(`${period.to}T00:00:00Z`).getTime(), today.getTime())) : today;
		for (let t = from; t <= end; t.setUTCDate(t.getUTCDate() + 1)) {
			chartDays.push(t.toISOString().slice(0, 10));
		}
	}
	const dayIndex = new Map(chartDays.map((d, i) => [d, i]));

	// A color is tied to a source by its position in the links list and does not depend
	// on how many series are currently shown (the palette was checked with a validator).
	const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
	const chartSeries: TrendSeries[] = [
		...trackedLinks.map((l, i) => ({ key: l.code, label: l.label || l.code, color: PALETTE[i % PALETTE.length] })),
		{ key: "__direct", label: "Прямые", color: PALETTE[trackedLinks.length % PALETTE.length] },
	];
	const chartValues: TrendValues = {};
	for (const s of chartSeries) chartValues[s.key] = chartDays.map(() => ({ views: 0, visits: 0, secs: 0 }));
	for (const r of dayRows) {
		const i = dayIndex.get(r.d);
		const cell = i != null ? chartValues[r.k]?.[i] : undefined;
		if (cell) cell.views = n(r.views);
	}
	for (const r of dayVisitRows) {
		const i = dayIndex.get(r.d);
		const cell = i != null ? chartValues[r.k]?.[i] : undefined;
		if (cell) cell.visits = n(r.visits);
	}
	for (const r of daySecRows) {
		const i = dayIndex.get(r.d);
		const cell = i != null ? chartValues[r.k]?.[i] : undefined;
		if (cell) cell.secs = n(r.secs);
	}
	const chartLabels = chartDays.map((d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`);

	// Daily series of views for the selected slice - used to compute "average per view".
	const series = chartDays.map((d, i) => ({
		day: chartLabels[i],
		views:
			scope === "all"
				? chartSeries.reduce((a, s) => a + (chartValues[s.key]?.[i]?.views ?? 0), 0)
				: chartValues[scope === "direct" ? "__direct" : scope]?.[i]?.views ?? 0,
	}));

	// Time on pages. Computed from increments within a visit (page_time events are
	// cumulative) - see lib/analytics-time.ts.
	const secRowsAll = await pageSeconds(timeConds);
	const secRowsScope = secRowsAll.filter((r) =>
		scope === "all" ? !r.link_code || !noTrack.has(r.link_code) : scope === "direct" ? !r.link_code : r.link_code === scope,
	);
	const secByPath = secondsByPath(secRowsScope);
	const totalSecs = secRowsScope.reduce((a, r) => a + r.secs, 0);

	const topPages = await rows<{ path: string; views: number }>(sql`
		select path, count(*) as views from future_face.analytics_events
		${whereSql([sql`type='pageview'`])} group by path order by views desc limit 8
	`);
	const topWorks = await rows<{ path: string; views: number }>(sql`
		select path, count(*) as views from future_face.analytics_events
		${whereSql([sql`type='pageview'`, sql`path like '/works/%'`])} group by path order by views desc limit 6
	`);
	const sources = await rows<{ src: string; visits: number }>(sql`
		select coalesce(nullif(referrer,''),'—') as src, count(*) as visits from future_face.analytics_events
		${whereSql([sql`type='pageview'`])} group by src order by visits desc limit 6
	`);
	const devices = await rows<{ device: string; visitors: number }>(sql`
		select coalesce(nullif(device,''),'—') as device, count(distinct visitor_id) as visitors
		from future_face.analytics_events ${whereSql([sql`visitor_id is not null`])} group by device order by visitors desc
	`);
	const geo = await rows<{ country: string; visitors: number }>(sql`
		select coalesce(nullif(country,''),'—') as country, count(distinct visitor_id) as visitors
		from future_face.analytics_events ${whereSql([sql`visitor_id is not null`])} group by country order by visitors desc limit 6
	`);
	const [funnel] = await rows(sql`
		select count(distinct visitor_id) as v_all,
			count(distinct visitor_id) filter (where type='pageview' and path like '/resume%') as v_resume,
			count(distinct visitor_id) filter (where type in ('resume_download','ai_message','ai_call','contact_click')) as v_action
		from future_face.analytics_events ${whereSql()}
	`);
	// Each visit separately: route through the pages, time, label, actions.
	// We take all visits of the period - behavioral metrics are computed from them too,
	// while the table shows only the latest ones.
	const visits = await getVisits({ timeConds, scope, limit: 1000, skipCodes: noTrack });
	const behavior = behaviorFrom(visits);
	const [returns, times] = await Promise.all([returnsStats(conds), timeProfile(conds)]);
	const maxHour = Math.max(1, ...times.hours);
	const maxDay = Math.max(1, ...times.days);

	const recent = await rows<{ created_at: string; type: string; path: string | null; link_code: string | null; device: string | null; meta: string | null }>(sql`
		select created_at, type, path, link_code, device, meta from future_face.analytics_events
		${whereSql()} order by created_at desc limit 30
	`);

	const scopeLabel = scope === "all" ? "Все источники" : scope === "direct" ? "Прямые заходы" : (labelByCode.get(scope) ?? scope);
	// For a link without a card (e.g. "Me" with tracking off - it can only be
	// reached by a direct address) we take its own numbers rather than the overall ones:
	// otherwise it would look like it had collected the site's entire statistics.
	const cur = scopeCards.find((c) => c.key === scope)?.s ?? (scope === "all" ? sumAll : pick(agg(scope)));

	const kpis = [
		{ label: "Посетители", value: cur.visitors },
		// Bots have been filtered since October 2026; old data has many of them, so
		// next to it we show those who actually lingered or clicked something.
		{ label: "Из них живые", value: cur.real_visitors },
		{ label: "Просмотры резюме", value: cur.resume, accent: true },
		{ label: "Скачивания резюме", value: cur.downloads, accent: true },
		{ label: "AI (откр./сообщ./звонки)", value: cur.ai },
		{ label: "Клики по контактам", value: cur.contacts, accent: true },
	];

	// Time: how much was spent on pages of this slice in total and how much on average
	// per view. Previously time was only in the Google Sheet.
	const scopeViews = series.reduce((a, d) => a + n(d.views), 0);
	const avgSecs = scopeViews > 0 ? Math.round(totalSecs / scopeViews) : 0;
	const fmtTime = (secs: number) => {
		if (secs <= 0) return "—";
		if (secs < 60) return `${secs} с`;
		const m = Math.floor(secs / 60);
		if (m < 60) return `${m} мин ${secs % 60} с`;
		return `${Math.floor(m / 60)} ч ${m % 60} мин`;
	};

	return {
		scope,
		period,
		qs,
		linkGroups,
		sheetUrl,
		linkRows,
		labelByCode,
		scopeCards,
		chartDays,
		chartSeries,
		chartValues,
		chartLabels,
		secByPath,
		totalSecs,
		topPages,
		topWorks,
		sources,
		devices,
		geo,
		funnel,
		visits,
		behavior,
		returns,
		times,
		maxHour,
		maxDay,
		recent,
		scopeLabel,
		kpis,
		avgSecs,
		fmtTime,
	};
}
