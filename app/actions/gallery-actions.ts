"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import { deleteUpload } from "@/lib/storage";
import { galleryImages, personalGalleryImages, siteImages } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidateContent } from "@/lib/revalidate";

export async function deleteGalleryImage(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	if (!id) return;

	const [row] = await db
		.select({ url: galleryImages.url, storage_key: galleryImages.storage_key, media_type: galleryImages.media_type })
		.from(galleryImages)
		.where(eq(galleryImages.id, id));

	await db.delete(galleryImages).where(eq(galleryImages.id, id));

	if (row) {
		await deleteUpload({ url: row.url });
	}

	revalidateContent("/admin/gallery");
}

export async function addToPersonalGallery(fd: FormData) {
	await requireAdmin();
	const galleryImageId = Number(fd.get("gallery_image_id"));
	if (!galleryImageId) return;

	await db
		.insert(personalGalleryImages)
		.values({ gallery_image_id: galleryImageId })
		.onConflictDoNothing();

	revalidateContent("/admin/gallery");
	revalidateContent("/about/personal");
}

export async function removeFromPersonalGallery(fd: FormData) {
	await requireAdmin();
	const galleryImageId = Number(fd.get("gallery_image_id"));
	if (!galleryImageId) return;

	await db
		.delete(personalGalleryImages)
		.where(eq(personalGalleryImages.gallery_image_id, galleryImageId));

	revalidateContent("/admin/gallery");
	revalidateContent("/about/personal");
}

export async function updatePersonalGalleryOrder(ids: number[]) {
	await requireAdmin();
	if (ids.length === 0) return;
	await Promise.all(
		ids.map((id, i) =>
			db.update(personalGalleryImages).set({ sort_order: i }).where(eq(personalGalleryImages.id, id)),
		),
	);
	revalidateContent("/admin/gallery");
	revalidateContent("/about/personal");
}

export async function assignSiteImage(fd: FormData) {
	await requireAdmin();
	const slot = fd.get("slot") as string;
	const url = (fd.get("url") as string) || null;
	if (!slot) return;

	await db
		.insert(siteImages)
		.values({ slot, url })
		.onConflictDoUpdate({ target: siteImages.slot, set: { url } });

	revalidateContent("/admin/gallery");
	revalidateContent("/");
	revalidateContent("/about");
	revalidateContent("/resume-file");
	revalidateContent("/resume-file/embed");
	revalidateContent("/resume-file/print");
}
