import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";

// Server-side protection of all /admin pages (Next 16 proxy, formerly middleware).
// Without a valid session the pages are not even served - unlike the old
// client-side "guard".
export async function proxy(req: NextRequest) {
	const { pathname } = req.nextUrl;

	// Project presentation site (/sena, /luma) - only with a trailing slash, see next.config.ts.
	if (pathname === "/sena" || pathname === "/luma") return NextResponse.redirect(new URL(`${pathname}/`, req.url), 308);
	if (!pathname.startsWith("/admin")) return NextResponse.next();

	const authed = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);

	if (pathname === "/admin/login") {
		if (authed) {
			const from = req.nextUrl.searchParams.get("from");
			const dest = from && from.startsWith("/admin") ? from : "/admin/design";
			return NextResponse.redirect(new URL(dest, req.url));
		}
		return NextResponse.next();
	}

	// Any other /admin/* requires login.
	if (!authed) {
		const url = new URL("/admin/login", req.url);
		if (pathname && pathname !== "/admin") url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/admin/:path*", "/sena", "/luma"],
};
