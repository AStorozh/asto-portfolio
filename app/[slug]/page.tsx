import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsLinks } from "@/lib/schema";
import { isLocalPath } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

// Pretty label links: /<slug> → redirect to the destination page with tracking
// (?ref=<slug>). Real site sections (resume, works, about, etc.) take
// priority over this catch-all, so their slugs are not intercepted here.
export default async function TrackedLinkPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	const [link] = await db.select().from(analyticsLinks).where(eq(analyticsLinks.code, slug));
	if (!link) notFound();

	const target = isLocalPath(link.target) ? link.target : "/";
	const sep = target.includes("?") ? "&" : "?";
	redirect(`${target}${sep}ref=${encodeURIComponent(link.code)}`);
}
