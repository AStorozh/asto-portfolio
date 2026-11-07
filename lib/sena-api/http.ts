// Shared bits of the private API for Sena: errors, responses and request body parsing.
// The API lives separately from the site (lib/sena-api + app/api/sena) and changes nothing in it
// until the SENA_SITE_KEY key is set.

export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public details?: unknown,
	) {
		super(message);
	}
}

/**
 * Reason for the error for the server log. A database driver error contains the whole SQL and the query parameters, i.e. the edit texts:
 * take only the first line of the message (truncated) and the message of the real cause.
 */
export function errorReason(e: unknown): string {
	if (!(e instanceof Error)) return String(e).slice(0, 200);
	const cause = e.cause instanceof Error ? e.cause.message.split("\n")[0].slice(0, 200) : "";
	return `${e.message.split("\n")[0].slice(0, 120)}${cause ? ` — ${cause}` : ""}`;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		// Responses to Sena must not be cached by the browser or a proxy: they hold live data.
		headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
	});
}

export function errorResponse(e: ApiError): Response {
	return json({ error: { code: e.code, message: e.message, details: e.details ?? null } }, e.status);
}

const MAX_BODY_BYTES = 512_000;

/** The request body as a JSON object. An empty body is an empty object. Too large or malformed - 400/413. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
	const raw = await req.text();
	if (raw.length > MAX_BODY_BYTES) throw new ApiError(413, "too_large", "Тело запроса больше 500 КБ");
	if (!raw.trim()) return {};
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		throw new ApiError(400, "bad_json", "Тело запроса — не JSON");
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new ApiError(400, "bad_json", "Тело запроса должно быть JSON-объектом");
	}
	return value as Record<string, unknown>;
}

// ─── Value checks ──────────────────────────────────────────────────────────────

export function bad(message: string, details?: unknown): never {
	throw new ApiError(422, "validation", message, details);
}

export function text(value: unknown, name: string, opts: { max: number; allowEmpty?: boolean }): string {
	if (typeof value !== "string") bad(`Поле «${name}» должно быть строкой`);
	if (value.length > opts.max) bad(`Поле «${name}» длиннее ${opts.max} знаков`);
	// Postgres doesn't accept a null byte, and control characters are not needed in site text.
	if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) bad(`В поле «${name}» есть управляющие знаки`);
	if (!opts.allowEmpty && !value.trim()) bad(`Поле «${name}» не должно быть пустым`);
	return value;
}

export function flag(value: unknown, name: string): boolean {
	if (typeof value !== "boolean") bad(`Поле «${name}» должно быть true или false`);
	return value;
}

export function lines(value: unknown, name: string, opts: { maxItems: number; maxLen: number }): string[] {
	if (!Array.isArray(value)) bad(`Поле «${name}» должно быть списком строк`);
	if (value.length > opts.maxItems) bad(`В поле «${name}» больше ${opts.maxItems} пунктов`);
	return value.map((v, i) => text(v, `${name}[${i}]`, { max: opts.maxLen }).trim()).filter(Boolean);
}

/** A safe URL for a link on the page: only http(s), mail and phone. javascript: and data: are rejected. */
export function safeHref(value: unknown, name: string): string {
	const href = text(value, name, { max: 2000 }).trim();
	if (!/^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s()\-]*)$/i.test(href)) {
		bad(`Поле «${name}» должно быть адресом http(s), mailto: или tel:`);
	}
	return href;
}

/** Only known body fields: a typo in a field name is an error, not a silently lost edit. */
export function onlyKnown(body: Record<string, unknown>, known: readonly string[]): void {
	const extra = Object.keys(body).filter((k) => !known.includes(k));
	if (extra.length) bad(`Неизвестные поля: ${extra.join(", ")}`, { allowed: known });
}
