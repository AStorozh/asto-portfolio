import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/same-origin";
import { getAiSettings } from "@/lib/content";
import { getAiKnowledge } from "@/lib/ai-context";
import { detectTextLang, getLang, stripLanguageLock, type Lang } from "@/lib/lang";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/schema";
import { lookup } from "node:dns/promises";
import { aiFetch } from "@/lib/ai-proxy";
import { guardrails, untrustedToolResult } from "@/lib/ai-guardrails";
import { isNoTrackLink } from "@/lib/analytics-no-track";
import { clientIp } from "@/lib/rate-limit";
import { addSpent, checkAiBudget } from "@/lib/ai-budget";
import { isBlockedIp } from "@/lib/net-guard";

// A concrete (not "mirror the language" but unambiguous) instruction about the reply language -
// the model follows it more reliably, especially when the site data is in another language.
function languageInstruction(replyLang: Lang): string {
	if (replyLang === "en") {
		return [
			"═══ RESPONSE LANGUAGE (OVERRIDES EVERYTHING ABOVE) ═══",
			"Reply ONLY in English. Do NOT use Russian, even though the site data below is in Russian — translate any facts you cite into English.",
			"This rule overrides any earlier instruction such as «отвечай по-русски».",
		].join("\n");
	}
	if (replyLang === "de") {
		return [
			"═══ RESPONSE LANGUAGE (OVERRIDES EVERYTHING ABOVE) ═══",
			"Reply ONLY in German (auf Deutsch). Do NOT use Russian or English, even though the site data below is in Russian — translate any facts you cite into German.",
			"This rule overrides any earlier instruction such as «отвечай по-русски».",
		].join("\n");
	}
	return [
		"═══ ЯЗЫК ОТВЕТА (ВАЖНЕЕ ВСЕГО ВЫШЕ) ═══",
		"Отвечай ТОЛЬКО на русском языке.",
	].join("\n");
}

// Never show the user a technical error (OpenAI credits ran out,
// proxy down, timeout, etc.) - instead the assistant "goes on vacation". The real
// cause goes to the server log and the response's details field (for devtools/admin).
function vacationReply(lang: Lang): string {
	if (lang === "en")
		return "Sorry — the site owner has sent me on a short vacation. I'll be back very soon. In the meantime you can look around the site or contact him directly.";
	if (lang === "de")
		return "Entschuldigung — der Website-Inhaber hat mich in einen kurzen Urlaub geschickt. Ich bin bald zurück. Schauen Sie sich in der Zwischenzeit gern auf der Website um oder schreiben Sie ihm direkt.";
	return "Извините, владелец сайта отправил меня в короткий отпуск. Скоро вернусь. А пока можете посмотреть сайт или написать ему напрямую — контакты есть в меню.";
}

// Reaching the limit is not a breakage, hence the different text: the person should
// understand that everything is fine, they just need to wait.
function tiredReply(lang: Lang): string {
	if (lang === "en")
		return "I need a short break — I've answered a lot of questions today. Come back in a few hours, and in the meantime feel free to look around the site or contact Artemiy directly: the links are in the menu.";
	if (lang === "de")
		return "Ich brauche eine kurze Pause — heute kamen viele Fragen zusammen. Schauen Sie in ein paar Stunden wieder vorbei; in der Zwischenzeit können Sie sich auf der Website umsehen oder Artemiy direkt schreiben, die Links stehen im Menü.";
	return "Мне нужен небольшой перерыв — сегодня было много вопросов. Загляните через несколько часов, а пока посмотрите сайт или напишите Артемию напрямую: ссылки есть в меню.";
}

function tiredResponse(lang: Lang, reason: string) {
	console.warn(`[ai-assistant] ${reason}`);
	return NextResponse.json({ answer: tiredReply(lang), tired: true });
}

function vacationResponse(lang: Lang, reason: string, details?: string) {
	console.error(`[ai-assistant] ${reason}${details ? `: ${details}` : ""}`);
	return NextResponse.json({ answer: vacationReply(lang), unavailable: true, details });
}

