import { asc, sql } from "drizzle-orm";
import { db, withDbRetry } from "@/lib/db";
import { aiSettings } from "@/lib/schema";
import { auditReady, record, type Step } from "./audit-core";
import { bad, text as checkText } from "./http";
import { audit, publish } from "./publish";

// Settings of the AI assistant that answers site guests, and its costs. The set of keys is the same as in /admin/ai-assistant.

const KEYS = [
	"system_prompt", "mode_vacancy", "mode_task", "mode_market", "model", "temperature", "web_search_enabled", "max_searches",
	"realtime_model", "realtime_voice",
] as const;
type Key = (typeof KEYS)[number];

const LONG_TEXT: readonly Key[] = ["system_prompt", "mode_vacancy", "mode_task", "mode_market"];

// Models for which the site can calculate cost (PRICING in app/api/ai-assistant/route.ts). For any other, the daily cap would use the price
// of the cheapest model and miss spending many times larger, and a typo in the name would leave the assistant without answers.
const MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "gpt-4.1-nano"];

/** The setting value by its kind. An assistant model that can't be launched breaks its replies, so the format is checked strictly. */
function checkSetting(key: Key, value: string): string {
	if (LONG_TEXT.includes(key)) {
		// without the main instruction the public assistant answers guests with no rules at all; modes may be empty
		return checkText(value, key, { max: 30_000, allowEmpty: key !== "system_prompt" });
	}
	const v = checkText(value, key, { max: 120, allowEmpty: key === "realtime_voice" }).trim();
	switch (key) {
		case "model":
			if (!MODELS.includes(v)) bad(`Модель «${v}» сайт не умеет учитывать в расходах. Доступны: ${MODELS.join(", ")}`, { models: MODELS });
			return v;
		case "realtime_model":
			if (!/^[A-Za-z0-9][A-Za-z0-9._:\-]{1,99}$/.test(v)) bad(`Название модели «${key}» записано неверно`);
			return v;
		case "temperature": {
			const n = Number(v);
			// the site reads zero as "not set" and uses 0.4, so a genuine zero can't be set
			if (!Number.isFinite(n) || n <= 0 || n > 2) bad("Температура — число больше 0 и не больше 2 (0 сайт читает как «не задано» и берёт 0.4; для самой строгой поставь 0.1)");
			return String(n);
		}
		case "web_search_enabled":
			if (v !== "true" && v !== "false") bad("web_search_enabled — true или false");
			return v;
		case "max_searches": {
			const n = Number(v);
			if (!Number.isInteger(n) || n < 0 || n > 10) bad("max_searches — целое число от 0 до 10");
			return String(n);
		}
		default:
			if (v && !/^[A-Za-z0-9._\-]{1,40}$/.test(v)) bad("Голос записан неверно");
			return v;
	}
}

export async function readAiSettings() {
	const rows = await withDbRetry(() => db.select().from(aiSettings).orderBy(asc(aiSettings.key)));
	const have = new Map(rows.map((r) => [r.key, r.value]));
	return { editable: KEYS, items: KEYS.map((key) => ({ key, value: have.get(key) ?? "", set: have.has(key) })) };
}

export async function applyAiSettings(raw: unknown, dryRun: boolean) {
	if (!Array.isArray(raw) || raw.length === 0) bad("Нужен непустой список changes: [{key, value}]");
	const rows = await withDbRetry(() => db.select().from(aiSettings));
	const have = new Map(rows.map((r) => [r.key, r.value]));
	const seen = new Set<string>();
	const results = raw.map((c, i) => {
		if (!c || typeof c !== "object") bad(`changes[${i}] должен быть объектом {key, value}`);
		const { key, value } = c as Record<string, unknown>;
		if (typeof key !== "string" || !KEYS.includes(key as Key)) bad(`Настройки «${String(key)}» нет`, { editable: KEYS });
		if (typeof value !== "string") bad(`changes[${i}].value должен быть строкой`);
		if (seen.has(key)) bad(`Ключ «${key}» указан дважды`);
		seen.add(key);
		const next = checkSetting(key as Key, value);
		const old = have.get(key) ?? null;
		return { key, old, new: next, changed: next !== old };
	});
	const todo = results.filter((r) => r.changed);
	let auditId: number | null = null;
	if (!dryRun && todo.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			for (const r of todo) {
				await tx.insert(aiSettings).values({ key: r.key, value: r.new }).onConflictDoUpdate({ target: aiSettings.key, set: { value: r.new } });
			}
			const undo: Step[] = todo.map((r) => ({ t: "ai", key: r.key, old: r.old, expect: r.new }));
			return record(tx, {
				action: "ai.settings",
				target: "ai/settings",
				summary: `Настройки ассистента: ${todo.map((r) => r.key).join(", ")}`,
				changes: todo.map((r) => ({ key: r.key, old: r.old, new: r.new })),
				undo,
			});
		});
		publish(["/ai-assistant"]);
		audit("ai_settings", { id: auditId, keys: todo.map((r) => [r.key, r.old?.length ?? 0, r.new.length]) });
	}
	return { dry_run: dryRun, applied: !dryRun && todo.length > 0, changed: todo.length, audit_id: auditId, results };
}

/** How much the assistant spent today and this week (cost is written to analytics as an ai_cost event in micro-dollars). */
export async function aiBudget() {
	const rows = (await withDbRetry(() =>
		db.execute(sql`
			select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
				coalesce(sum(meta::bigint) filter (where type = 'ai_cost'), 0) as micro,
				count(*) filter (where type = 'ai_message') as messages
			from future_face.analytics_events
			where created_at >= date_trunc('day', now()) - interval '6 days' and type in ('ai_cost', 'ai_message')
			group by 1 order by 1
		`),
	)) as unknown as { day: string; micro: string | number; messages: string | number }[];
	const days = rows.map((r) => ({ day: r.day, spent_usd: Number(r.micro) / 1_000_000, messages: Number(r.messages) }));
	const today = new Date().toISOString().slice(0, 10);
	const dailyLimit = Number(process.env.AI_DAILY_BUDGET_USD ?? 2);
	const todayRow = days.find((d) => d.day === today) ?? { day: today, spent_usd: 0, messages: 0 };
	return {
		limit_usd_per_day: dailyLimit,
		limit_messages_per_visitor_per_day: Number(process.env.AI_DAILY_MESSAGES_PER_VISITOR ?? 30),
		today: { ...todayRow, left_usd: Math.max(0, dailyLimit - todayRow.spent_usd), exhausted: todayRow.spent_usd >= dailyLimit },
		last_7_days: days,
		note: "Потолок и норма на гостя задаются в окружении сайта (AI_DAILY_BUDGET_USD, AI_DAILY_MESSAGES_PER_VISITOR), отсюда они не меняются.",
	};
}
