import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { CONTENT_TAG } from "@/lib/content";

// Resetting the site cache after edits made directly in the DB (bypassing the admin panel).
// The admin panel resets the cache itself on save; this endpoint is needed when texts,
// works or categories are changed by a script or an external agent.
// Access: a logged-in admin or the header Authorization: Bearer CRON_SECRET.
//
//   curl -X POST https://asto-portfolio.ru/api/revalidate -H "Authorization: Bearer $CRON_SECRET"
async function authorized(req: Request): Promise<boolean> {
	const secret = process.env.CRON_SECRET;
	const auth = req.headers.get("authorization") ?? "";
	if (secret) {
		const a = Buffer.from(auth);
		const b = Buffer.from(`Bearer ${secret}`);
		if (a.length === b.length && timingSafeEqual(a, b)) return true;
	}
	return isAdmin();
}

export async function POST(req: Request) {
	if (!(await authorized(req))) {
		return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
	}
	// expire: 0 - old data is no longer served, the next request takes fresh data from the DB.
	revalidateTag(CONTENT_TAG, { expire: 0 });
	revalidatePath("/", "layout");
	return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