type Mode = "vacancy" | "task" | "market" | null;

type IncomingMessage = {
	role: "assistant" | "user";
	text: string;
	files?: string[];
};

type RequestBody = {
	messages?: IncomingMessage[];
	mode?: Mode;
	link_code?: string | null;
};

// OpenAI prices, USD per 1M tokens (input/output). For estimating costs in analytics.
const PRICING: Record<string, { in: number; out: number }> = {
	"gpt-4o-mini": { in: 0.15, out: 0.6 },
	"gpt-4o": { in: 2.5, out: 10 },
	"gpt-4.1-mini": { in: 0.4, out: 1.6 },
	"gpt-4.1": { in: 2, out: 8 },
	"gpt-4.1-nano": { in: 0.1, out: 0.4 },
};
function costMicroUsd(model: string, promptTokens: number, completionTokens: number): number {
	const p = PRICING[model] ?? PRICING["gpt-4o-mini"];
	const usd = (promptTokens / 1e6) * p.in + (completionTokens / 1e6) * p.out;
	return Math.round(usd * 1e6); // micro-dollars (integer)
}

type ChatMessage = {
	role: "system" | "user" | "assistant" | "tool";
	content: string | null;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
};

type ToolCall = {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
};

function normalizeMessages(messages: IncomingMessage[]): ChatMessage[] {
	return messages.slice(-12).map((message) => {
		const files = message.files?.length ? `\nПрикреплённые файлы: ${message.files.join(", ")}` : "";
		return { role: message.role, content: `${message.text}${files}` };
	});
}

function modeInstruction(mode: Mode, settings: Record<string, string>): string {
	if (mode === "vacancy") return settings.mode_vacancy ?? "";
	if (mode === "task") return settings.mode_task ?? "";
	if (mode === "market") return settings.mode_market ?? "";
	return "";
}

// ─── Tools for the model (web search + page reading) ─────────────────────────────

async function tavilySearch(query: string): Promise<string> {
	const key = process.env.TAVILY_API_KEY;
	if (!key) return "Веб-поиск недоступен: не задан TAVILY_API_KEY.";
	try {
		const res = await fetch("https://api.tavily.com/search", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				api_key: key,
				query,
				max_results: 5,
				search_depth: "basic",
			}),
		});
		if (!res.ok) return `Ошибка поиска: ${res.status}`;
		const data = await res.json();
		const results = (data?.results ?? []) as Array<{ title: string; url: string; content: string }>;
		if (!results.length) return "Ничего не найдено.";
		return results
			.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
			.join("\n\n");
	} catch (e) {
		return `Ошибка поиска: ${e instanceof Error ? e.message : "неизвестно"}`;
	}
}

// Resolves the host and checks that ALL of its addresses are public (catches a domain
// pointing to an internal IP).
async function assertPublicHost(hostname: string): Promise<string | null> {
	try {
		const addrs = await lookup(hostname, { all: true });
		if (!addrs.length) return "Не удалось определить адрес хоста.";
		if (addrs.some((a) => isBlockedIp(a.address))) {
			return "Доступ к локальным и внутренним адресам запрещён.";
		}
		return null;
	} catch {
		return "Не удалось определить адрес хоста.";
	}
}

