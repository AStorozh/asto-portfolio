"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/media-url";
import { ArrowUpRight } from "../../arrow-up-right";
import { useLang, useT } from "@/lib/lang-context";
import { WorkContent } from "@/lib/work-content";
import { GithubIcon } from "./github-icon";

// Block heading ("DESCRIPTION", "RESULT", "TOOLS") - a filled badge plate.
// Deliberately different from headings INSIDE a block (those have a stripe on the left
// on a transparent background), so the levels don't get mixed up.
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="inline-flex w-max items-center rounded-full bg-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-background">
			{children}
		</h2>
	);
}

type GalleryImage = { src: string; alt: string };
type WorkLink = { url: string; label: string };

type Props = {
	id: string;
	title: string;
	description: string;
	overview: string;
	tools: string[];
	result: string[];
	links: WorkLink[];
	galleryImages: GalleryImage[];
	aiLabel: string;
	aiText: string;
};

// GitHub links are recognized by host, to show the brand icon.
function isGithub(url: string): boolean {
	try {
		return /(^|\.)github\.com$/i.test(new URL(url).hostname);
	} catch {
		return false;
	}
}

export function WorkDetailSection({ id, title, description, overview, tools, result, links, galleryImages, aiLabel, aiText }: Props) {
	const t = useT();
	const lang = useLang();
	const n = galleryImages.length;
	const [index, setIndex] = useState(0);
	const go = useCallback((delta: -1 | 1) => setIndex((i) => (i + delta + n) % n), [n]);

	const outerRef = useRef<HTMLDivElement>(null);
	const galleryRef = useRef<HTMLDivElement>(null);
	const [btnY, setBtnY] = useState<number | null>(null);

	useEffect(() => {
		function measure() {
			const outer = outerRef.current;
			const gallery = galleryRef.current;
			if (!outer || !gallery) return;
			const outerTop = outer.getBoundingClientRect().top;
			const g = gallery.getBoundingClientRect();
			setBtnY(g.top - outerTop + g.height / 2);
		}
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);

	const [lightbox, setLightbox] = useState(false);

	useEffect(() => {
		if (!lightbox) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setLightbox(false);
			if (e.key === "ArrowLeft") go(-1);
			if (e.key === "ArrowRight") go(1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [lightbox, go]);

	// Lock the background scroll while the lightbox is open.
	useEffect(() => {
		if (!lightbox) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = prev; };
	}, [lightbox]);

	// In the lightbox, first show the already cached w:1200 version (instantly),
	// then load the sharp w:2000 and swap it in. Neighboring frames are preloaded too.
	const [hiRes, setHiRes] = useState(false);
	useEffect(() => {
		if (!lightbox) return;
		const cur = galleryImages[index];
		if (!cur) return;
		setHiRes(false);
		const main = new window.Image();
		main.onload = () => setHiRes(true);
		main.src = mediaUrl(cur.src, { w: 2000 });
		if (n > 1) {
			for (const i of [(index + 1) % n, (index - 1 + n) % n]) {
				const im = galleryImages[i];
				if (!im) continue;
				const pre = new window.Image();
				pre.src = mediaUrl(im.src, { w: 2000 });
			}
		}
	}, [lightbox, index, n, galleryImages]);

	const touchX = useRef<number | null>(null);
	const lbTouchX = useRef<number | null>(null);
	const current = galleryImages[index];

	return (
		<>
		<div ref={outerRef} className="relative">
			{n > 1 && btnY != null && (
				<>
					<button
						type="button"
						onClick={() => go(-1)}
						aria-label={t.work_prev_slide}
						style={{ top: `${btnY}px`, transform: "translateY(-50%)" }}
						className="absolute -left-14 z-30 hidden h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground shadow-sm transition-[background-color,transform] hover:bg-muted/40 active:scale-[0.97] lg:flex"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
							<path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => go(1)}
						aria-label={t.work_next_slide}
						style={{ top: `${btnY}px`, transform: "translateY(-50%)" }}
						className="absolute -right-14 z-30 hidden h-11 w-11 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground shadow-sm transition-[background-color,transform] hover:bg-muted/40 active:scale-[0.97] lg:flex"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
							<path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</>
			)}

			<section
				className="rounded-3xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] sm:p-7"
				onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
				onTouchEnd={(e) => {
					if (touchX.current == null) return;
					const x = e.changedTouches[0]?.clientX ?? touchX.current;
					const d = x - touchX.current;
					touchX.current = null;
					if (d > 40) go(-1);
					else if (d < -40) go(1);
				}}
			>
				<h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
					{title}
				</h1>

				{description && (
					<p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap sm:text-[15px]">
						{description}
					</p>
				)}

				{n > 0 && (
					<div
						className="mt-6"
						ref={galleryRef}
						role={n > 1 ? "region" : undefined}
						aria-roledescription={n > 1 ? t.work_carousel : undefined}
						aria-label={n > 1 ? `${t.work_gallery} ${title}` : undefined}
						tabIndex={n > 1 ? 0 : -1}
						onKeyDown={(e) => {
							// When the lightbox is open, arrows are handled by the global keydown -
							// otherwise both handlers would fire and it would skip every other frame.
							if (lightbox) return;
							if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
							if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
						}}
					>
						<div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-black">
							{current && (
								<img
									key={current.src}
									alt={current.alt}
									src={mediaUrl(current.src, { w: 1200 })}
									className="h-full w-full cursor-zoom-in object-cover"
									loading="lazy"
									draggable={false}
									onClick={() => setLightbox(true)}
								/>
							)}
						</div>
						<div className="mt-2.5 flex justify-center">
							<span className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.06] px-4 py-1.5 text-[12px] font-semibold text-foreground/70 tracking-wide">
								<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
									<circle cx="6.5" cy="6.5" r="4.5" />
									<path d="M10 10L14 14" />
									<path d="M5 6.5h3M6.5 5v3" />
								</svg>
								{t.work_zoom_hint}
							</span>
						</div>
						{n > 1 && (
							<p className="sr-only" aria-live="polite">{t.work_slide} {index + 1} {t.work_slide_of} {n}</p>
						)}
					</div>
				)}

				<div className="mt-6 flex flex-col gap-3">
					{links.length > 0 && (
						<div className="flex flex-col gap-2">
							{links.map((link) => {
								const gh = isGithub(link.url);
								// A dedicated page (/sena/, /luma/) opens in the same tab and knows where the visitor came from: a "Back" button will appear there.
								const own = /^https:\/\/(www\.)?asto-portfolio\.ru\//i.test(link.url);
								// The link label is stored in Russian only: in other languages the Russian label is not shown.
								const label = lang !== "ru" && /[а-яё]/i.test(link.label) ? "" : link.label;
								const suffix = label || (gh ? "GitHub" : "");
								const text = suffix ? `${t.work_link_word} ${suffix}` : own ? t.work_link_site : t.work_link_word;
								return (
									<a
										key={link.url}
										href={link.url}
										target={own ? undefined : "_blank"}
										rel={own ? undefined : "noopener noreferrer"}
										className="group inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-foreground bg-foreground px-5 py-3 text-[13px] font-semibold tracking-[0.04em] text-background shadow-sm transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
									>
										{gh ? <GithubIcon className="size-[1.1em]" /> : null}
										<span>{text}</span>
										<ArrowUpRight className="size-[1em] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
									</a>
								);
							})}
						</div>
					)}

					{overview && (
						<div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
							<SectionLabel>{t.work_description}</SectionLabel>
							<div className="mt-2">
								<WorkContent text={overview} />
							</div>
						</div>
					)}

					{tools.length > 0 && (
						<div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
							<SectionLabel>{t.work_tools}</SectionLabel>
							<ul className="mt-2 flex flex-wrap gap-2">
								{tools.map((tool) => (
									<li
										key={tool}
										className="inline-flex items-center rounded-lg border border-foreground/12 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground/90"
									>
										{tool}
									</li>
								))}
							</ul>
						</div>
					)}

					{result.length > 0 && (
						<div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
							<SectionLabel>{t.work_result}</SectionLabel>
							<ul className="mt-2 space-y-2">
								{result.map((item) => (
									<li key={item} className="flex gap-2.5 text-sm leading-snug text-muted-foreground">
										<span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
										{item}
									</li>
								))}
							</ul>
						</div>
					)}

					<Link
						href={`/ai-assistant?work=${encodeURIComponent(title)}&from=${encodeURIComponent(`/works/${id}`)}`}
						className="ai-surface group flex items-center justify-between rounded-2xl border border-yellow-100/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_28px_rgba(217,160,78,0.18)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
					>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">{aiLabel}</p>
							<p className="mt-1 text-sm font-semibold text-white">{aiText}</p>
						</div>
						<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-sm transition-transform group-hover:translate-x-0.5">
							<span className="text-lg leading-none text-white"><ArrowUpRight /></span>
						</span>
					</Link>
				</div>
			</section>
		</div>

		{/* Lightbox */}
		{lightbox && current && (
			<div
				className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
				onClick={() => setLightbox(false)}
				onTouchStart={(e) => { lbTouchX.current = e.touches[0]?.clientX ?? null; }}
				onTouchEnd={(e) => {
					if (lbTouchX.current == null) return;
					const x = e.changedTouches[0]?.clientX ?? lbTouchX.current;
					const d = x - lbTouchX.current;
					lbTouchX.current = null;
					if (d > 40) go(-1);
					else if (d < -40) go(1);
				}}
			>
				{/* Close */}
				<button
					type="button"
					aria-label={t.work_lightbox_close}
					onClick={() => setLightbox(false)}
					className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
						<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
				</button>

				{/* Prev */}
				{n > 1 && (
					<button
						type="button"
						aria-label={t.work_prev_slide}
						onClick={(e) => { e.stopPropagation(); go(-1); }}
						className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
							<path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				)}

				{/* Next */}
				{n > 1 && (
					<button
						type="button"
						aria-label={t.work_next_slide}
						onClick={(e) => { e.stopPropagation(); go(1); }}
						className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
							<path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				)}

				{/* Image */}
				<img
					key={current.src}
					alt={current.alt}
					src={mediaUrl(current.src, { w: hiRes ? 2000 : 1200 })}
					className="max-h-[90dvh] max-w-[90dvw] cursor-zoom-out rounded-2xl object-contain shadow-2xl"
					onClick={(e) => e.stopPropagation()}
					draggable={false}
				/>

				{n > 1 && (
					<p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-[0.14em] text-white/50">
						{index + 1} / {n}
					</p>
				)}
			</div>
		)}
		</>
	);
}
