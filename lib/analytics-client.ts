// Client-side tracking: sending events to /api/analytics/track.
// The campaign label (?ref=CODE) and the session id live in sessionStorage.

const REF_KEY = "a_ref";
const SID_KEY = "a_sid";
const HUMAN_KEY = "a_human";

// Local development uses the same production database, so visits from localhost
// ended up in the real statistics. Do not track them.
function isDevHost(): boolean {
	const h = window.location.hostname;
	return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
}

// The browser's time zone - the server uses it to determine the country (see lib/geo-tz.ts).
function timeZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
	} catch {
		return null;
	}
}

// ─── Robot filtering ──────────────────────────────────────────────────────────
// The user-agent filter does not catch everyone: a robot browser runs JS and looks like
// a human. So events are queued and sent to the server only after a
// live action (mouse move, scroll, touch, key). A robot that
// opened the page and left never reaches the statistics at all.
let human = false;
const queue: string[] = [];

function isAutomated(): boolean {
	try {
		return navigator.webdriver === true;
	} catch {
		return false;
	}
}

function post(body: string, beacon = false): void {
	try {
		if (beacon && navigator.sendBeacon) {
			navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
			return;
		}
		fetch("/api/analytics/track", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
			keepalive: true,
		}).catch(() => {});
	} catch {
		// ignore
	}
}

function send(body: string, beacon = false): void {
	if (isAutomated()) return;
	if (human) post(body, beacon);
	else if (queue.length < 50) queue.push(body);
}

function markHuman(): void {
	if (human || isAutomated()) return;
	human = true;
	try {
		sessionStorage.setItem(HUMAN_KEY, "1");
	} catch {
		// ignore
	}
	for (const body of queue.splice(0)) post(body);
}

// Attached once from the tracker. A person who has already proven themselves in this tab
// is not checked again when navigating between pages.
export function watchHuman(): void {
	if (typeof window === "undefined") return;
	try {
		if (sessionStorage.getItem(HUMAN_KEY) === "1") human = true;
	} catch {
		// ignore
	}
	if (human) return;
	let moves = 0;
	const onMove = () => {
		if (++moves >= 3) done();
	};
	const done = () => {
		markHuman();
		window.removeEventListener("pointermove", onMove);
		for (const ev of ["scroll", "wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(ev, done);
	};
	window.addEventListener("pointermove", onMove, { passive: true });
	for (const ev of ["scroll", "wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(ev, done, { passive: true });
}

function uid(): string {
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reads ?ref=CODE from the URL, saves it to the session and removes the parameter from the address.
export function captureRef(): void {
	if (typeof window === "undefined") return;
	try {
		const url = new URL(window.location.href);
		const ref = url.searchParams.get("ref");
		if (ref) {
			sessionStorage.setItem(REF_KEY, ref.slice(0, 32));
			url.searchParams.delete("ref");
			window.history.replaceState(null, "", url.pathname + url.search + url.hash);
		}
	} catch {
		// ignore
	}
}

// The current campaign label (?ref) of this session - for attributing server-side events (AI cost).
export function getLinkCode(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return sessionStorage.getItem(REF_KEY);
	} catch {
		return null;
	}
}

// Sites of my projects on other domains that report visits into this analytics (HireFlow).
// A click from the portfolio carries the session id and the campaign label in the URL,
// so the "portfolio -> project site" route shows up as one visit.
const PARTNER_HOSTS = new Set(["hire-flow.website", "www.hire-flow.website"]);

export function carrySession(a: HTMLAnchorElement): void {
	try {
		const url = new URL(a.href, window.location.href);
		if (!PARTNER_HOSTS.has(url.hostname)) return;
		const sid = sessionId();
		if (sid) url.searchParams.set("asid", sid);
		const ref = sessionStorage.getItem(REF_KEY);
		if (ref) url.searchParams.set("ref", ref);
		a.href = url.toString();
	} catch {
		// ignore
	}
}

function sessionId(): string {
	try {
		let id = sessionStorage.getItem(SID_KEY);
		if (!id) {
			id = uid();
			sessionStorage.setItem(SID_KEY, id);
		}
		return id;
	} catch {
		return "";
	}
}

// Time on page (seconds). Via sendBeacon - fires reliably on leaving.
export function trackPageTime(path: string, seconds: number): void {
	if (typeof window === "undefined" || isDevHost()) return;
	if (path.startsWith("/admin") || seconds < 2) return;
	let link_code: string | null = null;
	try {
		link_code = sessionStorage.getItem(REF_KEY);
	} catch {
		// ignore
	}
	const body = JSON.stringify({
		type: "page_time",
		path,
		link_code,
		session_id: sessionId(),
		lang: document.documentElement.lang || null,
		tz: timeZone(),
		meta: String(Math.round(seconds)),
	});
	send(body, true);
}

export function track(type: string, meta?: string): void {
	if (typeof window === "undefined" || isDevHost()) return;
	const path = window.location.pathname;
	if (path.startsWith("/admin")) return; // do not track the admin

	let link_code: string | null = null;
	try {
		link_code = sessionStorage.getItem(REF_KEY);
	} catch {
		// ignore
	}

	const payload = JSON.stringify({
		type,
		path,
		referrer: document.referrer || null,
		link_code,
		session_id: sessionId(),
		lang: document.documentElement.lang || null,
		tz: timeZone(),
		meta: meta ?? null,
	});

	send(payload);
}