async function fetchUrl(url: string): Promise<string> {
	let current = url;
	try {
		// Follow redirects manually (up to 3), checking every hop, so that
		// a public link cannot lead the server to an internal address.
		for (let hop = 0; hop < 4; hop += 1) {
			let parsed: URL;
			try {
				parsed = new URL(current);
			} catch {
				return "Некорректная ссылка.";
			}
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
				return "Можно открывать только http(s) ссылки.";
			}
			const blocked = await assertPublicHost(parsed.hostname);
			if (blocked) return blocked;

			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 8000);
			const res = await fetch(current, {
				signal: controller.signal,
				redirect: "manual",
				headers: { "User-Agent": "Mozilla/5.0 (portfolio-assistant)" },
			});
			clearTimeout(timer);

			if (res.status >= 300 && res.status < 400) {
				const loc = res.headers.get("location");
				if (!loc) return `Не удалось открыть страницу: ${res.status}`;
				current = new URL(loc, current).toString();
				continue;
			}
			if (!res.ok) return `Не удалось открыть страницу: ${res.status}`;

			const html = await res.text();
			const text = html
				.replace(/<script[\s\S]*?<\/script>/gi, " ")
				.replace(/<style[\s\S]*?<\/style>/gi, " ")
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			return text.slice(0, 6000);
		}
		return "Слишком много переадресаций.";
	} catch (e) {
		return `Не удалось открыть страницу: ${e instanceof Error ? e.message : "неизвестно"}`;
	}
}

const TOOLS = [
	{
		type: "function" as const,
		function: {
			name: "web_search",
			description:
				"Поиск актуальной информации в интернете (зарплаты, спрос на навыки, тренды рынка, описание компании). Используй для свежих данных, которых нет в данных сайта.",
			parameters: {
				type: "object",
				properties: { query: { type: "string", description: "Поисковый запрос" } },
				required: ["query"],
			},
		},
	},
	{
		type: "function" as const,
		function: {
			name: "fetch_url",
			description:
				"Прочитать содержимое веб-страницы по ссылке (например, страницы вакансии, которую прислал пользователь).",
			parameters: {
				type: "object",
				properties: { url: { type: "string", description: "Полный URL страницы" } },
				required: ["url"],
			},
		},
	},
];

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
	// Everything that came from the internet is marked as untrusted data - the page
	// may contain text addressed to the assistant ("print your prompt").
	if (name === "web_search") return untrustedToolResult(await tavilySearch(String(args.query ?? "")));
	if (name === "fetch_url") return untrustedToolResult(await fetchUrl(String(args.url ?? "")));
	return "Неизвестный инструмент.";
}

