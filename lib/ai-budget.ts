import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimit } from "./rate-limit";

// Safeguard for the AI: the site owner pays for tokens. A rate limit does not
// help here - anyone willing to send requests around the clock will rack up thousands.
// So we count the messages themselves and actual spending, and stop at a ceiling.
//
// Counting is done on the server by guest address, so reloading the page,
// clearing browser storage or opening a new tab does not reset the limit.
//
// Spending comes from analytics: each model reply writes its cost
// in micro-dollars there (see costMicroUsd in the assistant route).

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? 2);
const DAILY_MESSAGES_PER_VISITOR = Number(process.env.AI_DAILY_MESSAGES_PER_VISITOR ?? 30);

// A DB query for every message is not needed - spending changes slowly.
let cache: { spentMicro: number; at: number } | null = null;
const CACHE_MS = 60_000;

async function spentTodayMicro(): Promise<number> {
	const now = Date.now();
	if (cache && now - cache.at < CACHE_MS) return cache.spentMicro;

	try {
		const rows = (await db.execute(sql`
			select coalesce(sum(meta::bigint), 0) as micro
			from future_face.analytics_events
			where type = 'ai_cost' and created_at >= date_trunc('day', now())
		`)) as unknown as { micro: string | number }[];
		const spentMicro = Number(rows[0]?.micro ?? 0);
		cache = { spentMicro, at: now };
		return spentMicro;
	} catch {
		// DB unavailable - do not block the assistant because of that.
		return cache?.spentMicro ?? 0;
	}
}

export type BudgetVerdict = { ok: true } | { ok: false; reason: "daily-budget" | "visitor-quota" };

/**
 * Whether to allow the next request to the model. Checks two bounds: how much money
 * has been spent today by the whole site and how many messages a particular guest sent.
 */
export async function checkAiBudget(visitorKey: string): Promise<BudgetVerdict> {
	const perVisitor = rateLimit(`ai-daily:${visitorKey}`, DAILY_MESSAGES_PER_VISITOR, 24 * 60 * 60_000);
	if (!perVisitor.ok) return { ok: false, reason: "visitor-quota" };

	const spent = await spentTodayMicro();
	if (spent >= DAILY_BUDGET_USD * 1_000_000) return { ok: false, reason: "daily-budget" };

	return { ok: true };
}

/**
 * Only the site-wide daily ceiling, without spending a guest's message quota.
 * Used by the voice call and voice-message transcription: once the text chat
 * has used up the day's budget, they stop too. Their own cost is not added to
 * the ceiling: the call runs in the browser and the server never sees its usage.
 */
export async function checkAiDailyCeiling(): Promise<boolean> {
	const spent = await spentTodayMicro();
	return spent < DAILY_BUDGET_USD * 1_000_000;
}

// After a model reply, add the fresh spend to the cache without waiting for a re-read
// from the DB: otherwise a burst of requests within a minute can slip past the ceiling.
export function addSpent(micro: number): void {
	if (cache) cache.spentMicro += micro;
}
