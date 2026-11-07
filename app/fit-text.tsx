"use client";

import { useEffect, useRef } from "react";

// Adjusts the font size of the content so it EXACTLY fills the height allotted to it
// (both shrinking and enlarging). The outer div gets its height via flex (flex-1),
// the inner one wraps the content; the inner font is chosen so that the content height
// matches the outer height. Text is set in em, so all of it scales, BUT the gaps between
// blocks are set in rem (fixed 20px) and don't depend on the font. This way the content always
// fills the block without gaps, and the spacing stays exactly 20px.
const BASE_PX = 16;

export function FitText({
	watch,
	className,
	children,
	minScale = 0.25,
	maxScale = 2.6,
}: {
	watch?: unknown;
	className?: string;
	children: React.ReactNode;
	minScale?: number;
	maxScale?: number;
}) {
	const outerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const outer = outerRef.current;
		const inner = innerRef.current;
		if (!outer || !inner) return;
		let raf = 0;

		function fit() {
			if (!outer || !inner) return;
			const avail = outer.clientHeight;
			if (avail <= 0) return;
			let scale = 1;
			// Iteratively bring the content height closer to the available height.
			for (let i = 0; i < 18; i++) {
				inner.style.fontSize = `${BASE_PX * scale}px`;
				const content = inner.scrollHeight;
				if (content <= 0) break;
				if (Math.abs(content - avail) <= 1) break;
				let next = scale * (avail / content);
				next = Math.min(maxScale, Math.max(minScale, next));
				if (Math.abs(next - scale) < 0.002) {
					scale = next;
					inner.style.fontSize = `${BASE_PX * scale}px`;
					break;
				}
				scale = next;
			}
		}

		function schedule() {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(fit);
		}

		schedule();
		if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});
		const ro = new ResizeObserver(schedule);
		ro.observe(outer);
		window.addEventListener("resize", schedule);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", schedule);
			cancelAnimationFrame(raf);
		};
	}, [watch, minScale, maxScale]);

	return (
		<div ref={outerRef} style={{ minHeight: 0, flex: "1 1 0%", overflow: "hidden" }}>
			<div ref={innerRef} className={className} style={{ fontSize: `${BASE_PX}px` }}>
				{children}
			</div>
		</div>
	);
}
