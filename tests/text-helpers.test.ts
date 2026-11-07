import { describe, expect, it } from "vitest";
import { parseGalleryNotes } from "@/app/about/personal/gallery-notes-parse";
import { isBotUA } from "@/lib/bot-filter";
import { countryFromTimeZone } from "@/lib/geo-tz";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
	it("transliterates Cyrillic and normalizes", () => {
		expect(slugify("Привет, Мир!")).toBe("privet-mir");
		expect(slugify("  Hello   World  ")).toBe("hello-world");
		expect(slugify("Щука и ёж")).toBe("schuka-i-ezh");
	});

	it("caps the length", () => {
		expect(slugify("a".repeat(200))).toHaveLength(80);
	});
});

describe("isBotUA", () => {
	it("flags crawlers, tools and empty user agents", () => {
		expect(isBotUA("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
		expect(isBotUA("curl/8.5.0")).toBe(true);
		expect(isBotUA("Mozilla/5.0 HeadlessChrome/120")).toBe(true);
		expect(isBotUA("")).toBe(true);
		expect(isBotUA(null)).toBe(true);
	});

	it("lets real browsers through", () => {
		expect(
			isBotUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"),
		).toBe(false);
	});
});

describe("countryFromTimeZone", () => {
	it("maps known zones and ignores unknown ones", () => {
		expect(countryFromTimeZone("Europe/Moscow")).toBe("RU");
		expect(countryFromTimeZone("Mars/Base")).toBeNull();
		expect(countryFromTimeZone(undefined)).toBeNull();
	});
});

describe("parseGalleryNotes", () => {
	it("splits notes by empty lines, reads labels and quotes", () => {
		const notes = parseGalleryNotes("### Label\nFirst **note**\nline two\n\n:quote: Be curious\n\n\n");
		expect(notes).toEqual([
			{ label: "Label", text: "First note line two", quote: false },
			{ label: undefined, text: "Be curious", quote: true },
		]);
	});
});
