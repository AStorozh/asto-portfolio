import crypto from "node:crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ApiError } from "./http";

// Entry for Sena. Three rules:
// 1. While SENA_SITE_KEY is not in the environment (or is shorter than 32 characters), the API pretends it doesn't exist: 404.
//    Deploying the code to the server is safe - nothing opens until the key is set.
// 2. The key comes only in the Authorization: Bearer header (in the URL it would end up in logs), compared in constant time.
// 3. A wrong key from one address: after 10 attempts in 15 minutes - 429. A correct key always works,
//    but no more than 300 requests per minute for the whole API: Sena must not accidentally spin in a loop.

const MIN_KEY_LENGTH = 32;

function configuredKey(): string | null {
	const key = process.env.SENA_SITE_KEY ?? "";
	return key.length >= MIN_KEY_LENGTH ? key : null;
}

const digest = (s: string) => crypto.createHash("sha256").update(s).digest();

export function authorize(req: Request): void {
	const key = configuredKey();
	if (!key) throw new ApiError(404, "not_found", "Not found");

	const header = req.headers.get("authorization") ?? "";
	const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
	const ok = given.length > 0 && crypto.timingSafeEqual(digest(given), digest(key));

	if (!ok) {
		const verdict = rateLimit(`sena-api-fail:${clientIp(req)}`, 10, 15 * 60_000);
		if (!verdict.ok) throw new ApiError(429, "too_many_attempts", "Слишком много неверных попыток", { retryAfter: verdict.retryAfter });
		throw new ApiError(401, "unauthorized", "Нужен ключ: заголовок Authorization: Bearer <ключ>");
	}

	const total = rateLimit("sena-api-total", 300, 60_000);
	if (!total.ok) throw new ApiError(429, "too_many_requests", "Слишком много запросов", { retryAfter: total.retryAfter });
}
