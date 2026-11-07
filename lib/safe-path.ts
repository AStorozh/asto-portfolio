// Redirect targets for tracked short links must stay on this site.
// "/works" is local; "//evil.com" and "/\evil.com" are treated by browsers
// as protocol-relative URLs to another host, so they are rejected.
export function isLocalPath(p: string | null | undefined): p is string {
	return typeof p === "string" && p.startsWith("/") && !/^\/[/\\]/.test(p);
}

// Normalizes admin input into a local path: adds the leading slash, falls back to "/".
export function toLocalPath(input: string | null | undefined): string {
	const t = (input ?? "").trim();
	if (!t) return "/";
	const p = t.startsWith("/") ? t : `/${t}`;
	return isLocalPath(p) ? p : "/";
}
