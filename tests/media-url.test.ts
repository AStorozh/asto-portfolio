import { describe, expect, it } from "vitest";
import { isVideoUrl, mediaBlur, mediaPoster, mediaUrl, mediaVideoGrid, mediaVideoPreview, mediaVideoThumb } from "@/lib/media-url";

const img = "/uploads/works/abc.webp";
const vid = "/uploads/works/abc.mp4";

describe("media-url", () => {
	it("detects video", () => {
		expect(isVideoUrl(vid)).toBe(true);
		expect(isVideoUrl(img)).toBe(false);
	});

	it("picks the image size by width", () => {
		expect(mediaUrl(img, { w: 400 })).toBe("/uploads/works/abc.sm.webp");
		expect(mediaUrl(img, { w: 1000 })).toBe("/uploads/works/abc.md.webp");
		expect(mediaUrl(img, { w: 2000 })).toBe(img);
		expect(mediaUrl(img)).toBe(img);
	});

	it("builds video derivatives", () => {
		expect(mediaVideoPreview(vid)).toBe("/uploads/works/abc.preview.mp4");
		expect(mediaVideoGrid(vid)).toBe("/uploads/works/abc.grid.mp4");
		expect(mediaPoster(vid)).toBe("/uploads/works/abc.poster.jpg");
		expect(mediaVideoThumb(vid)).toBe("/uploads/works/abc.thumb.jpg");
		expect(mediaBlur(img)).toBe("/uploads/works/abc.blur.webp");
	});

	it("leaves external URLs alone", () => {
		const ext = "https://cdn.example.com/a.webp";
		expect(mediaUrl(ext, { w: 400 })).toBe(ext);
		expect(mediaBlur(ext)).toBe(ext);
	});

	it("has no poster for images", () => {
		expect(mediaPoster(img)).toBe("");
	});
});
