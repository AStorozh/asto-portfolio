import { aiBudget, applyAiSettings, readAiSettings } from "./ai";
import { ANALYTICS_PARTS, analyticsExport, analyticsOverview } from "./analytics";
import { auditEntry, currentContext, listAudit, pruneOld, recordLight, runWithContext, withWriteLock } from "./audit-core";
import { ApiError, bad, errorReason, errorResponse, json, onlyKnown, readJson } from "./http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revertEntry } from "./revert";
import { createLink, deleteLink, listLinks, patchLink } from "./links";
import { audit, logPlain, publish } from "./publish";
import {
	createQuote,
	createResumeSection,
	deleteQuote,
	deleteResumeSection,
	getWork,
	listAiCapabilities,
	listContactMethods,
	listQuotes,
	listResumeSections,
	listWorks,
	patchAiCapability,
	patchContactMethod,
	patchQuote,
	patchResumeSection,
	patchWork,
} from "./structured";
import { searchSite } from "./search";
import { applyChanges, listScopes, parseChanges, readScope } from "./texts";
import { authorize } from "./auth";

// All API addresses live under /api/sena/v1. Every request takes one path: key → address parsing → handler → JSON.
// Mutating requests understand dry_run: true (in the body or ?dry_run=1) - show what would change without writing anything.

type Ctx = { url: URL; params: Record<string, string>; body: () => Promise<Record<string, unknown>>; dry: () => Promise<boolean> };
type Handler = (c: Ctx) => Promise<unknown>;
type Route = { method: string; path: string; about: string; run: Handler; heavy?: boolean };

function auditId(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id < 1) bad("Номер записи журнала — целое число");
	return id;
}

const num = (url: URL, name: string) => (url.searchParams.has(name) ? Number(url.searchParams.get(name)) || undefined : undefined);

