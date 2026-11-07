// Labels with tracking turned off (e.g. "Me" - the owner's link): events from such
// links are not recorded at all. The check lives separately because it is needed by both
// the public event intake and server-side writes (AI answer cost): previously
// the cost was written bypassing it, and the "Me" label still accumulated events.

import { db } from "@/lib/db";
import { analyticsLinks } from "@/lib/schema";
import { eq } from "drizzle-orm";

let codes = new Set<string>();
let fetchedAt = 0;

export async function isNoTrackLink(code: string | null | undefined): Promise<boolean> {
	if (!code) return false;
	const now = Date.now();
	if (now - fetchedAt > 60_000) {
		try {
			const rows = await db
				.select({ code: analyticsLinks.code })
				.from(analyticsLinks)
				.where(eq(analyticsLinks.tracking, false));
			codes = new Set(rows.map((r) => r.code));
			fetchedAt = now;
		} catch {
			// on a DB failure don't block tracking
		}
	}
	return codes.has(code);
}
