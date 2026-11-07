// Media links and their derivatives. All files live locally on the VPS in /uploads,
// and variants (thumbnail, preview video, poster) are derived from the name by the convention
// from lib/storage.ts: <id>.webp → <id>.md.webp, <id>.mp4 → <id>.preview.mp4, etc.
// If a derivative file doesn't exist yet, the /uploads route builds it on the first request.
// Any non-local URL is returned unchanged.

const LOCAL_PREFIX = "/uploads/";

function isLocal(url: string): boolean {
	return url.startsWith(LOCAL_PREFIX);
}

export function isVideoUrl(url: string): boolean {
	return /\.mp4$/i.test(url);
}

// Swaps the extension of a local file: derivatives sit next to the
// original and differ only by the suffix in the name.
function variant(url: string, from: RegExp, suffix: string): string {
	if (!isLocal(url)) return url;
	return from.test(url) ? url.replace(from, suffix) : url;
}

// A tiny blurred version - an instant placeholder under the image.
export function mediaBlur(url: string): string {
	if (isVideoUrl(url)) return url;
	return variant(url, /\.webp$/, ".blur.webp");
}

// Lightweight copy of the video (≤720p, no audio) - for background autoplay.
export function mediaVideoPreview(url: string): string {
	return isVideoUrl(url) ? variant(url, /\.mp4$/i, ".preview.mp4") : url;
}

// The lightest copy (≤540p) - for tiles in the gallery grid: the weight here
// directly determines how soon the video starts playing.
export function mediaVideoGrid(url: string): string {
	return isVideoUrl(url) ? variant(url, /\.mp4$/i, ".grid.mp4") : url;
}

// Poster - a blurred first frame, a placeholder while the video loads.
export function mediaPoster(url: string): string {
	return isVideoUrl(url) ? variant(url, /\.mp4$/i, ".poster.jpg") : "";
}

// A sharp frame from the video - when a "cover" is needed, not a blurred spot.
export function mediaVideoThumb(url: string): string {
	return isVideoUrl(url) ? variant(url, /\.mp4$/i, ".thumb.jpg") : "";
}

// Image for the needed width: 640px and below - the small variant, up to 1280 -
// the medium one, larger - the original. Videos are served as is.
export function mediaUrl(url: string, opts?: { w?: number }): string {
	if (!url || isVideoUrl(url) || !isLocal(url) || !url.endsWith(".webp")) return url;
	const w = opts?.w;
	if (!w) return url;
	if (w <= 640) return url.replace(/\.webp$/, ".sm.webp");
	if (w <= 1280) return url.replace(/\.webp$/, ".md.webp");
	return url;
}
