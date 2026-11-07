"use client";

import { useRef, useState, useTransition } from "react";
import { isVideoUrl } from "@/lib/media-url";
import {
	deleteGalleryImage,
	assignSiteImage,
} from "@/app/actions/gallery-actions";
import { mediaUrl, mediaPoster, mediaVideoThumb } from "@/lib/media-url";

export type GalleryImage = { id: number; url: string; filename: string; media_type: string };

export const SITE_SLOTS = [
	{ key: "home_works_bg",        label: "Главная — фон блока «Работы»" },
	{ key: "home_about_bg",        label: "Главная — фон блока «Обо мне»" },
	{ key: "about_who_bg",         label: "Страница «Обо мне» — фон блока «КТО Я»" },
	{ key: "about_personality_bg", label: "Страница «Обо мне» — фон блока «ГАЛЕРЕЯ»" },
	{ key: "resume_photo",         label: "Резюме — фото" },
] as const;

// ─── Shared thumbnail ─────────────────────────────────────────────────────────

function MediaThumb({
	img,
	selected,
	onClick,
	className = "",
}: {
	img: GalleryImage;
	selected?: boolean;
	onClick?: () => void;
	className?: string;
}) {
	return (
		<div
			onClick={onClick}
			className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
				onClick ? "cursor-pointer" : ""
			} ${
				selected
					? "border-foreground ring-2 ring-foreground/30"
					: "border-transparent hover:border-foreground/40"
			} ${className}`}
		>
			<img
				src={img.media_type === "video" ? mediaVideoThumb(img.url) : mediaUrl(img.url, { w: 300 })}
				alt={img.filename}
				className="h-full w-full object-cover"
				loading="lazy"
			/>
			{img.media_type === "video" && (
				<span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
					▶
				</span>
			)}
			{selected && (
				<div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
						✓
					</span>
				</div>
			)}
		</div>
	);
}

// ─── Image picker modal ───────────────────────────────────────────────────────

export function ImagePickerModal({
	images,
	mode,
	excludeIds,
	onSelectSingle,
	onConfirmMulti,
	onClose,
}: {
	images: GalleryImage[];
	mode: "single" | "multi";
	excludeIds?: Set<number>;
	onSelectSingle?: (img: GalleryImage) => void;
	onConfirmMulti?: (imgs: GalleryImage[]) => void;
	onClose: () => void;
}) {
	const [selected, setSelected] = useState<Set<number>>(new Set());
	const visible = excludeIds ? images.filter((i) => !excludeIds.has(i.id)) : images;

	function toggle(img: GalleryImage) {
		if (mode === "single") {
			onSelectSingle?.(img);
			onClose();
			return;
		}
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(img.id)) next.delete(img.id);
			else next.add(img.id);
			return next;
		});
	}

	function handleConfirm() {
		const imgs = visible.filter((i) => selected.has(i.id));
		onConfirmMulti?.(imgs);
		onClose();
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-background shadow-2xl mx-4"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
					<span className="text-sm font-semibold">
						{mode === "multi" ? "Выбрать медиа" : "Выбрать изображение"}
					</span>
					<button
						onClick={onClose}
						className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors text-sm"
					>
						✕
					</button>
				</div>

				{/* Grid */}
				<div className="flex-1 overflow-y-auto p-4">
					{visible.length === 0 ? (
						<p className="py-12 text-center text-sm text-muted-foreground">
							Нет доступных файлов
						</p>
					) : (
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
							{visible.map((img) => (
								<MediaThumb
									key={img.id}
									img={img}
									selected={mode === "multi" ? selected.has(img.id) : false}
									onClick={() => toggle(img)}
								/>
							))}
						</div>
					)}
				</div>

				{/* Footer (multi only) */}
				{mode === "multi" && (
					<div className="flex items-center justify-between border-t border-border/60 px-4 py-3 sm:px-5 sm:py-4">
						<span className="text-sm text-muted-foreground">
							Выбрано: {selected.size}
						</span>
						<button
							onClick={handleConfirm}
							disabled={selected.size === 0}
							className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity disabled:opacity-40"
						>
							Добавить
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Slot assignment ──────────────────────────────────────────────────────────

export function SlotAssignment({
	images,
	slotValues,
}: {
	images: GalleryImage[];
	slotValues: Record<string, string>;
}) {
	const [pending, startTransition] = useTransition();
	const [savedSlot, setSavedSlot] = useState<string | null>(null);
	const [openSlot, setOpenSlot] = useState<string | null>(null);
	// Local copy so preview updates immediately after assignment without waiting for page re-render
	const [localSlotValues, setLocalSlotValues] = useState(slotValues);

	function handleAssign(slot: string, url: string) {
		// Optimistic update — show new image right away
		setLocalSlotValues((prev) => ({ ...prev, [slot]: url }));
		const fd = new FormData();
		fd.set("slot", slot);
		fd.set("url", url);
		startTransition(async () => {
			await assignSiteImage(fd);
			setSavedSlot(slot);
			setTimeout(() => setSavedSlot(null), 2500);
		});
	}

	return (
		<>
			{openSlot && (
				<ImagePickerModal
					images={images}
					mode="single"
					onSelectSingle={(img) => handleAssign(openSlot, img.url)}
					onClose={() => setOpenSlot(null)}
				/>
			)}

			<div className="flex flex-col gap-3">
				{SITE_SLOTS.map(({ key, label }) => {
					const currentUrl = localSlotValues[key];
					return (
						<div
							key={key}
							className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background p-4"
						>
							{/* Preview */}
							<div className="shrink-0">
								{currentUrl ? (
									isVideoUrl(currentUrl) ? (
										<video
											src={currentUrl}
											poster={mediaPoster(currentUrl) || undefined}
											preload="none"
											className="h-16 w-24 rounded-xl object-cover border border-border/70"
											muted
											playsInline
										/>
									) : (
										<img
											src={mediaUrl(currentUrl, { w: 200 })}
											alt=""
											className="h-16 w-24 rounded-xl object-cover border border-border/70"
										/>
									)
								) : (
									<div className="flex h-16 w-24 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-[11px] text-muted-foreground">
										не задан
									</div>
								)}
							</div>

							{/* Labels */}
							<div className="min-w-0 flex-1">
								<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
									{key}
								</p>
								<p className="text-sm font-semibold">{label}</p>
								{savedSlot === key && (
									<p className="mt-0.5 text-xs font-medium text-green-600">Сохранено ✓</p>
								)}
							</div>

							{/* Actions */}
							<div className="flex shrink-0 flex-col gap-1.5">
								<button
									onClick={() => setOpenSlot(key)}
									disabled={pending}
									className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
								>
									Выбрать
								</button>
								{currentUrl && (
									<button
										onClick={() => handleAssign(key, "")}
										disabled={pending}
										className="rounded-lg border border-border/70 px-3 py-1.5 text-xs text-muted-foreground hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
									>
										Убрать
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}

// ─── Master gallery ───────────────────────────────────────────────────────────

type UploadPhase = "sending" | "processing";

// Limit per video. Checked before sending,
// so we don't wait for a pointless 400 MB upload only to get a 413 error.
const MAX_VIDEO_MB = 100;

function uploadWithProgress(
	file: File,
	onProgress: (pct: number, phase: UploadPhase) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const fd = new FormData();
		fd.append("file", file);
		xhr.upload.addEventListener("progress", (e) => {
			if (e.lengthComputable) {
				const pct = Math.round((e.loaded / e.total) * 100);
				onProgress(pct, "sending");
			}
		});
		xhr.upload.addEventListener("load", () => {
			// the file reached the server - processing and saving come next
			onProgress(100, "processing");
		});
		xhr.addEventListener("load", () => {
			if (xhr.status < 400) return resolve();
			let msg = `HTTP ${xhr.status}`;
			try {
				const body = JSON.parse(xhr.responseText);
				if (body?.error) msg = body.httpCode === 413 ? "файл слишком большой (лимит 100 МБ)" : String(body.error);
			} catch {}
			reject(new Error(msg));
		});
		xhr.addEventListener("error", () => reject(new Error("сеть недоступна")));
		xhr.open("POST", "/api/gallery/upload");
		xhr.send(fd);
	});
}

export function MasterGalleryUploader() {
	const [queue, setQueue] = useState<File[]>([]);
	const [current, setCurrent] = useState(0);
	const [progress, setProgress] = useState(0);
	const [phase, setPhase] = useState<UploadPhase>("sending");
	const [error, setError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const uploading = queue.length > 0;

	async function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		setError(null);
		const list = Array.from(files);

		// Reject videos that are too heavy up front with a clear message.
		const tooBig = list.filter(
			(f) => f.type.startsWith("video/") && f.size > MAX_VIDEO_MB * 1024 * 1024,
		);
		if (tooBig.length > 0) {
			const names = tooBig
				.map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(0)} МБ)`)
				.join(", ");
			setError(`Видео больше ${MAX_VIDEO_MB} МБ нельзя загрузить: ${names}. Сожмите файл и попробуйте снова.`);
			return;
		}

		setQueue(list);
		try {
			for (let i = 0; i < list.length; i++) {
				setCurrent(i);
				setProgress(0);
				setPhase("sending");
				await uploadWithProgress(list[i], (pct, ph) => {
					setProgress(pct);
					setPhase(ph);
				});
			}
		} catch (e) {
			setQueue([]);
			setError(`Не удалось загрузить «${list[current]?.name ?? ""}»: ${e instanceof Error ? e.message : String(e)}`);
			return;
		}

		setQueue([]);
		window.location.reload();
	}

	return (
		<label
			className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-6 py-8 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/40"
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
		>
			{uploading ? (
				<div className="flex w-full max-w-xs flex-col items-center gap-2.5 pointer-events-none select-none">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-foreground">
							Файл {current + 1} из {queue.length}
						</span>
						<span className="text-[11px] text-muted-foreground">
							{phase === "sending" ? "отправка" : "загрузка в облако…"}
						</span>
					</div>
					<span className="max-w-full truncate text-[12px] text-muted-foreground">
						{queue[current]?.name}
					</span>

					{phase === "sending" ? (
						<>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
								<div
									className="h-full rounded-full bg-foreground transition-all duration-150"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<span className="text-[12px] font-medium tabular-nums">{progress}%</span>
						</>
					) : (
						<>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
								<div className="h-full w-full rounded-full bg-foreground/40 origin-left animate-pulse" />
							</div>
							<span className="text-[12px] text-muted-foreground">
								Обрабатываем файл…
							</span>
						</>
					)}
				</div>
			) : (
				<>
					<span className="text-2xl">↑</span>
					<span className="font-medium">Загрузить фото или видео</span>
					<span className="text-[12px] text-muted-foreground/70">
						Можно несколько — кликните или перетащите
					</span>
					{error && (
						<span className="mt-1 max-w-xs text-center text-[12px] font-medium text-red-500">
							{error}
						</span>
					)}
				</>
			)}
			<input
				ref={fileRef}
				type="file"
				accept="image/*,video/*"
				multiple
				className="sr-only"
				disabled={uploading}
				onChange={(e) => handleFiles(e.target.files)}
			/>
		</label>
	);
}

