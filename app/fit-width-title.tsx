"use client";

import { useEffect, useRef } from "react";

// Fits the font size so that the line takes the whole width of the parent -
// both shrinking and enlarging. We measure in the browser: the column width is known
// only at runtime. `watch` is a value whose change requires recalculation.
const BASE_PX = 100;

export function FitWidthTitle({
	children,
	className,
	watch,
	maxPx = 220,
	minPx = 14,
}: {
	children: React.ReactNode;
	className?: string;
	watch?: unknown;
	maxPx?: number;
	minPx?: number;
}) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = ref.current;
		const box = el?.parentElement;
		if (!el || !box) return;

		let raf = 0;

		function fit() {
			if (!el || !box) return;
			el.style.fontSize = `${BASE_PX}px`;
			const textWidth = el.scrollWidth;
			const boxWidth = box.clientWidth;
			if (!textWidth || !boxWidth) return;
			const px = Math.min(maxPx, Math.max(minPx, (BASE_PX * boxWidth) / textWidth));
			el.style.fontSize = `${px}px`;
		}

		function schedule() {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(fit);
		}

		schedule();
		if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});

		const ro = new ResizeObserver(schedule);
		ro.observe(box);
		return () => {
			ro.disconnect();
			cancelAnimationFrame(raf);
		};
	}, [watch, maxPx, minPx]);

	return (
		<span ref={ref} className={`block whitespace-nowrap ${className ?? ""}`}>
			{children}
		</span>
	);
}