const ROUTES: Route[] = [
	{ method: "GET", path: "", about: "Карта API и сводка сайта", run: async () => overview(), heavy: true },

	{ method: "GET", path: "texts", about: "Разделы текстов и сколько в них ключей", run: async () => ({ scopes: await listScopes() }) },
	{
		method: "GET",
		path: "texts/search",
		about: "Найти, где на сайте лежит фраза: ?q=текст (по русскому, переводам и ключам, во всех текстах, работах, контактах, резюме, цитатах). В ответе у каждой находки указано, чем её править",
		run: async (c) => searchSite(c.url),
		heavy: true,
	},
	{
		method: "GET",
		path: "texts/:scope",
		about: "Тексты раздела (?prefix=, ?search=, ?limit=). Перевод — ключ с __en / __de",
		run: async (c) =>
			readScope(c.params.scope, { prefix: c.url.searchParams.get("prefix") ?? undefined, search: c.url.searchParams.get("search") ?? undefined, limit: num(c.url, "limit") }),
	},
	{
		method: "PUT",
		path: "texts/:scope",
		about: "Изменить тексты: {changes:[{key,value}], dry_run?}. value: null удаляет перевод",
		run: async (c) => {
			const body = await c.body();
			onlyKnown(body, ["changes", "dry_run"]);
			return applyChanges(c.params.scope, parseChanges(body), await c.dry());
		},
	},

	{ method: "GET", path: "works", about: "Все работы целиком", run: async () => ({ works: await listWorks() }), heavy: true },
	{ method: "GET", path: "works/:slug", about: "Одна работа", run: async (c) => getWork(c.params.slug) },
	{
		method: "PATCH",
		path: "works/:slug",
		about: "Правка работы: title/description/overview (+_en,_de), featured, tags, what_i_did, how_done, results (+переводы списками). Создавать и удалять работы можно только в админке",
		run: async (c) => patchWork(c.params.slug, await c.body(), await c.dry()),
	},

	{ method: "GET", path: "contacts/methods", about: "Способы связи", run: async () => ({ methods: await listContactMethods() }) },
	{ method: "PATCH", path: "contacts/methods/:slug", about: "Правка способа связи: platform, title, title_en, title_de, href", run: async (c) => patchContactMethod(c.params.slug, await c.body(), await c.dry()) },

	{ method: "GET", path: "resume/sections", about: "Блоки резюме", run: async () => ({ sections: await listResumeSections() }) },
	{ method: "POST", path: "resume/sections", about: "Новый блок резюме: part (main|sidebar), title, body (+_en,_de)", run: async (c) => createResumeSection(await c.body(), await c.dry()) },
	{ method: "PATCH", path: "resume/sections/:slug", about: "Правка блока резюме", run: async (c) => patchResumeSection(c.params.slug, await c.body(), await c.dry()) },
	{ method: "DELETE", path: "resume/sections/:slug", about: "Удалить блок резюме (в ответе он целиком)", run: async (c) => deleteResumeSection(c.params.slug, await c.dry()) },

	{ method: "GET", path: "quotes", about: "Цитаты (переводы — слаг с __en / __de)", run: async () => ({ quotes: await listQuotes() }) },
	{ method: "POST", path: "quotes", about: "Новая цитата: text, author, pages", run: async (c) => createQuote(await c.body(), await c.dry()) },
	{ method: "PATCH", path: "quotes/:slug", about: "Правка цитаты: text, author", run: async (c) => patchQuote(c.params.slug, await c.body(), await c.dry()) },
	{ method: "DELETE", path: "quotes/:slug", about: "Удалить цитату (в ответе она целиком)", run: async (c) => deleteQuote(c.params.slug, await c.dry()) },

	{ method: "GET", path: "ai/settings", about: "Настройки AI-ассистента сайта (промпт, модель, температура, поиск)", run: async () => readAiSettings() },
	{
		method: "PUT",
		path: "ai/settings",
		about: "Изменить настройки ассистента: {changes:[{key,value}], dry_run?}",
		run: async (c) => {
			const body = await c.body();
			onlyKnown(body, ["changes", "dry_run"]);
			return applyAiSettings(body.changes, await c.dry());
		},
	},
	{ method: "GET", path: "ai/capabilities", about: "Карточки возможностей ассистента", run: async () => ({ capabilities: await listAiCapabilities() }) },
	{ method: "PATCH", path: "ai/capabilities/:slug", about: "Правка карточки: title, description, hint", run: async (c) => patchAiCapability(c.params.slug, await c.body(), await c.dry()) },
	{ method: "GET", path: "ai/budget", about: "Расход ассистента сегодня и за неделю, потолок", run: async () => aiBudget() },

	{ method: "GET", path: "links", about: "Ссылки-метки (для откликов) с числом посетителей и готовым адресом", run: async () => ({ links: await listLinks() }) },
	{ method: "POST", path: "links", about: "Новая ссылка: label, audience, code, target (путь внутри сайта)", run: async (c) => createLink(await c.body(), await c.dry()) },
	{ method: "PATCH", path: "links/:code", about: "Правка ссылки: label, audience, code, target, tracking", run: async (c) => patchLink(c.params.code, await c.body(), await c.dry()) },
	{ method: "DELETE", path: "links/:code", about: "Удалить ссылку (события по ней остаются)", run: async (c) => deleteLink(c.params.code, await c.dry()) },

	{
		method: "GET",
		path: "analytics",
		about: `Аналитика, как в админке: ?range=7|30|90|all, ?link=all|direct|<код>, ?parts=${ANALYTICS_PARTS.default.join(",")} (+ ${ANALYTICS_PARTS.optional.join(", ")}), ?limit=`,
		run: async (c) => analyticsOverview(c.url),
	},
	{ method: "POST", path: "analytics/export", about: "Обновить Google Таблицу с аналитикой", run: async () => analyticsExport() },

	{
		method: "GET",
		path: "audit",
		about: "Журнал действий Сены на сайте: ?kind=write|preview|rejected|read (через запятую, по умолчанию write), ?since=дата, ?target=часть, ?action=, ?limit=, ?full=1 (с изменениями)",
		run: async (c) => listAudit(c.url),
	},
	{ method: "GET", path: "audit/:id", about: "Одна запись журнала целиком: что менялось (было → стало) и как это откатить", run: async (c) => auditEntry(auditId(c.params.id)) },
	{
		method: "POST",
		path: "audit/:id/revert",
		about: "Откатить правку по записи журнала: {dry_run?, force?}. Если после неё данные менялись, без force: true откат откажет и покажет conflicts",
		run: async (c) => revertEntry(auditId(c.params.id), await c.body(), await c.dry()),
	},
	{
		method: "POST",
		path: "revalidate",
		about: "Сбросить кэш сайта (если правка из админки не видна)",
		run: async () => {
			publish([{ path: "/", type: "layout" }]);
			audit("revalidate", {});
			await logPlain({ action: "cache.revalidate", target: "cache", summary: "Сброс кэша сайта" });
			return { ok: true };
		},
	},
];

async function overview() {
	const [scopes, works, links, budget] = await Promise.all([listScopes(), listWorks(), listLinks(), aiBudget()]);
	return {
		api: "sena-site",
		version: 1,
		site_url: process.env.SITE_URL ?? null,
		scopes,
		works: works.map((w) => ({ slug: w.slug, title: w.title, featured: w.featured })),
		links: links.map((l) => ({ code: l.code, label: l.label, audience: l.audience, visitors: l.visitors, url: l.url })),
		ai_budget_today: budget.today,
		routes: ROUTES.map((r) => ({ method: r.method, path: `/api/sena/v1/${r.path}`.replace(/\/$/, ""), about: r.about })),
	};
}

