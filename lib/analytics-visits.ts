// Visits: one entry to the site = one session (session_id lives in the tab until it
// is closed). For each visit we build a route through the pages with the time on
// each, the label, the device and target actions - this is what was never shown
// before: there were only "views/visitors" aggregates.

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionPageSeconds } from "@/lib/analytics-time";

// at - when the page was first opened (the route is built from it),
// last_at - when the last event on it happened (the exit is determined from it).
export type VisitPage = { path: string; secs: number; views: number; at: string; last_at: string };

export type Visit = {
	session_id: string;
	visitor: string; // short anonymous guest identifier (hash, not personal data)
	started: string;
	ended: string;
	link_code: string | null;
	device: string | null;
	lang: string | null;
	country: string | null;
	referrer: string | null;
	views: number;
	secs: number;
	downloads: number;
	contacts: number;
	ai_messages: number;
	ai_calls: number;
	call_secs: number;
	outbound: string[]; // external links followed out (GitHub, project sites)
	first_action_at: string | null; // first target action of the visit
	pages: VisitPage[];
	returning: boolean; // this same guest has visited before
};

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

async function rows<T = Row>(q: SQL): Promise<T[]> {
	return (await db.execute(q)) as unknown as T[];
}

// scope: "all" | "direct" | label code. days: null = all time.
export async function getVisits(opts: {
	days?: number | null;
	timeConds?: SQL[]; // period conditions on created_at; take precedence over days
	scope?: string;
	limit?: number;
	skipCodes?: Set<string>;
}): Promise<Visit[]> {
	const { days = null, scope = "all", limit = 100, skipCodes = new Set<string>() } = opts;
	const timeConds: SQL[] = opts.timeConds ?? (days ? [sql`created_at >= now() - make_interval(days => ${days})`] : []);

	const conds: SQL[] = [sql`session_id is not null`, sql`session_id <> ''`, ...timeConds];
	if (scope === "direct") conds.push(sql`link_code is null`);
	else if (scope !== "all") conds.push(sql`link_code = ${scope}`);
	else for (const code of skipCodes) conds.push(sql`link_code is distinct from ${code}`);
	const where = sql`where ${sql.join(conds, sql` and `)}`;

	const sessions = await rows<{
		session_id: string;
		visitor_id: string | null;
		started: string;
		ended: string;
		link_code: string | null;
		device: string | null;
		lang: string | null;
		country: string | null;
		referrer: string | null;
		views: number;
		downloads: number;
		contacts: number;
		ai_messages: number;
		ai_calls: number;
		call_secs: number;
		outbound: string[] | null;
		first_action_at: string | null;
	}>(sql`
		select session_id,
			min(visitor_id) as visitor_id,
			min(created_at) as started,
			max(created_at) as ended,
			max(link_code) as link_code,
			max(device) as device,
			max(lang) as lang,
			max(country) as country,
			-- first EXTERNAL referrer of the visit: internal navigation is not a source
			(array_agg(referrer order by created_at) filter (
				where type='pageview' and referrer is not null and referrer <> ''
				  and referrer not like '%asto-portfolio.ru%' and referrer not like '%localhost%'
			))[1] as referrer,
			count(*) filter (where type='pageview') as views,
			count(*) filter (where type='resume_download') as downloads,
			count(*) filter (where type='contact_click') as contacts,
			count(*) filter (where type='ai_message') as ai_messages,
			count(*) filter (where type='ai_call') as ai_calls,
			sum(case when type='ai_call_end' and meta ~ '^[0-9]+$' then meta::int else 0 end) as call_secs,
			array_agg(distinct meta) filter (where type='outbound_click' and meta is not null) as outbound,
			min(created_at) filter (
				where type in ('resume_download','contact_click','ai_message','ai_call')
			) as first_action_at
		from future_face.analytics_events
		${where}
		group by session_id
		order by min(created_at) desc
		limit ${limit}
	`);
	if (sessions.length === 0) return [];

	const ids = sessions.map((s) => s.session_id);

	// Visit pages: when first opened and how many times returned to.
	const pageRows = await rows<{ session_id: string; path: string; at: string; last_at: string; views: number }>(sql`
		select session_id, path, min(created_at) as at, max(created_at) as last_at,
			count(*) filter (where type='pageview') as views
		from future_face.analytics_events
		where session_id in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
			and path is not null
		group by 1, 2
	`);

	// Time on the visit's pages - as increments (page_time is cumulative).
	const secRows = await sessionPageSeconds(timeConds);
	const secByKey = new Map<string, number>();
	for (const r of secRows) secByKey.set(`${r.session_id}|${r.path ?? ""}`, r.secs);

	// Returning guests: how many visits in total this visitor_id has.
	const visitorIds = [...new Set(sessions.map((s) => s.visitor_id).filter(Boolean))] as string[];
	const repeatByVisitor = new Map<string, number>();
	if (visitorIds.length) {
		const repeats = await rows<{ visitor_id: string; sessions: number }>(sql`
			select visitor_id, count(distinct session_id) as sessions
			from future_face.analytics_events
			where visitor_id in (${sql.join(visitorIds.map((v) => sql`${v}`), sql`, `)})
			group by 1
		`);
		for (const r of repeats) repeatByVisitor.set(r.visitor_id, n(r.sessions));
	}

	const pagesBySession = new Map<string, VisitPage[]>();
	for (const p of pageRows) {
		const arr = pagesBySession.get(p.session_id) ?? [];
		arr.push({
			path: p.path,
			views: n(p.views),
			at: p.at,
			last_at: p.last_at,
			secs: secByKey.get(`${p.session_id}|${p.path}`) ?? 0,
		});
		pagesBySession.set(p.session_id, arr);
	}
	for (const arr of pagesBySession.values()) arr.sort((a, b) => String(a.at).localeCompare(String(b.at)));

	return sessions.map((s) => {
		const pages = pagesBySession.get(s.session_id) ?? [];
		return {
			session_id: s.session_id,
			visitor: (s.visitor_id ?? "").slice(0, 6) || "—",
			started: s.started,
			ended: s.ended,
			link_code: s.link_code,
			device: s.device,
			lang: s.lang,
			country: s.country,
			referrer: s.referrer,
			views: n(s.views),
			secs: pages.reduce((a, p) => a + p.secs, 0),
			downloads: n(s.downloads),
			contacts: n(s.contacts),
			ai_messages: n(s.ai_messages),
			ai_calls: n(s.ai_calls),
			call_secs: n(s.call_secs),
			outbound: s.outbound ?? [],
			first_action_at: s.first_action_at,
			pages,
			returning: (repeatByVisitor.get(s.visitor_id ?? "") ?? 1) > 1,
		};
	});
}

export function fmtDuration(secs: number): string {
	if (secs <= 0) return "—";
	if (secs < 60) return `${secs} с`;
	const m = Math.floor(secs / 60);
	if (m < 60) return `${m} мин ${secs % 60} с`;
	return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}
