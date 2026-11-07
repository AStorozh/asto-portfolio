"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToPersonalGallery, removeFromPersonalGallery, updatePersonalGalleryOrder } from "@/app/actions/gallery-actions";
import { mediaUrl, mediaVideoThumb } from "@/lib/media-url";
import { ImagePickerModal } from "../gallery/gallery-client";
import { PersonalGalleryGrid } from "@/app/about/personal/personal-gallery-grid";

type GalleryImage = { id: number; url: string; filename: string; media_type: string };
type PersonalImage = { id: number; gallery_image_id: number; url: string; filename: string; media_type: string };

// Width of the real /about/personal page (container max-w-5xl). The preview
// computes the layout from it, then scales visually to fit the narrow panel,
// so the column count and placement match the site one to one.
const REFERENCE_WIDTH = 1024;

function ScaledGalleryPreview({ items }: { items: { id: number; url: string; filename: string; media_type: string }[] }) {
	const outerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const [innerH, setInnerH] = useState(0);

	useEffect(() => {
		const el = outerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / REFERENCE_WIDTH)));
		ro.observe(el);
		setScale(Math.min(1, el.clientWidth / REFERENCE_WIDTH));
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const el = innerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => setInnerH(e.contentRect.height));
		ro.observe(el);
		setInnerH(el.clientHeight);
		return () => ro.disconnect();
	}, []);

	return (
		<div ref={outerRef} className="overflow-hidden" style={{ height: innerH * scale }}>
			<div ref={innerRef} style={{ width: REFERENCE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
				<PersonalGalleryGrid items={items} width={REFERENCE_WIDTH} />
			</div>
		</div>
	);
}

export function PersonalGalleryAdmin({
	initialItems,
	allImages,
}: {
	initialItems: PersonalImage[];
	allImages: GalleryImage[];
}) {
	const router = useRouter();
	const [items, setItems] = useState(initialItems);
	const [pending, startTransition] = useTransition();
	const [showPicker, setShowPicker] = useState(false);

	const latestItems = useRef(items);
	latestItems.current = items;
	const dragIndex = useRef<number | null>(null);

	const selectedGalleryIds = new Set(items.map((i) => i.gallery_image_id));
	const available = allImages.filter((i) => !selectedGalleryIds.has(i.id));

	function handleAdd(selected: GalleryImage[]) {
		if (selected.length === 0) return;
		startTransition(async () => {
			for (const img of selected) {
				const fd = new FormData();
				fd.set("gallery_image_id", img.id.toString());
				await addToPersonalGallery(fd);
			}
			router.refresh();
		});
	}

	function handleRemove(galleryImageId: number) {
		setItems((prev) => prev.filter((i) => i.gallery_image_id !== galleryImageId));
		const fd = new FormData();
		fd.set("gallery_image_id", galleryImageId.toString());
		startTransition(() => removeFromPersonalGallery(fd));
	}

	function handleDragStart(index: number) {
		dragIndex.current = index;
	}

	function handleDragOver(e: React.DragEvent, targetIndex: number) {
		e.preventDefault();
		const sourceIndex = dragIndex.current;
		if (sourceIndex === null || sourceIndex === targetIndex) return;
		setItems((prev) => {
			const next = [...prev];
			const [item] = next.splice(sourceIndex, 1);
			next.splice(targetIndex, 0, item);
			return next;
		});
		dragIndex.current = targetIndex;
	}

	function handleDragEnd() {
		dragIndex.current = null;
		const ids = latestItems.current.map((i) => i.id);
		startTransition(() => updatePersonalGalleryOrder(ids));
	}

	const previewItems = items.map((item) => ({
		id: item.id,
		url: item.url,
		filename: item.filename,
		media_type: item.media_type,
	}));

	return (
		<>
			{showPicker && (
				<ImagePickerModal
					images={available}
					mode="multi"
					onConfirmMulti={handleAdd}
					onClose={() => setShowPicker(false)}
				/>
			)}

			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
				{/* ── Left panel: ordered list ── */}
				<div className="flex w-full shrink-0 flex-col border-b border-border/60 md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
					<div className="flex flex-col gap-3 p-3 sm:p-4">
						<button
							onClick={() => setShowPicker(true)}
							disabled={pending || available.length === 0}
							className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
						>
							<span className="text-base leading-none">+</span>
							Добавить медиа
						</button>

						{items.length === 0 ? (
							<p className="py-4 text-center text-sm text-muted-foreground">
								Нет выбранных медиа
							</p>
						) : (
							<div className="flex flex-col gap-1.5">
								{items.map((item, index) => (
									<div
										key={item.id}
										draggable
										onDragStart={() => handleDragStart(index)}
										onDragOver={(e) => handleDragOver(e, index)}
										onDragEnd={handleDragEnd}
										className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-border/60 p-2 transition-opacity active:cursor-grabbing active:opacity-60"
									>
										{/* Order badge */}
										<span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground">
											{index + 1}
										</span>

										{/* Thumbnail */}
										<div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted/30">
											<img
												src={
													item.media_type === "video"
														? mediaVideoThumb(item.url)
														: mediaUrl(item.url, { w: 160 })
												}
												alt=""
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										</div>

										{/* Filename */}
										<span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
											{item.filename}
										</span>

										{/* Drag handle */}
										<span className="shrink-0 text-[14px] text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/70">
											⠿
										</span>

										{/* Delete */}
										<button
											type="button"
											onClick={() => handleRemove(item.gallery_image_id)}
											disabled={pending}
											className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] text-muted-foreground opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
											aria-label="Убрать"
										>
											✕
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* ── Right panel: live preview ── */}
				<div className="min-w-0 flex-1 md:overflow-y-auto">
					<div className="p-3 sm:p-6">
						<div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
							<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Предпросмотр
							</span>
							<span className="text-[11px] text-muted-foreground">
								{items.length} медиа
							</span>
							{pending && (
								<span className="text-[11px] text-muted-foreground/60">
									Сохранение…
								</span>
							)}
						</div>

						{items.length === 0 ? (
							<div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 py-24 text-sm text-muted-foreground">
								Добавьте медиа чтобы увидеть предпросмотр
							</div>
						) : (
							<ScaledGalleryPreview items={previewItems} />
						)}
					</div>
				</div>
			</div>
		</>
	);
}
