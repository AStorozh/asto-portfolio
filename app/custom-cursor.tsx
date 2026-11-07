"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
	'a,button,[role="button"],input,textarea,select,label,[data-cursor="pointer"],[data-cursor="hover"]';

function prefersReducedMotion() {
	return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isFinePointer() {
	return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

export function CustomCursor() {
	const pathname = usePathname();
	const disabled = pathname === "/resume-file/embed";
	const dotRef = useRef<HTMLDivElement | null>(null);
	const ringRef = useRef<HTMLDivElement | null>(null);
	const ring2Ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (disabled) return;
		if (!isFinePointer()) return;
		if (prefersReducedMotion()) return;

		const dot = dotRef.current;
		const ring = ringRef.current;
		const ring2 = ring2Ref.current;
		if (!dot || !ring || !ring2) return;

		let visible = false;
		let down = false;
		let hovering = false;
		let hoverT = 0; // 0..1 smoothed hover amount

		let tx = window.innerWidth / 2;
		let ty = window.innerHeight / 2;
		let r1x = tx;
		let r1y = ty;
		let r2x = tx;
		let r2y = ty;
		let raf = 0;

		const setVisible = (v: boolean) => {
			visible = v;
			dot.style.opacity = v ? "1" : "0";
			ring.style.opacity = v ? "1" : "0";
			ring2.style.opacity = v ? "1" : "0";
		};

		const renderDot = () => {
			const hoverScale = 1 + hoverT * (1.6 - 1);
			const s = (down ? 0.8 : 1) * hoverScale;
			dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%) scale(${s})`;
		};

		const renderRings = () => {
			const h1 = 1 + hoverT * (1.45 - 1);
			const h2 = 1 + hoverT * (1.6 - 1);
			const s1 = (down ? 0.94 : 1) * h1;
			const s2 = (down ? 0.97 : 1) * h2;
			ring.style.transform = `translate3d(${r1x}px, ${r1y}px, 0) translate(-50%, -50%) scale(${s1})`;
			ring2.style.transform = `translate3d(${r2x}px, ${r2y}px, 0) translate(-50%, -50%) scale(${s2})`;
		};

		// initial state
		setVisible(false);
		renderDot();
		renderRings();

		// The animation loop runs only while the rings are catching up with the cursor. When the cursor is still,
		// the loop goes to sleep and doesn't occupy the browser on every frame.
		const loop = () => {
			// ring 1 is tighter, ring 2 is looser
			const k1 = down ? 0.22 : 0.18;
			const k2 = down ? 0.16 : 0.12;
			r1x += (tx - r1x) * k1;
			r1y += (ty - r1y) * k1;
			r2x += (tx - r2x) * k2;
			r2y += (ty - r2y) * k2;
			// smooth hover scaling
			const ht = hovering ? 1 : 0;
			hoverT += (ht - hoverT) * 0.2;
			renderRings();
			renderDot();
			const settled =
				Math.abs(tx - r2x) < 0.1 && Math.abs(ty - r2y) < 0.1 && Math.abs(tx - r1x) < 0.1 && Math.abs(ty - r1y) < 0.1 && Math.abs(ht - hoverT) < 0.002;
			raf = settled ? 0 : requestAnimationFrame(loop);
		};
		const wake = () => {
			if (!raf) raf = requestAnimationFrame(loop);
		};

		// Hover over a link or button is detected from the pointerover event (the browser itself
		// reports which element the cursor is over), rather than by looking up the element under the cursor
		// on every mouse move: that made the browser recalculate the page.
		const onOver = (e: PointerEvent) => {
			const el = e.target as Element | null;
			const next = !!el?.closest?.(INTERACTIVE_SELECTOR);
			if (next !== hovering) {
				hovering = next;
				wake();
			}
		};

		const onMove = (e: MouseEvent) => {
			tx = e.clientX;
			ty = e.clientY;
			if (!visible) setVisible(true);
			renderDot();
			wake();
		};

		const onEnter = () => setVisible(true);
		const onOut = (e: MouseEvent) => {
			// When leaving the window, relatedTarget is null in most browsers.
			const rel = (e.relatedTarget ?? (e as any).toElement) as Node | null;
			if (rel) return;
			// Avoid false positives during SPA navigations: only hide if pointer is actually outside viewport.
			const outX = e.clientX < 0 || e.clientX > window.innerWidth;
			const outY = e.clientY < 0 || e.clientY > window.innerHeight;
			if (outX || outY) setVisible(false);
		};
		// Don't hide on blur: SPA navigations / focus changes can trigger it.
		const onFocus = () => setVisible(true);
		const onVisibility = () => {
			if (document.visibilityState !== "visible") setVisible(false);
		};
		const onDown = () => {
			down = true;
			setVisible(true);
			renderDot();
			wake();
		};
		const onUp = () => {
			down = false;
			renderDot();
			wake();
		};

		window.addEventListener("mousemove", onMove, { passive: true });
		document.addEventListener("pointerover", onOver, { passive: true });
		window.addEventListener("mouseenter", onEnter);
		window.addEventListener("mouseout", onOut);
		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("mousedown", onDown);
		window.addEventListener("mouseup", onUp);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("mousemove", onMove);
			document.removeEventListener("pointerover", onOver);
			window.removeEventListener("mouseenter", onEnter);
			window.removeEventListener("mouseout", onOut);
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("mousedown", onDown);
			window.removeEventListener("mouseup", onUp);
		};
	}, [disabled]);

	if (disabled) return null;

	return (
		<div aria-hidden className="pointer-events-none fixed inset-0 z-[9999]">
			<div
				ref={ring2Ref}
				className="absolute left-0 top-0 h-[36px] w-[36px] rounded-full opacity-0 will-change-transform"
				style={{
					border: "1.1px solid rgba(255,255,255,0.95)",
					backgroundColor: "rgba(0,0,0,0.22)",
				}}
			/>
			<div
				ref={ringRef}
				className="absolute left-0 top-0 h-[22px] w-[22px] rounded-full opacity-0 will-change-transform"
				style={{
					border: "1.1px solid rgba(255,255,255,0.95)",
					backgroundColor: "rgba(0,0,0,0.28)",
				}}
			/>
			<div
				ref={dotRef}
				className="absolute left-0 top-0 h-2 w-2 rounded-full bg-black opacity-0 will-change-transform"
				style={{
					border: "1.25px solid rgba(255,255,255,0.98)",
				}}
			/>
		</div>
	);
}