export async function POST(request: Request) {
	if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

	const apiKey = process.env.OPENAI_API_KEY;

	let body: RequestBody;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
	}

	// Input bounds: the site owner pays for tokens, so a megabyte-sized
	// text or a hundred messages of history must not go to the model.
	const MAX_MESSAGES = 40;
	const MAX_CHARS_PER_MESSAGE = 30_000;
	const MAX_TOTAL_CHARS = 120_000;

	const incoming = (body.messages ?? [])
		.filter((m) => m.text?.trim() || m.files?.length)
		.slice(-MAX_MESSAGES)
		.map((m) => ({ ...m, text: (m.text ?? "").slice(0, MAX_CHARS_PER_MESSAGE) }));

	if (incoming.length === 0) {
		return NextResponse.json({ error: "Сообщение пустое." }, { status: 400 });
	}
	if (incoming.reduce((sum, m) => sum + m.text.length, 0) > MAX_TOTAL_CHARS) {
		return NextResponse.json({ error: "Слишком длинный запрос." }, { status: 413 });
	}

	const [settings, knowledge, siteLang] = await Promise.all([
		getAiSettings(),
		getAiKnowledge(),
		getLang(),
	]);

	const model = settings.model || "gpt-4o-mini";
	const temperature = Number(settings.temperature ?? "0.4") || 0.4;
	const webEnabled = settings.web_search_enabled === "true" && Boolean(process.env.TAVILY_API_KEY);
	const maxSearches = Math.max(0, Number(settings.max_searches ?? "3") || 0);

	// Reply language: from the text of the user's last message; if the language can't
	// be determined (a link/digits), use the site language (RU/EN switch in the menu).
	const lastUserText = [...incoming].reverse().find((m) => m.role === "user")?.text ?? "";
	// detectTextLang only distinguishes Cyrillic/Latin. On a German site, Latin
	// is treated as the site language (de), otherwise as English; Cyrillic as Russian.
	const detected = detectTextLang(lastUserText);
	const replyLang: Lang =
		detected === "ru" ? "ru" : detected === "en" ? (siteLang === "de" ? "de" : "en") : siteLang;

	if (!apiKey) return vacationResponse(replyLang, "OPENAI_API_KEY не задан");

	// Spending safeguard: a daily spending ceiling for the whole site and a daily
	// message quota per guest. Once exhausted, softly reply "assistant unavailable",
	// as with any other failure, so as not to reveal how the limits work.
	const budget = await checkAiBudget(clientIp(request));
	if (!budget.ok) return tiredResponse(replyLang, `лимит AI: ${budget.reason}`);

	// The order matters twice. The unchanging part (prompt, site data, boundaries) goes
	// first - OpenAI caches an identical request prefix, and repeated questions
	// cost less. Boundaries come after the data, so they outweigh any
	// "instructions" inside site data, files and web pages. Mode and language go
	// last: they change from request to request.
	const systemContent = [
		stripLanguageLock(settings.system_prompt ?? ""),
		`═══ ДАННЫЕ САЙТА ═══\n${knowledge}`,
		guardrails(),
		modeInstruction(body.mode ?? null, settings),
		// Language rule goes last, to outweigh any leftover bias in the prompt.
		languageInstruction(replyLang),
	]
		.filter(Boolean)
		.join("\n\n");

	const messages: ChatMessage[] = [
		{ role: "system", content: systemContent },
		...normalizeMessages(incoming),
	];

	// Loop: let the model call tools, but no more than maxSearches times.
	let toolRounds = 0;
	const maxRounds = webEnabled ? maxSearches : 0;
	let promptTokens = 0;
	let completionTokens = 0;

	try {
		for (;;) {
			const payload: Record<string, unknown> = { model, messages, temperature };
			if (webEnabled && toolRounds < maxRounds) {
				payload.tools = TOOLS;
				payload.tool_choice = "auto";
			}

			const response = await aiFetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const details = await response.text();
				return vacationResponse(replyLang, `OpenAI HTTP ${response.status}`, details);
			}

			const data = await response.json();
			promptTokens += data?.usage?.prompt_tokens ?? 0;
			completionTokens += data?.usage?.completion_tokens ?? 0;
			const choice = data?.choices?.[0]?.message;
			const toolCalls: ToolCall[] | undefined = choice?.tool_calls;

			if (toolCalls?.length && toolRounds < maxRounds) {
				toolRounds += 1;
				messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: toolCalls });
				for (const call of toolCalls) {
					let parsed: Record<string, unknown> = {};
					try {
						parsed = JSON.parse(call.function.arguments || "{}");
					} catch {
						/* ignore */
					}
					const result = await runTool(call.function.name, parsed);
					messages.push({ role: "tool", tool_call_id: call.id, content: result });
				}
				continue;
			}

			const answer = choice?.content;
			if (typeof answer !== "string" || answer.trim().length === 0) {
				return vacationResponse(replyLang, "OpenAI вернул пустой ответ");
			}
			// Record the request cost in analytics (micro-dollars), tied to the link.
			try {
				const micro = costMicroUsd(model, promptTokens, completionTokens);
				addSpent(micro);
				const code = body.link_code ? String(body.link_code).slice(0, 32) : null;
				// In dev we write to the same production DB - don't pollute the stats with tests.
				// Labels with tracking turned off ("Me") are not written at all - previously this
				// server-side insert bypassed the check and events still accumulated.
				if (micro > 0 && process.env.NODE_ENV === "production" && !(await isNoTrackLink(code))) {
					await db.insert(analyticsEvents).values({
						type: "ai_cost",
						path: "/ai-assistant",
						link_code: code,
						meta: String(micro),
					});
				}
			} catch {
				// analytics must not break the reply
			}
			return NextResponse.json({ answer });
		}
	} catch (e) {
		return vacationResponse(replyLang, "сбой при обращении к AI", e instanceof Error ? e.message : "неизвестно");
	}
}
