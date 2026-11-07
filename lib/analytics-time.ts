// Time on page: recovering honest seconds from cumulative events.
//
// The tracker sends page_time CUMULATIVELY: each time the tab is left it sends the whole
// visit time since the start, not the increment. This is intentional - if one beacon
// is lost, the next one still brings the full number and no time is lost.
// But such values can't be summed: a visit 24 → 653 → 659 seconds sums to
// 1336 instead of 659. The export used to sum them - time was overstated by ~82%.
//
// Here we compute INCREMENTS within a visit: the value minus the previous one for the same pair
// (session, page). A drop in the value = a new visit to the same page started,
// and that value is taken whole. It works for already collected data too, so
// there is no need to rewrite history.

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

export type PageSeconds = { link_code: string | null; path: string | null; secs: number };
export type SessionPageSeconds = { session_id: string; path: string | null; secs: number };

// Subquery (link_code, path, secs) with increments. extra - additional conditions on events.
export function pageTimeDeltas(extra: SQL[] = []): SQL {
	const conds = [sql`type = 'page_time'`, sql`meta ~ '^[0-9]+$'`, ...extra];
	return sql`
		select link_code, path, session_id, created_at,
			case when prev is null or secs < prev then secs else secs - prev end as secs
		from (
			select link_code, path, session_id, created_at, meta::int as secs,
				lag(meta::int) over (partition by session_id, path order by created_at) as prev
			from future_face.analytics_events
			where ${sql.join(conds, sql` and `)}
		) t
	`;
}

// Seconds per (tag, page) - all other breakdowns are built from this.
export async function pageSeconds(extra: SQL[] = []): Promise<PageSeconds[]> {
	const rows = (await db.execute(sql`
		select link_code, path, sum(secs)::int as secs
		from (${pageTimeDeltas(extra)}) d
		group by 1, 2
	`)) as unknown as PageSeconds[];
	return rows.map((r) => ({ ...r, secs: Number(r.secs ?? 0) }));
}

// Rollups on top of pageSeconds - so identical queries aren't run several times.
export function secondsByLink(rows: PageSeconds[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const r of rows) {
		const key = r.link_code ?? "__direct";
		m.set(key, (m.get(key) ?? 0) + r.secs);
	}
	return m;
}

export function secondsByLinkPath(rows: PageSeconds[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const r of rows) m.set(`${r.link_code ?? "__direct"}|${r.path ?? ""}`, r.secs);
	return m;
}

export function secondsByPath(rows: PageSeconds[], skip: (code: string) => boolean = () => false): Map<string, number> {
	const m = new Map<string, number>();
	for (const r of rows) {
		if (skip(r.link_code ?? "__direct")) continue;
		const key = r.path ?? "";
		m.set(key, (m.get(key) ?? 0) + r.secs);
	}
	return m;
}

// Seconds per (visit, page) - for the "each visit separately" report.
export async function sessionPageSeconds(extra: SQL[] = []): Promise<SessionPageSeconds[]> {
	const rows = (await db.execute(sql`
		select session_id, path, sum(secs)::int as secs
		from (${pageTimeDeltas(extra)}) d
		where session_id is not null and session_id <> ''
		group by 1, 2
	`)) as unknown as SessionPageSeconds[];
	return rows.map((r) => ({ ...r, secs: Number(r.secs ?? 0) }));
}

// Seconds per (day, tag) - for the trend chart.
export async function dailySeconds(extra: SQL[] = []): Promise<{ d: string; k: string; secs: number }[]> {
	const rows = (await db.execute(sql`
		select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d,
			coalesce(link_code, '__direct') as k,
			sum(secs)::int as secs
		from (${pageTimeDeltas(extra)}) t
		group by 1, 2
	`)) as unknown as { d: string; k: string; secs: number }[];
	return rows.map((r) => ({ ...r, secs: Number(r.secs ?? 0) }));
}
