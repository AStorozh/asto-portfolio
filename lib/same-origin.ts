// Paid AI endpoints (chat, voice session, transcription) must be called only from this site's own pages.
// A browser always sends Origin with a POST; a page on another site would carry its own origin, so it is
// refused (earlier any site could get a voice session key and make calls at the owner's expense).
// Scripts can forge Origin, so this does not replace the rate limits and the daily ceiling, it adds to them.
export function isSameOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");
	if (!origin) {
		// No Origin: only a same-origin request by Fetch Metadata is accepted.
		const site = request.headers.get("sec-fetch-site");
		return site === "same-origin";
	}
	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}
	const host = request.headers.get("host"); // nginx passes the real Host; X-Forwarded-Host is client-controlled, not trusted
	return !!host && originHost === host;
}
