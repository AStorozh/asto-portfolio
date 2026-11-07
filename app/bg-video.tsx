"use client";

import { useEffect, useRef, useState } from "react";

// Background video with a "gallery" loading strategy: shows a sharp poster
// instantly, attaches the file itself only after the page has loaded and
// freed the channel, and plays only when the block is visible. This way the first screen does not
// compete with megabytes of video - unlike preload="auto" + autoPlay.
export function BgVideo({
	src,
	poster,
	className,
}: {
	src: string;
	poster?: string;
	className?: string;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	// While false, <video> has no src and the browser downloads only the poster.
	const [armed, setArmed] = useState(false);

	useEffect(() => {
		let idle = 0;
		const arm = () => {
			// requestIdleCallback - wait until the work after load settles down;
			// Safari does not have it, there it is just a short delay.
			const ric = window.requestIdleCallback;
			if (ric) idle = ric(() => setArmed(true), { timeout: 2000 });
			else idle = window.setTimeout(() => setArmed(true), 600);
		};

		if (document.readyState === "complete") arm();
		else window.addEventListener("load", arm, { once: true });

		return () => {
			window.removeEventListener("load", arm);
			if (idle) window.cancelIdleCallback?.(idle);
		};
	}, []);

	useEffect(() => {
		const el = ref.current;
		if (!el || !armed) return;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) el.play().catch(() => {});
				else el.pause();
			},
			{ rootMargin: "200px", threshold: 0 },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [armed]);

	return (
		<video
			ref={ref}
			src={armed ? src : undefined}
			poster={poster || undefined}
			className={className}
			muted
			loop
			playsInline
			preload={armed ? "metadata" : "none"}
		/>
	);
}
