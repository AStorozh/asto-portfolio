import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
	ADMIN_COOKIE,
	SESSION_TTL_SECONDS,
	createSessionToken,
	verifyPassword,
} from "@/lib/admin-session";

export async function POST(req: Request) {
	// There is a single permanent password, so brute force is the main threat to the admin.
	// Five attempts per 15 minutes from one address: enough for a human, not for brute force.
	const limited = rateLimit(`login:${clientIp(req)}`, 5, 15 * 60_000);
	if (!limited.ok) return tooManyRequests(limited.retryAfter);

	let password = "";
	try {
		const body = await req.json();
		password = String(body?.password ?? "");
	} catch {
		// invalid JSON - keep an empty password
	}

	if (!process.env.ADMIN_PASSWORD) {
		return NextResponse.json(
			{ ok: false, error: "ADMIN_PASSWORD не задан на сервере (.env.local)." },
			{ status: 500 },
		);
	}

	if (!(await verifyPassword(password))) {
		return NextResponse.json({ ok: false, error: "Неверный код доступа." }, { status: 401 });
	}

	const res = NextResponse.json({ ok: true });
	res.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: SESSION_TTL_SECONDS,
	});
	return res;
}
