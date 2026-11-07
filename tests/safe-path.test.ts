import { describe, expect, it } from "vitest";
import { isLocalPath, toLocalPath } from "@/lib/safe-path";

describe("isLocalPath", () => {
	it("accepts site paths", () => {
		expect(isLocalPath("/")).toBe(true);
		expect(isLocalPath("/works/site-a?x=1")).toBe(true);
	});

	it("rejects other hosts and non-paths", () => {
		expect(isLocalPath("//evil.com")).toBe(false);
		expect(isLocalPath("/\\evil.com")).toBe(false);
		expect(isLocalPath("https://evil.com")).toBe(false);
		expect(isLocalPath("works")).toBe(false);
		expect(isLocalPath(null)).toBe(false);
	});
});

describe("toLocalPath", () => {
	it("adds the leading slash and trims", () => {
		expect(toLocalPath("  resume-file ")).toBe("/resume-file");
	});

	it("falls back to the home page", () => {
		expect(toLocalPath("")).toBe("/");
		expect(toLocalPath(undefined)).toBe("/");
		expect(toLocalPath("//evil.com")).toBe("/");
		expect(toLocalPath("/\\evil.com")).toBe("/");
	});
});
