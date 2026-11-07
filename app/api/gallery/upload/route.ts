import { db } from "@/lib/db";
import { galleryImages } from "@/lib/schema";
import { handleUpload } from "@/lib/upload-route";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
	return handleUpload(req, "gallery", async ({ url, key, mediaType, width, height }, form) => {
		const name = (form.get("file") as File).name;
		const [row] = await db
			.insert(galleryImages)
			.values({ url, filename: name, media_type: mediaType, storage_key: key, width, height })
			.returning({ id: galleryImages.id, url: galleryImages.url });
		return { id: row?.id, url: row?.url ?? url, mediaType };
	});
}
