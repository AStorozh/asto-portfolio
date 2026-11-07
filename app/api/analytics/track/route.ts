import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/schema";
import { isNoTrackLink } from "@/lib/analytics-no-track";
import { countryFromTimeZone } from "@/lib/geo-tz";
import { isBotUA } from "@/lib/bot-filter";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// Public intake of analytics events. Anonymous: visitor_id = daily hash(ip+ua+secret),
// so no cookie banner is needed and no personal data is stored.

const ALLOWED_TYPES = new Set([
	"pageview",
	"page_time",
	"resume_download",
	"ai_message",
	"ai_task",
	"ai_call",
	"ai_call_end",
	"contact_click",
	"lang_switch",
	"outbound_click",
]);

function deviceFromUA(ua: string): string {
	if (/ipad|tablet/i.test(ua)) return "tablet";
	if (/mobi|android|iphone|ipod/i.test(ua)) return "mobile";
	return "desktop";
}

function clip(v: unknown, max: number): string | null {
	if (typeof v !== "string") return null;
	const s = v.trim();
	if (!s) return null;
	return s.slice(0, max);
}

export async function POST(req: Request) {
	// The endpoint is open to the whole internet and writes to the database. A live visitor sends
	// about ten events per visit; 60 per minute is the ceiling beyond which it is a flood.
	const limited = rateLimit(`track:${clientIp(req)}`, 60, 60_000);
	if (!limited.ok) return tooManyRequests(limited.retryAfter);

	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}

	const type = clip(body.type, 32);
	if (!type || !ALLOWED_TYPES.has(type)) {
		return NextResponse.json({ ok: false, error: "bad type" }, { status: 400 });
	}

	const path = clip(body.path, 512);
	// Never track the admin panel itself.
	if (path && path.startsWith("/admin")) return NextResponse.json({ ok: true, skipped: true });

	const link_code = clip(body.link_code, 32);
	// A link with tracking turned off (e.g. "Me") - the event is not recorded at all.
	if (await isNoTrackLink(link_code)) {
		return NextResponse.json({ ok: true, skipped: true });
	}

	const ua = req.headers.get("user-agent") ?? "";
	// Bots aren't wanted in the stats: a crawler that can execute JS looked like
	// a live visitor and inflated "direct visits".
	if (isBotUA(ua)) return NextResponse.json({ ok: true, skipped: true });
	// Our tracker always sends the browser's time zone. Without it the request came
	// not from a browser (a script hits the endpoint directly).
	if (!clip(body.tz, 64)) return NextResponse.json({ ok: true, skipped: true });
	const ip = clientIp(req);
	const ipRaw = ip === "unknown" ? "0.0.0.0" : ip;

	const day = new Date().toISOString().slice(0, 10);
	const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "analytics-salt";
	const visitor_id = crypto
		.createHash("sha256")
		.update(`${ipRaw}|${ua}|${day}|${secret}`)
		.digest("hex")
		.slice(0, 32);

	// Country: proxy headers if present (Vercel/Cloudflare), otherwise from the
	// browser time zone. On a VPS with nginx there are no such headers, and without the second
	// option the country was not filled in for any event at all.
	const country =
		clip(req.headers.get("x-vercel-ip-country"), 8) ||
		clip(req.headers.get("cf-ipcountry"), 8) ||
		countryFromTimeZone(clip(body.tz, 64)) ||
		null;

	try {
		await db.insert(analyticsEvents).values({
			type,
			path,
			referrer: clip(body.referrer, 512),
			link_code,
			visitor_id,
			session_id: clip(body.session_id, 64),
			lang: clip(body.lang, 8),
			device: deviceFromUA(ua),
			country,
			meta: clip(body.meta, 512),
		});
	} catch {
		return NextResponse.json({ ok: false }, { status: 500 });
	}

	return NextResponse.json({ ok: true });
}