function match(method: string, segments: string[]): { route: Route; params: Record<string, string> } | "method" | null {
	let pathMatched = false;
	for (const route of ROUTES) {
		const parts = route.path ? route.path.split("/") : [];
		if (parts.length !== segments.length) continue;
		const params: Record<string, string> = {};
		let ok = true;
		for (let i = 0; i < parts.length; i++) {
			if (parts[i].startsWith(":")) params[parts[i].slice(1)] = segments[i];
			else if (parts[i] !== segments[i]) {
				ok = false;
				break;
			}
		}
		if (!ok) continue;
		pathMatched = true;
		if (route.method === method) return { route, params };
	}
	return pathMatched ? "method" : null;
}

export async function handle(req: Request, path: string[]): Promise<Response> {
	try {
		authorize(req);
		if (path[0] !== "v1") throw new ApiError(404, "not_found", "Адрес начинается с /api/sena/v1");
		const segments = path.slice(1).map((s) => {
			try {
				return decodeURIComponent(s);
			} catch {
				return bad("Адрес записан неверно");
			}
		});
		const found = match(req.method, segments);
		if (found === null) throw new ApiError(404, "not_found", "Такого адреса в API нет");
		if (found === "method") throw new ApiError(405, "method_not_allowed", `Метод ${req.method} для этого адреса не поддерживается`);

		const url = new URL(req.url);
		const where = { ip: clientIp(req), method: req.method, path: url.pathname + url.search };
		const action = `${req.method} ${found.route.path || "/"}`;
		// from here on everything Sena does goes into the journal: edits - inside their own transaction, the rest - briefly
		return await runWithContext(where, async () => {
			let cached: Promise<Record<string, unknown>> | null = null;
			const body = () => (cached ??= readJson(req));
			// dry_run is understood only as a real true/false (in the body) or 1/true/0/false (in the address); an unclear value is rejected, not silently treated as a real write
			const dry = async () => {
				const q = url.searchParams.get("dry_run");
				if (q !== null && !["1", "true", "0", "false"].includes(q)) bad("dry_run в адресе — 1, true, 0 или false");
				let inBody: unknown;
				if (req.method !== "GET") inBody = (await body()).dry_run;
				if (inBody !== undefined && typeof inBody !== "boolean") bad("dry_run в теле — true или false");
				return q === "1" || q === "true" || inBody === true;
			};
			const write = req.method !== "GET";
			if (found.route.heavy) {
				const verdict = rateLimit("sena-api-heavy-read", 120, 60_000); // each such read is dozens of database queries, on a database shared with the live site
				if (!verdict.ok) throw new ApiError(429, "too_many_requests", "Слишком много тяжёлых чтений, подожди", { retryAfter: verdict.retryAfter });
			}
			try {
				// writing requests go one at a time (see withWriteLock): "before" cannot change between the read and the write
				const execute = () => found.route.run({ url, params: found.params, body, dry });
				const result = write ? await withWriteLock(execute) : await execute();
				const logged = currentContext()?.logged;
				if (!logged && !found.route.path.startsWith("audit")) {
					const preview = write && typeof result === "object" && result !== null && (result as { dry_run?: unknown }).dry_run === true;
					if (preview) await recordLight("preview", { action, target: where.path, status: 200 });
					else if (write) await recordLight("preview", { action, target: where.path, status: 200, summary: "без изменений" }); // the request went through but wrote nothing
					else await recordLight("read", { action, target: where.path, status: 200 });
				}
				if (write) void pruneOld();
				return json(result);
			} catch (e) {
				if (write) {
					const status = e instanceof ApiError ? e.status : 500;
					await recordLight("rejected", { action, target: where.path, status, summary: e instanceof Error ? e.message : String(e) });
				}
				throw e;
			}
		});
	} catch (e) {
		if (e instanceof ApiError) {
			return errorResponse(e);
		}
		// drizzle wraps the database error: the real cause lies in cause, while message contains the SQL and parameters (i.e. the texts) - we don't write them to the journal
		const message = errorReason(e);
		console.error("[sena-api] ошибка:", message);
		// The site database sometimes doesn't respond to a new connection (a known hosting quirk): Sena needs to tell this apart from an error in the request
		if (/CONNECT_TIMEOUT|ECONNREFUSED|ETIMEDOUT|ECONNRESET/.test(message)) {
			return errorResponse(new ApiError(503, "db_unavailable", "База сайта сейчас не отвечает, повтори через минуту"));
		}
		return errorResponse(new ApiError(500, "internal", "Внутренняя ошибка API; подробности в журнале сервера"));
	}
}
