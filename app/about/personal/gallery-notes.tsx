"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { GalleryNote } from "./gallery-notes-parse";

// A soft curve without a "spring": starts quickly and glides to a stop for a long time.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Words appear in a wave: each rises from below, comes out of a slight
// blur and gains opacity a bit later than the previous one.
function Words({ text, shown, delay }: { text: string; shown: boolean; delay: number }) {
	const words = text.split(/\s+/).filter(Boolean);
	return (
		<>
			{words.map((w, i) => {
				const style: CSSProperties = shown
					? {
							opacity: 1,
							transform: "translateY(0)",
							filter: "blur(0)",
							transition: `opacity 1100ms ${EASE}, transform 1300ms ${EASE}, filter 1100ms ${EASE}`,
							transitionDelay: `${delay + Math.min(i * 28, 900)}ms`,
						}
					: {
							opacity: 0,
							transform: "translateY(0.7em)",
							filter: "blur(5px)",
							// Exit is quieter and without the wave, so it doesn't flicker on scrolling back.
							transition: "opacity 500ms ease, transform 500ms ease, filter 500ms ease",
							transitionDelay: "0ms",
						};
				return (
					<span key={i} className="inline-block whitespace-pre motion-reduce:!transition-none" style={style}>
						{w}
						{i < words.length - 1 ? " " : ""}
					</span>
				);
			})}
		</>
	);
}

function NoteBody({ note, shown }: { note: GalleryNote; shown: boolean }) {
	return (
		<>
			{note.label && (
				<p
					className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground motion-reduce:!transition-none"
					style={{
						opacity: shown ? 1 : 0,
						transform: shown ? "translateY(0)" : "translateY(8px)",
						transition: shown ? `opacity 900ms ${EASE}, transform 1100ms ${EASE}` : "opacity 400ms ease, transform 400ms ease",
					}}
				>
					{note.label}
				</p>
			)}
			<p
				className={
					note.quote
						? "text-[19px] font-semibold leading-snug tracking-tight text-foreground"
						: "text-[14.5px] leading-[1.65] text-foreground/80"
				}
			>
				<Words text={note.text} shown={shown} delay={note.label ? 160 : 0} />
			</p>
		</>
	);
}

// A note in the side margin: text centered on the background of the margin, appears on scroll.
function SideNote({ note, side, top }: { note: GalleryNote; side: "left" | "right"; top: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), {
			rootMargin: "-8% 0px -16% 0px",
		});
		io.observe(el);
		return () => io.disconnect();
	}, []);

	// The margin is all the space between the window edge and the photo grid.
	// 100% here is the grid width, so the margin width = (100vw − 100%) / 2.
	return (
		<div
			style={{ top }}
			className={`absolute flex w-[calc((100vw-100%)/2)] -translate-y-1/2 justify-center px-8 ${
				side === "left" ? "left-[calc((100%-100vw)/2)]" : "left-full"
			}`}
		>
			<div ref={ref} className="w-full max-w-[17rem] text-center">
				<NoteBody note={note} shown={shown} />
			</div>
		</div>
	);
}

// A card at the bottom of the screen: the note is first mounted hidden, and a frame later
// it appears, so that the same word wave as on the wide screen plays.
function AnimatedNote({ note }: { note: GalleryNote }) {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
		return () => cancelAnimationFrame(id);
	}, []);
	return <NoteBody note={note} shown={shown} />;
}

// On narrow screens there are no side margins: the current note pops up at the bottom of the screen
// and changes as the gallery scrolls.
function BottomNote({ notes, rootRef }: { notes: GalleryNote[]; rootRef: React.RefObject<HTMLDivElement | null> }) {
	const [idx, setIdx] = useState(-1);

	useEffect(() => {
		let raf = 0;
		const update = () => {
			raf = 0;
			const el = rootRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			const vh = window.innerHeight;
			// Progress is measured at the middle of the screen: 0 - the gallery has just started, 1 - it has ended.
			const progress = (vh / 2 - r.top) / Math.max(r.height, 1);
			if (r.bottom < vh * 0.35 || r.top > vh * 0.65) setIdx(-1);
			else setIdx(Math.min(notes.length - 1, Math.max(0, Math.floor(progress * notes.length))));
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
			if (raf) cancelAnimationFrame(raf);
		};
	}, [notes.length, rootRef]);

	const note = idx >= 0 ? notes[idx] : null;
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 min-[1360px]:hidden">
			<div
				className="w-full max-w-md rounded-2xl bg-background/95 px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.16)] motion-reduce:!transition-none"
				style={{
					opacity: note ? 1 : 0,
					transform: note ? "translateY(0)" : "translateY(16px)",
					transition: `opacity 700ms ${EASE}, transform 900ms ${EASE}`,
				}}
			>
				{note && <AnimatedNote key={idx} note={note} />}
			</div>
		</div>
	);
}

export function GalleryNotes({ notes }: { notes: GalleryNote[] }) {
	const rootRef = useRef<HTMLDivElement>(null);
	if (!notes.length) return null;
	return (
		<>
			<div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0">
				<div className="hidden min-[1360px]:block">
					{notes.map((note, i) => (
						<SideNote
							key={i}
							note={note}
							side={i % 2 === 0 ? "left" : "right"}
							top={`${((i + 0.5) / notes.length) * 100}%`}
						/>
					))}
				</div>
			</div>
			<BottomNote notes={notes} rootRef={rootRef} />
			{/* For screen readers: the notes as a single list, without animations. */}
			<ul className="sr-only">
				{notes.map((n, i) => (
					<li key={i}>{n.label ? `${n.label}. ${n.text}` : n.text}</li>
				))}
			</ul>
		</>
	);
}

// The final line under the gallery: appears with the same wave when scrolling reaches it.
export function GalleryEnd({ text }: { text: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { rootMargin: "0px 0px -8% 0px" });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<div ref={ref} className="flex flex-col items-center gap-4 pb-10 pt-12 text-center sm:pb-14 sm:pt-16">
			<span
				aria-hidden
				className="h-px w-16 bg-foreground/25"
				style={{
					transform: shown ? "scaleX(1)" : "scaleX(0)",
					transition: `transform 1200ms ${EASE}`,
				}}
			/>
			<p className="font-serif text-xl italic tracking-tight text-foreground/80 sm:text-2xl">
				<Words text={text} shown={shown} delay={200} />
			</p>
		</div>
	);
}
