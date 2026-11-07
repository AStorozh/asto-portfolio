// Request rate limiting. Counters live in process memory: the site runs as a
// single PM2 instance, so there is no need to set up external storage for this. On
// restart the counters reset - for brute-force and flood protection this is
// acceptable, a password can't be guessed in seconds anyway.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Every 10 minutes drop expired entries so the map doesn't grow forever
// (otherwise a brute force over random IPs would bloat it).
let lastSweep = Date.now();
function sweep(now: number) {
	if (now - lastSweep < 10 * 60_000) return;
	lastSweep = now;
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * Allows at most `limit` hits per key within `windowMs`.
 * The key is usually "rule name + IP".
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	sweep(now);

	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { ok: true };
	}

	if (bucket.count >= limit) {
		return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
	}

	bucket.count++;
	return { ok: true };
}

// Client IP. The app listens on 127.0.0.1 only, so every request comes through nginx.
// nginx appends the real peer address to the END of X-Forwarded-For; anything before it
// was sent by the client and can be forged. So take the LAST element, never the first.
export function clientIp(req: Request): string {
	const forwarded = req.headers.get("x-forwarded-for");
	if (forwarded) {
		const last = forwarded.split(",").pop()?.trim();
		if (last) return last;
	}
	return req.headers.get("x-real-ip") ?? "unknown";
}

// A ready "too often" response with a header telling the client
// when it can retry.
export function tooManyRequests(retryAfter: number): Response {
	return new Response(JSON.stringify({ error: "too many requests", retryAfter }), {
		status: 429,
		headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
	});
}
