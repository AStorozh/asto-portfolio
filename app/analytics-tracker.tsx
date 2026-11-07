"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureRef, carrySession, track, trackPageTime, watchHuman } from "@/lib/analytics-client";

// Invisible tracker: catches ?ref, sends a pageview on every route change and
// catches clicks on elements with data-analytics="<type>" via delegation.
export function AnalyticsTracker() {
	const pathname = usePathname();

	// Capture the campaign label - once on load (before the first pageview).
	useEffect(() => {
		captureRef();
		watchHuman();
	}, []);

	// Pageview for every route (except the admin). meta = previous page
	// (where they came from) - for the "where do people come to AI from" report.
	const prevPathRef = useRef("");
	useEffect(() => {
		if (pathname.startsWith("/admin")) return;
		track("pageview", prevPathRef.current || undefined);
		prevPathRef.current = pathname;
	}, [pathname]);

	// Time on page: count active time (while the tab is visible) and send on
	// leaving the page (route change, tab hidden, close).
	const accRef = useRef(0); // accumulated ms
	const startRef = useRef(Date.now());
	const sentRef = useRef(false);
	useEffect(() => {
		if (pathname.startsWith("/admin")) return;
		const path = pathname;
		accRef.current = 0;
		startRef.current = Date.now();
		sentRef.current = false;

		const send = () => {
			if (sentRef.current) return;
			if (document.visibilityState === "visible") {
				accRef.current += Date.now() - startRef.current;
				startRef.current = Date.now();
			}
			sentRef.current = true;
			trackPageTime(path, accRef.current / 1000);
		};

		const onVis = () => {
			if (document.visibilityState === "hidden") {
				accRef.current += Date.now() - startRef.current;
				send(); // the tab may be closed from the hidden state
			} else {
				sentRef.current = false; // came back - keep counting
				startRef.current = Date.now();
			}
		};

		document.addEventListener("visibilitychange", onVis);
		window.addEventListener("pagehide", send);

		return () => {
			document.removeEventListener("visibilitychange", onVis);
			window.removeEventListener("pagehide", send);
			send(); // left the page (SPA navigation)
		};
	}, [pathname]);

	// Delegated click tracking: <a data-analytics="contact_click" data-analytics-meta="telegram">
	useEffect(() => {
		function onClick(e: MouseEvent) {
			const target = e.target as HTMLElement | null;
			// Leaving for an external site (project GitHub, work site, social links without markup).
			const a = target?.closest<HTMLAnchorElement>("a[href]");
			if (a && !a.closest("[data-analytics]")) {
				try {
					const url = new URL(a.href, window.location.href);
					if (/^https?:$/.test(url.protocol) && url.host !== window.location.host) {
						track("outbound_click", url.href.slice(0, 500));
						carrySession(a);
					}
				} catch {
					// ignore
				}
			}
			const el = target?.closest<HTMLElement>("[data-analytics]");
			if (!el) return;
			const type = el.dataset.analytics;
			if (!type) return;
			track(type, el.dataset.analyticsMeta);
		}
		document.addEventListener("click", onClick, { capture: true });
		return () => document.removeEventListener("click", onClick, { capture: true });
	}, []);

	return null;
}
