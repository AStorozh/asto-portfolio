// Behavioral metrics on top of visits: bounces, depth to the target action,
// exit pages, returns, time of day and day of week.
//
// Computed from the full list of visits for the period (hundreds, not millions -
// aggregating in the app is cheaper than building SQL for every metric).

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Visit } from "@/lib/analytics-visits";

// Bounce: a single-page visit shorter than BOUNCE_SECS.
const BOUNCE_SECS = 10;

export type Behavior = {
	visits: number;
	bounces: number;
	bounceRate: number; // %
	avgPages: number;
	avgSecs: number;
	withAction: number; // visits with a target action
	actionRate: number; // %
	pagesToAction: number; // average number of pages before the first action
	secsToAction: number; // average time from entry to the first action
	exits: { path: string; count: number }[]; // where visits end
};

export function behaviorFrom(visits: Visit[]): Behavior {
	const total = visits.length;
	let bounces = 0;
	let pages = 0;
	let secs = 0;
	let withAction = 0;
	let pagesToActionSum = 0;
	let secsToActionSum = 0;
	const exits = new Map<string, number>();

	for (const v of visits) {
		pages += v.pages.length;
		secs += v.secs;
		if (v.pages.length <= 1 && v.secs < BOUNCE_SECS) bounces++;

		// The exit page is the one with the LAST event of the visit, not the
		// last one opened: a person may have returned to a page opened earlier
		// and left from it.
		const last = v.pages.reduce<(typeof v.pages)[number] | null>(
			(best, p) => (!best || String(p.last_at) > String(best.last_at) ? p : best),
			null,
		);
		if (last) exits.set(last.path, (exits.get(last.path) ?? 0) + 1);

		if (v.first_action_at) {
			withAction++;
			const at = new Date(v.first_action_at).getTime();
			// pages before the action: those opened by that moment
			pagesToActionSum += Math.max(1, v.pages.filter((p) => new Date(p.at).getTime() <= at).length);
			secsToActionSum += Math.max(0, Math.round((at - new Date(v.started).getTime()) / 1000));
		}
	}

	const round1 = (x: number) => Math.round(x * 10) / 10;
	return {
		visits: total,
		bounces,
		bounceRate: total ? Math.round((bounces / total) * 100) : 0,
		avgPages: total ? round1(pages / total) : 0,
		avgSecs: total ? Math.round(secs / total) : 0,
		withAction,
		actionRate: total ? Math.round((withAction / total) * 100) : 0,
		pagesToAction: withAction ? round1(pagesToActionSum / withAction) : 0,
		secsToAction: withAction ? Math.round(secsToActionSum / withAction) : 0,
		exits: [...exits.entries()]
			.map(([path, count]) => ({ path, count }))
			.sort((a, b) => b.count - a.count),
	};
}

export type Returns = {
	visitors: number;
	repeat: number; // guests with more than one visit
	repeatRate: number; // %
	avgVisits: number;
	medianGapDays: number; // median gap between the first and last visit of returning guests
};

// Returns. visitor_id is a daily hash(ip+ua+salt): the same person on different
// days gets different ids, so the figure below is lower than the real one. We count this as "returns
// within a day" and label it honestly in the UI.
export async function returnsStats(extra: SQL[] = []): Promise<Returns> {
	const where = extra.length ? sql`where ${sql.join(extra, sql` and `)}` : sql``;
	const rowsRaw = (await db.execute(sql`
		select visitor_id,
			count(distinct session_id)::int as visits,
			extract(epoch from (max(created_at) - min(created_at)))::int as span_secs
		from future_face.analytics_events
		${where}
		group by visitor_id
	`)) as unknown as { visitor_id: string | null; visits: number; span_secs: number }[];

	const rows = rowsRaw.filter((r) => r.visitor_id);
	const repeatRows = rows.filter((r) => Number(r.visits) > 1);
	const gaps = repeatRows.map((r) => Number(r.span_secs) / 86400).sort((a, b) => a - b);
	const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;

	return {
		visitors: rows.length,
		repeat: repeatRows.length,
		repeatRate: rows.length ? Math.round((repeatRows.length / rows.length) * 100) : 0,
		avgVisits: rows.length ? Math.round((rows.reduce((a, r) => a + Number(r.visits), 0) / rows.length) * 10) / 10 : 0,
		medianGapDays: Math.round(median * 10) / 10,
	};
}

export type TimeProfile = { hours: number[]; days: number[] };

// Activity by hour (0-23) and day of week (Mon-Sun), in Moscow time:
// the DB stores time in UTC, but it is easier to read in the local time zone.
export async function timeProfile(extra: SQL[] = []): Promise<TimeProfile> {
	const conds = [sql`type = 'pageview'`, ...extra];
	const raw = (await db.execute(sql`
		select extract(hour from msk)::int as h,
			-- isodow: 1 = Monday ... 7 = Sunday
			extract(isodow from msk)::int as d,
			count(*)::int as n
		from (
			select (created_at at time zone 'UTC') at time zone 'Europe/Moscow' as msk
			from future_face.analytics_events
			where ${sql.join(conds, sql` and `)}
		) t
		group by 1, 2
	`)) as unknown as { h: number; d: number; n: number }[];

	const hours = Array(24).fill(0) as number[];
	const days = Array(7).fill(0) as number[];
	for (const r of raw) {
		hours[Number(r.h)] += Number(r.n);
		days[Number(r.d) - 1] += Number(r.n);
	}
	return { hours, days };
}

export const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
