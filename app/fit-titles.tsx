"use client";

import { useEffect } from "react";

// Fits the size of a group of headings (all elements matching `selector`) to ONE shared
// value so that the widest of them fits in its container. If all of them fit,
// the natural (responsive) size from CSS stays. The reduction is the same for all.
// We measure in the browser because the containers have different widths. `watch` is a value whose
// change requires recalculation (e.g. the language). Groups are independent per `selector`.
export function FitTitles({
	selector,
	watch,
	minPx = 14,
}: {
	selector: string;
	watch?: unknown;
	minPx?: number;
}) {
	useEffect(() => {
		let raf = 0;

		function fit() {
			const titles = Array.from(document.querySelectorAll<HTMLElement>(selector));
			if (titles.length === 0) return;

			// Reset to the natural size for correct measurement.
			for (const t of titles) t.style.fontSize = "";

			let maxPx = 0;
			for (const t of titles) {
				const fs = parseFloat(getComputedStyle(t).fontSize);
				if (fs > maxPx) maxPx = fs;
			}
			if (!maxPx) return;

			// The "tightest" heading sets the common scale.
			let minScale = 1;
			for (const t of titles) {
				const cw = t.clientWidth;
				const sw = t.scrollWidth;
				if (cw > 0 && sw > cw + 0.5) minScale = Math.min(minScale, cw / sw);
			}
			if (minScale >= 1) return; // everything fits - keep the natural size

			let px = Math.max(minPx, Math.floor(maxPx * minScale));
			const apply = (v: number) => {
				for (const t of titles) t.style.fontSize = `${v}px`;
			};
			apply(px);

			// Fine-tuning: line wrapping may have changed after shrinking - nudge down by 1px.
			let guard = 0;
			while (guard++ < 12 && px > minPx && titles.some((t) => t.scrollWidth > t.clientWidth + 0.5)) {
				px -= 1;
				apply(px);
			}
		}

		function schedule() {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(fit);
		}

		schedule();
		if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
		window.addEventListener("resize", schedule);
		return () => {
			window.removeEventListener("resize", schedule);
			cancelAnimationFrame(raf);
		};
	}, [selector, watch, minPx]);

	return null;
}
