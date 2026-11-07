// Server-side admin session: a signed token (HMAC-SHA256) in an httpOnly cookie.
// Web Crypto API only - the module works safely both in middleware (edge) and in the
// Node runtime. Does NOT import next/headers (it would break in middleware).

export const ADMIN_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();

function getSecret(): string {
	const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
	if (!secret) {
		// Better to fail loudly than to sign with a predictable key.
		throw new Error("ADMIN_SESSION_SECRET (или ADMIN_PASSWORD) не задан в .env");
	}
	return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
	let s = input.replace(/-/g, "+").replace(/_/g, "/");
	while (s.length % 4) s += "=";
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function sign(data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(getSecret()),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
	return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return mismatch === 0;
}

export async function createSessionToken(): Promise<string> {
	const payload = bytesToBase64Url(
		encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 })),
	);
	const sig = await sign(payload);
	return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
	if (!token) return false;
	const [payload, sig] = token.split(".");
	if (!payload || !sig) return false;

	let expected: string;
	try {
		expected = await sign(payload);
	} catch {
		return false;
	}
	if (!timingSafeEqual(sig, expected)) return false;

	try {
		const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
		return typeof data?.exp === "number" && data.exp > Date.now();
	} catch {
		return false;
	}
}

// Constant-time password comparison: hash both values so that the
// length/match doesn't leak through timing.
export async function verifyPassword(input: string): Promise<boolean> {
	const expected = process.env.ADMIN_PASSWORD;
	if (!expected) return false;
	const [a, b] = await Promise.all([sign(input), sign(expected)]);
	return timingSafeEqual(a, b);
}
