"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import { aboutBlockTexts } from "@/lib/schema";
import { revalidateContent } from "@/lib/revalidate";

export async function saveAboutBlockText(fd: FormData) {
	await requireAdmin();
	const slug = fd.get("slug") as string;
	const content = (fd.get("content") as string) ?? "";
	const contentEn = (fd.get("content_en") as string) ?? "";
	const contentDe = (fd.get("content_de") as string) ?? "";
	if (!slug) return;

	// The Russian text is the main record, translations are shadow records `${slug}__<lang>`.
	// An empty translation is allowed: the page in that language then shows the Russian text.
	await db
		.insert(aboutBlockTexts)
		.values({ slug, content })
		.onConflictDoUpdate({ target: aboutBlockTexts.slug, set: { content } });

	for (const [lang, c] of [["en", contentEn], ["de", contentDe]] as const) {
		await db
			.insert(aboutBlockTexts)
			.values({ slug: `${slug}__${lang}`, content: c })
			.onConflictDoUpdate({ target: aboutBlockTexts.slug, set: { content: c } });
	}

	revalidateContent(`/about/${slug}`);
	revalidateContent("/admin/about");
}
