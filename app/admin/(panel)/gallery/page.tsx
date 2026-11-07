import { getGalleryImages, getAllSiteImages } from "@/lib/content";
import { SlotAssignment, MasterGalleryUploader, MasterGalleryGrid } from "./gallery-client";

export default async function AdminGalleryPage() {
	const [images, siteImagesMap] = await Promise.all([
		getGalleryImages(),
		getAllSiteImages(),
	]);

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
				<h1 className="text-base font-bold">Медиатека</h1>
				<p className="mt-0.5 text-[12px] text-muted-foreground">
					{images.length}{" "}
					{images.length === 1
						? "файл"
						: images.length < 5
						? "файла"
						: "файлов"}
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-8">

					{/* 1. Site image slots */}
					<div className="flex flex-col gap-3">
						<p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							Блоки сайта
						</p>
						<SlotAssignment images={images} slotValues={siteImagesMap} />
					</div>

					{/* 2. All uploaded files */}
					<div className="flex flex-col gap-3">
						<p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							Все файлы
						</p>
						<MasterGalleryUploader />
						<MasterGalleryGrid images={images} />
					</div>

				</div>
			</div>
		</div>
	);
}
