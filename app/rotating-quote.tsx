"use client";

import { useEffect, useRef, useState } from "react";

type Quote = { text: string; author: string };

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

function toFull(q: Quote) {
	return `«${q.text}» — ${q.author}`;
}

// Strip classes that affect layout width/wrapping so ghost and overlay
// both use the outer container's 87.5% width for consistent line breaks.
function stripLayoutClasses(cls: string) {
	return cls
		.replace(/\bmax-w-\S+/g, "")
		.replace(/\btext-balance\b/g, "")
		.trim();
}

export function RotatingQuote({
	quotes,
	className = "",
}: {
	quotes: Quote[];
	className?: string;
}) {
	const firstFull = quotes[0] ? toFull(quotes[0]) : "";

	const [currentFull, setCurrentFull] = useState(firstFull);
	const [displayed, setDisplayed] = useState("");
	const [cursorVisible, setCursorVisible] = useState(false);

	const cancelledRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (quotes.length === 0) return;
		cancelledRef.current = false;

		if (prefersReducedMotion()) {
			setCurrentFull(firstFull);
			setDisplayed(firstFull);
			return;
		}

		const schedule = (fn: () => void, delay: number) => {
			timerRef.current = setTimeout(() => {
				if (!cancelledRef.current) fn();
			}, delay);
		};

		const run = (idx: number) => {
			const full = toFull(quotes[idx % quotes.length]);
			let charIdx = 0;

			setCurrentFull(full);
			setDisplayed("");
			setCursorVisible(true);

			const typeNext = () => {
				charIdx++;
				setDisplayed(full.slice(0, charIdx));
				if (charIdx < full.length) {
					schedule(typeNext, 40);
				} else {
					// fully typed — cursor disappears, wait 10 s then erase
					setCursorVisible(false);
					if (quotes.length <= 1) return;
					schedule(startErase, 10000);
				}
			};

			const startErase = () => {
				const eraseNext = () => {
					charIdx--;
					setDisplayed(full.slice(0, charIdx));
					if (charIdx > 0) {
						schedule(eraseNext, 22);
					} else {
						// fully erased — pause 2 s then next quote
						schedule(() => run((idx + 1) % quotes.length), 2000);
					}
				};
				eraseNext();
			};

			schedule(typeNext, 40);
		};

		run(0);

		return () => {
			cancelledRef.current = true;
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [quotes.length]);

	if (quotes.length === 0) return null;

	const innerClass = stripLayoutClasses(className);

	return (
		// 7/8 width, centered — controls where lines wrap for both layers
		<div className="w-[87.5%] mx-auto relative">

			{/* Ghost: full text, invisible — reserves correct height and fixes line positions */}
			<div className={`${innerClass} w-full invisible`} aria-hidden>
				{currentFull}
			</div>

			{/* Overlay: typed text, absolutely covers the ghost */}
			<div
				className={`${innerClass} w-full absolute inset-0`}
				aria-live="polite"
			>
				{displayed}
				{cursorVisible && <span aria-hidden>|</span>}
			</div>
		</div>
	);
}
