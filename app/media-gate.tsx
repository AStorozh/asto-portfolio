"use client";

import { useEffect, useState } from "react";

// Fullscreen loader: keeps the page hidden until ALL media has loaded
// (images, videos - up to canplaythrough, iframes - up to load), then smoothly
// reveals the whole page. Safety net: if something hangs longer than
// MAX_WAIT, the page is shown anyway so it doesn't hang forever.
// We wait only for what is visible on the first screen, and for videos only the first frame:
// from a far-away country, fully loading all videos held a white screen for up to 12 seconds.
const MAX_WAIT = 3000;

function onFirstScreen(el: Element): boolean {
	const r = el.getBoundingClientRect();
	return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
}

// The loader is shown only on the first visit of a session (full page
// load). On navigation between pages the module stays in memory, the flag is already
// true - so the loader doesn't flash (the media is also already in the browser cache).
// On a full reload the module resets → the flag is false again (and SSR and client
// start the same way, with no hydration mismatch).
let gatedOnce = false;

export function MediaGate() {
	const [ready, setReady] = useState(gatedOnce);
	// After the smooth fade-out the loader is removed from the page entirely: otherwise
	// an invisible fullscreen layer with a spinning ring stayed on top of the site
	// and loaded the rendering of every frame.
	const [gone, setGone] = useState(gatedOnce);
	useEffect(() => {
		if (!ready || gone) return;
		const t = setTimeout(() => setGone(true), 600);
		return () => clearTimeout(t);
	}, [ready, gone]);

	useEffect(() => {
		if (gatedOnce) return;

		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			gatedOnce = true;
			setReady(true);
		};

		const waitImg = (img: HTMLImageElement) =>
			new Promise<void>((res) => {
				if (img.complete && img.naturalWidth > 0) return res();
				img.addEventListener("load", () => res(), { once: true });
				img.addEventListener("error", () => res(), { once: true });
			});

		const waitVideo = (v: HTMLVideoElement) =>
			new Promise<void>((res) => {
				if (v.readyState >= 2) return res(); // HAVE_CURRENT_DATA: the first frame is already available
				v.addEventListener("loadeddata", () => res(), { once: true });
				v.addEventListener("error", () => res(), { once: true });
			});

		const waitFrame = (f: HTMLIFrameElement) =>
			new Promise<void>((res) => {
				try {
					if (f.contentDocument?.readyState === "complete") return res();
				} catch {}
				f.addEventListener("load", () => res(), { once: true });
				f.addEventListener("error", () => res(), { once: true });
			});

		const tasks: Promise<void>[] = [
			...Array.from(document.images).filter(onFirstScreen).map(waitImg),
			...Array.from(document.querySelectorAll("video[src]")).filter(onFirstScreen).map((v) => waitVideo(v as HTMLVideoElement)),
			...Array.from(document.querySelectorAll("iframe")).filter(onFirstScreen).map((f) => waitFrame(f as HTMLIFrameElement)),
		];

		Promise.all(tasks).then(finish);
		const timer = setTimeout(finish, MAX_WAIT);
		return () => clearTimeout(timer);
	}, []);

	if (gone) return null;
	return (
		<div
			aria-hidden="true"
			style={{ pointerEvents: ready ? "none" : "auto" }}
			className={`fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
		>
			<div className="h-10 w-10 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
		</div>
	);
}
