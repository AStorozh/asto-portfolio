import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/same-origin";
import { aiFetch } from "@/lib/ai-proxy";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { checkAiDailyCeiling } from "@/lib/ai-budget";

// Transcription of a voice message via OpenAI (whisper-1).
export async function POST(request: Request) {
	if (!isSameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
	// Audio transcription is paid too.
	const limited = rateLimit(`transcribe:${clientIp(request)}`, 10, 5 * 60_000);
	if (!limited.ok) return tooManyRequests(limited.retryAfter);

	// The site's daily AI ceiling has been reached: no new paid sessions today.
	if (!(await checkAiDailyCeiling())) {
		return NextResponse.json({ error: "Лимит AI на сегодня исчерпан." }, { status: 429 });
	}

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return NextResponse.json({ error: "OPENAI_API_KEY не задан в .env.local." }, { status: 500 });
	}

	let audio: FormDataEntryValue | null;
	try {
		const form = await request.formData();
		audio = form.get("audio");
	} catch {
		return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
	}

	if (!(audio instanceof Blob) || audio.size === 0) {
		return NextResponse.json({ error: "Аудио не получено." }, { status: 400 });
	}

	try {
		// Build multipart/form-data manually into a Buffer. Through the SOCKS proxy the request
		// goes via undici fetch (see lib/ai-proxy), and it doesn't serialize the global
		// FormData correctly - the text field model was lost, and OpenAI answered
		// "you must provide a model parameter". A Buffer body passes equally reliably
		// through both regular fetch and undici with the proxy dispatcher.
		const boundary = `----oai${randomUUID()}`;
		const audioBuf = Buffer.from(await audio.arrayBuffer());
		const body = Buffer.concat([
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`,
			),
			Buffer.from(
				`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="voice.webm"\r\nContent-Type: ${audio.type || "audio/webm"}\r\n\r\n`,
			),
			audioBuf,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);

		const res = await aiFetch("https://api.openai.com/v1/audio/transcriptions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": `multipart/form-data; boundary=${boundary}`,
			},
			body,
		});

		if (!res.ok) {
			const details = await res.text();
			return NextResponse.json({ error: "Не удалось распознать речь.", details }, { status: res.status });
		}

		const data = await res.json();
		return NextResponse.json({ text: data?.text ?? "" });
	} catch (e) {
		return NextResponse.json(
			{ error: "Сбой распознавания.", details: e instanceof Error ? e.message : "неизвестно" },
			{ status: 500 },
		);
	}
}
