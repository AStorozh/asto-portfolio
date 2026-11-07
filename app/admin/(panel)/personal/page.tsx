import { getGalleryImages, getPersonalGalleryImages } from "@/lib/content";
import { PersonalGalleryAdmin } from "./personal-gallery-admin";

export default async function AdminPersonalGalleryPage() {
	const [allImages, personalImages] = await Promise.all([
		getGalleryImages(),
		getPersonalGalleryImages(),
	]);

	const personalKey = personalImages
		.map((i) => i.gallery_image_id)
		.sort()
		.join("-");

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
				<h1 className="text-base font-bold">Страница «Галерея»</h1>
				<p className="mt-0.5 text-[12px] text-muted-foreground">
					Добавляйте медиа и меняйте порядок — предпросмотр обновляется мгновенно
				</p>
			</div>
			<PersonalGalleryAdmin
				key={personalKey}
				initialItems={personalImages}
				allImages={allImages}
			/>
		</div>
	);
}
