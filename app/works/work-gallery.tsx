"use client";

import { useCallback, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media-url";
import { useT } from "@/lib/lang-context";

export type WorkGalleryImage = {
	src: string;
	alt: string;
};

type WorkGalleryProps = {
	images: WorkGalleryImage[];
	label: string;
	/** Narrow column: the image takes the full row height (width is set by the wrapper) */
	compact?: boolean;
	className?: string;
};

export function WorkGallery({ images, label, compact = false, className }: WorkGalleryProps) {
	const t = useT();
	const [index, setIndex] = useState(0);
	const n = images.length;
	const go = useCallback(
		(delta: -1 | 1) => {
			setIndex((i) => (i + delta + n) % n);
		},
		[n],
	);

	const touchX = useRef<number | null>(null);

	if (n === 0) {
		return null;
	}

	const current = images[index];
	if (!current) {
		return null;
	}

	const prevIdx = n > 1 ? (index - 1 + n) % n : 0;
	const nextIdx = n > 1 ? (index + 1) % n : 0;
	const leftImg = images[prevIdx]!;
	const rightImg = images[nextIdx]!;

	const frameClass = compact
		? "relative h-full min-h-0 w-full rounded-xl"
		: "relative aspect-video overflow-hidden rounded-2xl bg-black";

	return (
		<div
			className={`relative box-border outline-none ${
				compact ? "h-full min-h-0 w-full min-w-0 shrink-0" : ""
			} ${className ?? ""}`}
			data-block="работа галерея"
			role="region"
			aria-roledescription={t.ui_carousel}
			aria-label={`${t.work_gallery} ${label}`}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "ArrowLeft") {
					e.preventDefault();
					go(-1);
				}
				if (e.key === "ArrowRight") {
					e.preventDefault();
					go(1);
				}
			}}
			onTouchStart={(e) => {
				touchX.current = e.touches[0]?.clientX ?? null;
			}}
			onTouchEnd={(e) => {
				if (touchX.current == null) {
					return;
				}
				const x = e.changedTouches[0]?.clientX ?? touchX.current;
				const d = x - touchX.current;
				touchX.current = null;
				if (d > 40) {
					go(-1);
				} else if (d < -40) {
					go(1);
				}
			}}
		>
			<div className={frameClass}>
				{compact && n > 1 ? (
					<>
						{/* 16:9; on a narrow screen - only the center frame across the whole column, */}
						{/* side previews with -space-x appear from sm, where the column is wide */}
						<div className="flex h-full w-full min-h-0 items-center justify-center @[13rem]/gallery:-space-x-[6cqi]">
							<button
								type="button"
								className="group relative z-0 hidden aspect-video min-w-0 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-background transition active:scale-[0.99] @[13rem]/gallery:block @[13rem]/gallery:w-[32cqi] @[13rem]/gallery:rounded-xl"
								aria-label={t.work_prev_slide}
								onClick={(e) => {
									// In the works list the whole card is a link.
									// For side previews, clicks must flip the gallery, not navigate to the subpage.
									e.preventDefault();
									e.stopPropagation();
									go(-1);
								}}
							>
								<img
									alt={leftImg.alt}
									src={mediaUrl(leftImg.src, { w: 400 })}
									className="h-full w-full object-cover object-center"
									loading="lazy"
									draggable={false}
								/>
							</button>
							<div className="relative z-20 h-full w-full min-w-0 shrink-0 @[13rem]/gallery:aspect-video @[13rem]/gallery:h-auto @[13rem]/gallery:w-[46cqi]">
								<div className="relative h-full w-full overflow-hidden rounded-lg border-2 border-black bg-background @[13rem]/gallery:rounded-xl">
									<img
										alt={current.alt}
										src={mediaUrl(current.src, { w: 600 })}
										className="h-full w-full object-cover object-center"
										loading="eager"
										draggable={false}
									/>
								</div>
							</div>
							<button
								type="button"
								className="group relative z-0 hidden aspect-video min-w-0 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-background transition active:scale-[0.99] @[13rem]/gallery:block @[13rem]/gallery:w-[32cqi] @[13rem]/gallery:rounded-xl"
								aria-label={t.work_next_slide}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									go(1);
								}}
							>
								<img
									alt={rightImg.alt}
									src={mediaUrl(rightImg.src, { w: 400 })}
									className="h-full w-full object-cover object-center"
									loading="lazy"
									draggable={false}
								/>
							</button>
						</div>
					</>
				) : compact && n === 1 ? (
					<div className="flex h-full w-full min-h-0 items-center justify-center">
						<div className="relative h-full w-full min-w-0 overflow-hidden rounded-lg border-2 border-black bg-background @[13rem]/gallery:aspect-video @[13rem]/gallery:h-auto @[13rem]/gallery:w-[70cqi] @[13rem]/gallery:max-w-full @[13rem]/gallery:rounded-xl">
							<img
								alt={current.alt}
								src={mediaUrl(current.src, { w: 600 })}
								className="h-full w-full object-cover object-center"
								loading="lazy"
								draggable={false}
							/>
						</div>
					</div>
				) : (
					<img
						alt={current.alt}
						src={mediaUrl(current.src, { w: 1200 })}
						className="h-full w-full object-cover"
						loading="lazy"
						draggable={false}
					/>
				)}

				{!compact && n > 1 && (
					<>
						<button
							type="button"
							onClick={() => go(-1)}
							aria-label={t.work_prev_slide}
							className="absolute left-3 top-3 z-30 rounded-full bg-foreground px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-background shadow-sm transition-[transform,opacity] hover:opacity-95 active:scale-[0.99] active:opacity-90"
						>
							{t.work_prev_slide}
						</button>
						<button
							type="button"
							onClick={() => go(1)}
							aria-label={t.work_next_slide}
							className="absolute right-3 top-3 z-30 rounded-full bg-foreground px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-background shadow-sm transition-[transform,opacity] hover:opacity-95 active:scale-[0.99] active:opacity-90"
						>
							{t.work_next_slide}
						</button>
					</>
				)}

				{/* dots/indicators are hidden by request - only a click on the side ones, swipe and keys remain */}
			</div>
			{n > 1 && (
				<p className="sr-only" aria-live="polite">
					{t.work_slide} {index + 1} {t.work_slide_of} {n}
				</p>
			)}
		</div>
	);
}