export function MasterGalleryGrid({ images }: { images: GalleryImage[] }) {
	const [pending, startTransition] = useTransition();
	const [deletingId, setDeletingId] = useState<number | null>(null);

	function handleDelete(img: GalleryImage) {
		setDeletingId(img.id);
		const fd = new FormData();
		fd.set("id", img.id.toString());
		fd.set("url", img.url);
		startTransition(async () => {
			await deleteGalleryImage(fd);
			setDeletingId(null);
		});
	}

	if (images.length === 0) {
		return (
			<p className="py-4 text-center text-sm text-muted-foreground">
				Нет загруженных файлов
			</p>
		);
	}

	return (
		<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
			{images.map((img) => {
				return (
					<div
						key={img.id}
						className="group relative aspect-square overflow-hidden rounded-xl border border-border/70"
					>
						<img
							src={img.media_type === "video" ? mediaVideoThumb(img.url) : mediaUrl(img.url, { w: 400 })}
							alt={img.filename}
							className="h-full w-full object-cover"
							loading="lazy"
						/>
						{img.media_type === "video" && (
							<span className="absolute bottom-6 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
								▶ видео
							</span>
						)}

						{/* Delete */}
						<button
							type="button"
							disabled={pending && deletingId === img.id}
							onClick={() => handleDelete(img)}
							className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-red-600 disabled:opacity-40"
							aria-label="Удалить изображение"
						>
							✕
						</button>

						<div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white">
							{img.filename}
						</div>
					</div>
				);
			})}
		</div>
	);
}
