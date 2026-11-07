"use client";

import { useEffect, useRef, useState } from "react";
import {
	mediaUrl,
	mediaBlur,
	mediaPoster,
	mediaVideoGrid,
	mediaVideoPreview,
	mediaVideoThumb,
} from "@/lib/media-url";

// A visible tile must play immediately - users perceive waiting in a queue
// as a frozen video. The limit is only a safeguard against a dozen tiles
// becoming visible at once; on a normal screen there are 4–6.
const MAX_ACTIVE = 8;

type Slot = { el: HTMLVideoElement };
const active: Slot[] = [];
const queue: Slot[] = [];

function pump() {
	while (active.length < MAX_ACTIVE && queue.length > 0) {
		const slot = queue.shift()!;
		active.push(slot);
		slot.el.play().catch(() => {});
	}
}

function wantPlay(slot: Slot) {
	if (active.includes(slot) || queue.includes(slot)) {
		// Already active - just retry play() in case it failed before loading.
		if (active.includes(slot)) slot.el.play().catch(() => {});
		return;
	}
	queue.push(slot);
	pump();
}

function stopPlay(slot: Slot) {
	const q = queue.indexOf(slot);
	if (q !== -1) queue.splice(q, 1);
	const a = active.indexOf(slot);
	if (a !== -1) {
		active.splice(a, 1);
		slot.el.pause();
	}
	pump();
}

function LazyVideo({
	src,
	fallbackSrc,
	poster,
	className,
	onLoadedMetadata,
	onError,
}: {
	src: string;
	fallbackSrc: string;
	poster?: string;
	className: string;
	onLoadedMetadata: React.ReactEventHandler<HTMLVideoElement>;
	onError: () => void;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	// armed - the tile is near: set src and start downloading, so that by the time
	// it appears on screen the video is ready to play.
	const [armed, setArmed] = useState(false);
	const [source, setSource] = useState(src);
	const slotRef = useRef<Slot | null>(null);
	const inViewRef = useRef(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const slot: Slot = { el };
		slotRef.current = slot;

		const near = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					setArmed(true);
					near.disconnect();
				}
			},
			{ rootMargin: "800px", threshold: 0 },
		);
		near.observe(el);

		const inView = new IntersectionObserver(
			([e]) => {
				inViewRef.current = e.isIntersecting;
				if (e.isIntersecting) wantPlay(slot);
				else stopPlay(slot);
			},
			// threshold 0 - any visible pixel is enough: for tall vertical
			// tiles a 15%-of-height threshold only fired when the tile reached the
			// middle of the screen, and from below it just sat on the first frame.
			{ rootMargin: "150px", threshold: 0 },
		);
		inView.observe(el);

		return () => {
			near.disconnect();
			inView.disconnect();
			stopPlay(slot);
		};
	}, []);

	return (
		<video
			ref={ref}
			src={armed ? source : undefined}
			poster={armed ? poster || undefined : undefined}
			className={className}
			style={{ transform: "translateZ(0)" }}
			muted
			loop
			playsInline
			// Download ahead of time, 800px before it appears: if we wait for visibility, the video
			// starts with a delay of a couple of seconds - the file is still in transit by then.
			preload={armed ? "auto" : "none"}
			onLoadedMetadata={onLoadedMetadata}
			onCanPlay={() => {
				// File finished loading - retry play(): the first attempt may have failed
				// while there was no data.
				if (inViewRef.current && slotRef.current) wantPlay(slotRef.current);
			}}
			onError={() => {
				// No preview copy yet (old upload) - use the original.
				if (source !== fallbackSrc) setSource(fallbackSrc);
				else onError();
			}}
		/>
	);
}

type Item = { id: number; url: string; filename: string; media_type: string; width?: number | null; height?: number | null };
type Dims = { nw: number; nh: number; isWide: boolean };
type Pos = { left: number; top: number; width: number; height: number };

const GAP = 12;
const BALANCE_TOL = 2;

function colCount(w: number) {
	if (w < 640) return 2;
	if (w < 1024) return 3;
	return 4;
}

function computeLayout(
	items: Item[],
	dims: Record<number, Dims>,
	containerW: number,
): { height: number; pos: Record<number, Pos> } {
	const n = colCount(containerW);
	const colW = (containerW - GAP * (n - 1)) / n;
	const heights = Array<number>(n).fill(0);
	const pos: Record<number, Pos> = {};

	for (const item of items) {
		const d = dims[item.id];
		if (!d) continue;

		let span = 1;
		let bestC = 0;
		let bestH = Infinity;

		if (d.isWide && n >= 2) {
			for (let c = 0; c <= n - 2; c++) {
				const diff = Math.abs(heights[c] - heights[c + 1]);
				const h = Math.max(heights[c], heights[c + 1]);
				if (diff <= BALANCE_TOL && h < bestH) {
					bestH = h;
					bestC = c;
					span = 2;
				}
			}
		}

		if (span === 1) {
			bestH = Infinity;
			for (let c = 0; c < n; c++) {
				if (heights[c] < bestH) { bestH = heights[c]; bestC = c; }
			}
		}

		const itemW = span * colW + (span - 1) * GAP;
		const h = Math.round((itemW * d.nh) / d.nw);

		pos[item.id] = { left: bestC * (colW + GAP), top: bestH, width: itemW, height: h };

		for (let c = bestC; c < bestC + span; c++) heights[c] = bestH + h + GAP;
	}

	return { height: Math.max(...heights) - GAP, pos };
}

