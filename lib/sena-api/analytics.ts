import { loadDashboard } from "@/app/admin/(panel)/analytics/dashboard-data";
import { exportAnalyticsToSheet } from "@/lib/analytics-export";
import { rateLimit } from "@/lib/rate-limit";
import { audit, logPlain } from "./publish";
import { ApiError, bad } from "./http";

// Analytics - the same numbers as in the admin (/admin/analytics): the same loadDashboard function computes them.
// Here they are only converted to JSON and trimmed on request, so Sena doesn't receive more than needed.

const DEFAULT_PARTS = [
	"scope", "scopeLabel", "kpis", "scopeCards", "topPages", "topWorks", "sources", "devices", "geo", "funnel", "behavior", "returns", "times",
	"totalSecs", "avgSecs",
] as const;
const OPTIONAL_PARTS = [
	"linkRows", "chartDays", "chartLabels", "chartValues", "chartSeries", "recent", "visits", "secByPath", "labelByCode", "sheetUrl",
] as const;
const ALL_PARTS: readonly string[] = [...DEFAULT_PARTS, ...OPTIONAL_PARTS];

export const ANALYTICS_PARTS = { default: DEFAULT_PARTS, optional: OPTIONAL_PARTS };

function range(value: string | null): string {
	if (value === null || value === "") return "30";
	if (value === "all") return "all";
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 3650) bad("range — число дней от 1 до 3650 или all");
	return String(n);
}

function link(value: string | null): string {
	if (value === null || value === "") return "all";
	if (value === "all" || value === "direct" || /^[a-z0-9-]{1,40}$/.test(value)) return value;
	bad("link — all, direct или код ссылки (латиница, цифры, дефис)");
}

// The dashboard is two dozen DB queries, and the DB is shared with the live site (few connections there). So the heavy part is limited separately.
function heavy(name: string, limit: number, windowMs: number): void {
	const verdict = rateLimit(`sena-api-heavy:${name}`, limit, windowMs);
	if (!verdict.ok) throw new ApiError(429, "too_many_requests", "Этот запрос тяжёлый, подожди", { retryAfter: verdict.retryAfter });
}

export async function analyticsOverview(url: URL) {
	heavy("analytics", 20, 60_000);
	const asked = url.searchParams.get("parts");
	const parts = asked ? asked.split(",").map((p) => p.trim()).filter(Boolean) : [...DEFAULT_PARTS];
	const unknown = parts.filter((p) => !ALL_PARTS.includes(p));
	if (unknown.length) bad(`Неизвестные части: ${unknown.join(", ")}`, { allowed: ALL_PARTS });
	const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20) || 20, 1), 200);

	const data = (await loadDashboard(Promise.resolve({ range: range(url.searchParams.get("range")), link: link(url.searchParams.get("link")) }))) as unknown as Record<string, unknown>;

	const out: Record<string, unknown> = {};
	for (const part of parts) {
		let value = data[part];
		if (value instanceof Map) value = Object.fromEntries(value);
		if ((part === "visits" || part === "recent") && Array.isArray(value)) value = value.slice(0, limit);
		out[part] = value;
	}
	// The response is JSON only: dates and numbers from the DB are converted to a plain form
	return { range: range(url.searchParams.get("range")), link: link(url.searchParams.get("link")), ...JSON.parse(JSON.stringify(out)) };
}

export async function analyticsExport() {
	heavy("export", 3, 10 * 60_000);
	const result = await exportAnalyticsToSheet();
	audit("analytics_export", { ok: result.ok });
	await logPlain({ action: "analytics.export", target: "analytics", summary: result.ok ? "Выгрузка аналитики в Google Таблицу" : `Выгрузка не удалась: ${result.error ?? ""}` });
	if (!result.ok) throw new ApiError(502, "export_failed", result.error ?? "Выгрузка в Google Таблицу не удалась");
	return result;
}
