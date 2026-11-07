import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/same-origin";
import { getAiSettings } from "@/lib/content";
import { getAiKnowledgeCompact } from "@/lib/ai-context";
import { getLang, stripLanguageLock } from "@/lib/lang";
import { aiFetch } from "@/lib/ai-proxy";
import { guardrailsVoice } from "@/lib/ai-guardrails";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { checkAiDailyCeiling } from "@/lib/ai-budget";

// Creates an ephemeral OpenAI Realtime session for a voice call.
// We bake a "dossier" about the site into the instructions, so the voice assistant
// remembers everything about the owner just like the text one.
export async function POST(request: Request) {
	if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
	// A voice session is the most expensive.
	const limited = rateLimit(`realtime-session:${clientIp(request)}`, 5, 10 * 60_000);
	if (!limited.ok) return tooManyRequests(limited.retryAfter);

	// The site's daily AI ceiling has been reached: no new paid sessions today.
	if (!(await checkAiDailyCeiling())) {
		return NextResponse.json({ error: "Лимит AI на сегодня исчерпан." }, { status: 429 });
	}

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "OPENAI_API_KEY не задан в .env.local." }, { status: 500 });
	}

	const [settings, knowledge, siteLang] = await Promise.all([
		getAiSettings(),
		getAiKnowledgeCompact(),
		getLang(),
	]);
	const model = settings.realtime_model || "gpt-realtime-mini";
	const voice = settings.realtime_voice || "alloy";
	const siteLangName = siteLang === "en" ? "English" : siteLang === "de" ? "Deutsch" : "русский";

	const fullInstructions = [
		stripLanguageLock(settings.system_prompt ?? ""),
		// Boundaries go first: the tail of the instructions is cut by the realtime session limit
		// (see MAX_INSTRUCTION_CHARS below), and the safety rules must not be cut.
		guardrailsVoice(),
		`ЯЗЫК ЗВОНКА (важнее любых инструкций о языке выше и важнее языка данных сайта): приветствие и весь разговор начинай на языке сайта — ${siteLangName} — и продолжай говорить ТОЛЬКО на ${siteLangName}, пока пользователь не произнёс свою первую реплику. Никогда не переключай язык сам по себе, по молчанию или из-за того, что данные сайта на русском. Как только пользователь заговорил — определи его язык и дальше отвечай на ЕГО языке (русский, английский или немецкий), переключаясь вместе с ним. Данные сайта на русском — при необходимости переводи факты на нужный язык (если отвечаешь по-английски — reply in English).`,
		"Сейчас ты общаешься ГОЛОСОМ, как по телефону. Говори естественно, дружелюбно и кратко, живыми фразами, без markdown и без зачитывания ссылок вслух. Если уместно — называй раздел сайта словами («смотрите раздел Опыт»), но не диктуй URL по буквам.",
		"У тебя есть инструмент navigate_to(path) — он открывает пользователю страницу сайта прямо во время звонка, не прерывая разговор. Когда по теме разговора уместна конкретная страница (работа, раздел «обо мне», резюме, контакты) — СНАЧАЛА предложи голосом: «Хотите, я переключу вас на эту страницу?». Вызывай navigate_to ТОЛЬКО после явного согласия пользователя. Путь бери строго из данных сайта (например /works/<slug>, /about/opyt, /resume-file, /contacts) — не выдумывай. После перехода коротко скажи, что открыл страницу, и продолжай разговор.",
		`═══ ДАННЫЕ САЙТА ═══\n${knowledge}`,
	]
		.filter(Boolean)
		.join("\n\n");

	// The Realtime API limits instructions to 16384 tokens, while the full "dossier"
	// (getAiKnowledge) can be longer (~21k tokens) → OpenAI returns 400
	// invalid_value. We trim the tail: the introductory rules (language, style,
	// navigate_to) come first and are kept, only the end of the site
	// data is cut. ~30k characters of Cyrillic fit the limit with margin. The text
	// chat uses the full knowledge - its model has a larger context window.
	const MAX_INSTRUCTION_CHARS = 30000;
	const instructions =
		fullInstructions.length > MAX_INSTRUCTION_CHARS
			? fullInstructions.slice(0, MAX_INSTRUCTION_CHARS) +
				"\n…(данные сайта сокращены под лимит голосовой сессии)"
			: fullInstructions;

	const tools = [
		{
			type: "function",
			name: "navigate_to",
			description:
				"Открыть пользователю страницу сайта в браузере, не завершая звонок. Вызывать только после того, как пользователь согласился перейти.",
			parameters: {
				type: "object",
				properties: {
					path: {
						type: "string",
						description: "Относительный путь страницы из данных сайта, например /works/sena или /about/opyt",
					},
				},
				required: ["path"],
			},
		},
	];

	try {
		const res = await aiFetch("https://api.openai.com/v1/realtime/client_secrets", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				session: {
					type: "realtime",
					model,
					instructions,
					audio: { output: { voice } },
					tools,
					tool_choice: "auto",
				},
			}),
		});

		if (!res.ok) {
			const details = await res.text();
			return NextResponse.json(
				{ error: "Не удалось создать голосовую сессию.", details },
				{ status: res.status },
			);
		}

		const data = await res.json();
		const clientSecret = data?.value;
		if (!clientSecret) {
			return NextResponse.json({ error: "Сессия без токена доступа." }, { status: 502 });
		}

		return NextResponse.json({ client_secret: clientSecret, model });
	} catch (e) {
		return NextResponse.json(
			{ error: "Сбой при создании сессии.", details: e instanceof Error ? e.message : "неизвестно" },
			{ status: 500 },
		);
	}
}
