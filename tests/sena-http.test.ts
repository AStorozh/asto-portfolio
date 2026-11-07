import { describe, expect, it } from "vitest";
import { ApiError, lines, onlyKnown, readJson, safeHref, text } from "@/lib/sena-api/http";

const post = (body: string) => new Request("http://localhost/", { method: "POST", body });

describe("sena-api validators", () => {
	it("text: type, length, emptiness and control characters", () => {
		expect(text("Hi", "f", { max: 5 })).toBe("Hi");
		expect(() => text(1, "f", { max: 5 })).toThrow(ApiError);
		expect(() => text("too long", "f", { max: 3 })).toThrow(ApiError);
		expect(() => text("  ", "f", { max: 5 })).toThrow(ApiError);
		expect(text("", "f", { max: 5, allowEmpty: true })).toBe("");
		expect(() => text("a\u0000b", "f", { max: 5 })).toThrow(ApiError);
	});

	it("safeHref: only http(s), mailto and tel", () => {
		expect(safeHref("https://example.com", "h")).toBe("https://example.com");
		expect(safeHref("mailto:a@b.c", "h")).toBe("mailto:a@b.c");
		expect(safeHref("tel:+7 (900) 000-00-00", "h")).toBe("tel:+7 (900) 000-00-00");
		expect(() => safeHref("javascript:alert(1)", "h")).toThrow(ApiError);
		expect(() => safeHref("data:text/html,x", "h")).toThrow(ApiError);
	});

	it("lines: trims items, rejects empty ones, caps the count", () => {
		expect(lines([" a ", "b"], "l", { maxItems: 5, maxLen: 10 })).toEqual(["a", "b"]);
		expect(() => lines(["a", " "], "l", { maxItems: 5, maxLen: 10 })).toThrow(ApiError);
		expect(() => lines(["a", "b"], "l", { maxItems: 1, maxLen: 10 })).toThrow(ApiError);
	});

	it("onlyKnown: rejects unknown fields", () => {
		expect(() => onlyKnown({ a: 1 }, ["a"])).not.toThrow();
		expect(() => onlyKnown({ a: 1, typo: 2 }, ["a"])).toThrow(ApiError);
	});
});

describe("readJson", () => {
	it("parses an object and treats an empty body as {}", async () => {
		expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
		expect(await readJson(post(""))).toEqual({});
	});

	it("rejects non-objects, bad JSON and oversized bodies", async () => {
		await expect(readJson(post("[1]"))).rejects.toMatchObject({ status: 400 });
		await expect(readJson(post("{oops"))).rejects.toMatchObject({ status: 400 });
		await expect(readJson(post(JSON.stringify({ x: "a".repeat(600_000) })))).rejects.toMatchObject({ status: 413 });
	});
});
