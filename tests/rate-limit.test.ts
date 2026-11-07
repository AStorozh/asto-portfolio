import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });

describe("clientIp", () => {
	it("takes the address nginx appended, not the one the client sent", () => {
		expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
	});

	it("handles a single address", () => {
		expect(clientIp(req({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
	});

	it("falls back to X-Real-IP, then to 'unknown'", () => {
		expect(clientIp(req({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
		expect(clientIp(req({}))).toBe("unknown");
	});
});

describe("rateLimit", () => {
	afterEach(() => vi.useRealTimers());

	it("allows up to the limit, then blocks with a retry delay", () => {
		const key = `test-${Math.random()}`;
		for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
		const blocked = rateLimit(key, 3, 60_000);
		expect(blocked.ok).toBe(false);
		if (!blocked.ok) expect(blocked.retryAfter).toBeGreaterThan(0);
	});

	it("opens again after the window", () => {
		vi.useFakeTimers();
		const key = `test-${Math.random()}`;
		rateLimit(key, 1, 1_000);
		expect(rateLimit(key, 1, 1_000).ok).toBe(false);
		vi.advanceTimersByTime(1_001);
		expect(rateLimit(key, 1, 1_000).ok).toBe(true);
	});

	it("keeps keys independent", () => {
		const a = `a-${Math.random()}`;
		const b = `b-${Math.random()}`;
		rateLimit(a, 1, 60_000);
		expect(rateLimit(a, 1, 60_000).ok).toBe(false);
		expect(rateLimit(b, 1, 60_000).ok).toBe(true);
	});
});

describe("tooManyRequests", () => {
	it("returns 429 with Retry-After", async () => {
		const res = tooManyRequests(42);
		expect(res.status).toBe(429);
		expect(res.headers.get("Retry-After")).toBe("42");
		expect(await res.json()).toMatchObject({ retryAfter: 42 });
	});
});