export function PersonalGalleryGrid({ items, width }: { items: Item[]; width?: number }) {
	// If `width` is passed, the layout is computed from that fixed width
	// (used in the admin preview so the layout matches the real
	// page regardless of the panel width). Otherwise the width is measured.
	const fixedWidth = width != null;
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerW, setContainerW] = useState(width ?? 0);
	const [dims, setDims] = useState<Record<number, Dims>>(() => {
		const initial: Record<number, Dims> = {};
		for (const item of items) {
			if (item.width && item.height) {
				initial[item.id] = {
					nw: item.width,
					nh: item.height,
					isWide: item.media_type === "video" ? item.width > item.height : item.width > item.height,
				};
			}
		}
		return initial;
	});
	const [layout, setLayout] = useState<{ height: number; pos: Record<number, Pos> } | null>(null);
	const [visible, setVisible] = useState(false);
	// Read the screen density after mount: there is no window on the server, and a mismatch
	// of the value between SSR and the first client render breaks hydration.
	const [dpr, setDpr] = useState(1);

	useEffect(() => {
		setDpr(Math.min(window.devicePixelRatio || 1, 2));
	}, []);

	useEffect(() => {
		if (fixedWidth) {
			setContainerW(width!);
			return;
		}
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
		ro.observe(el);
		setContainerW(el.clientWidth);
		return () => ro.disconnect();
	}, [fixedWidth, width]);

	// Compute layout whenever dims or container width change
	useEffect(() => {
		if (containerW === 0 || Object.keys(dims).length < items.length) return;
		setLayout(computeLayout(items, dims, containerW));
		setVisible(true);
	}, [dims, items, containerW]);

	// Fallback: after 4s fill any missing dims with defaults and force layout
	useEffect(() => {
		const t = setTimeout(() => {
			setDims((prev) => {
				const next = { ...prev };
				let changed = false;
				for (const item of items) {
					if (!next[item.id]) {
						next[item.id] = { nw: 16, nh: 9, isWide: item.media_type === "video" };
						changed = true;
					}
				}
				return changed ? next : prev;
			});
			setVisible(true);
		}, 4000);
		return () => clearTimeout(t);
	}, [items]);

	function register(id: number, nw: number, nh: number, isWide: boolean) {
		setDims((prev) => (prev[id] ? prev : { ...prev, [id]: { nw, nh, isWide } }));
	}

	return (
		<div
			ref={containerRef}
			className={`relative transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
			style={{ width: fixedWidth ? width : undefined, height: layout?.height ?? "auto", minHeight: 200 }}
		>
			{items.map((item, i) => {
				const p = layout?.pos[item.id];
				// File size matches the real tile size, accounting for screen density.
				// Computed from the LONG side: derivatives are bounded by a square, and for
				// a vertical frame "640" means a width of only 480 - on retina that looks blurry.
				const needLong = Math.ceil(Math.max(p?.width ?? 400, p?.height ?? 400) * dpr);
				// First tiles are above the fold: load immediately and with priority.
				const eager = i < 4;
				return (
					<div
						key={item.id}
						className="absolute overflow-hidden rounded-2xl bg-muted/40 bg-cover bg-center"
						style={
							p
								? {
										left: p.left,
										top: p.top,
										width: p.width,
										height: p.height,
										// Instant blurred placeholder (32px, ~1 KB) under the media.
										backgroundImage: `url(${item.media_type === "video" ? mediaPoster(item.url) : mediaBlur(item.url)})`,
									}
								: { display: "none" }
						}
					>
						{item.media_type === "video" ? (
							<LazyVideo
								src={mediaVideoGrid(item.url)}
								fallbackSrc={mediaVideoPreview(item.url)}
								poster={mediaVideoThumb(item.url)}
								className="w-full h-full block"
								onLoadedMetadata={(e) => {
									const v = e.currentTarget;
									register(item.id, v.videoWidth, v.videoHeight, v.videoWidth > v.videoHeight);
								}}
								onError={() => register(item.id, 16, 9, true)}
							/>
						) : (
							<img
								src={mediaUrl(item.url, { w: needLong })}
								alt={item.filename}
								className="w-full h-full block"
								loading={eager ? "eager" : "lazy"}
								decoding="async"
								fetchPriority={eager ? "high" : "low"}
								onLoad={(e) => {
									const img = e.currentTarget;
									register(item.id, img.naturalWidth, img.naturalHeight, false);
								}}
								onError={() => register(item.id, 4, 3, false)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
