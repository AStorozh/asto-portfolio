import { db } from "@/lib/db";
import { siteImages } from "@/lib/schema";
import { handleUpload } from "@/lib/upload-route";
import { revalidateContentFromRoute } from "@/lib/revalidate";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
	// SVG is saved as is (see storage) - works correctly both in <img> and as a favicon.
	return handleUpload(req, "site", async ({ url }, form) => {
		const slot = (form.get("slot") as string) || "logo";
		await db
			.insert(siteImages)
			.values({ slot, url })
			.onConflictDoUpdate({ target: siteImages.slot, set: { url } });
		revalidateContentFromRoute("/", "layout");
		return { url };
	});
}
