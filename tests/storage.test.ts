import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureDerivative } from "@/lib/storage";

const id = "0d285ac0-43b1-4739-9f61-b40e8e97b81e";
let dir: string;

beforeAll(async () => {
	dir = await mkdtemp(path.join(os.tmpdir(), "storage-test-"));
	await sharp({ create: { width: 64, height: 48, channels: 3, background: "#c90" } })
		.webp()
		.toFile(path.join(dir, `${id}.webp`));
});

afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("ensureDerivative", () => {
	it("builds a missing image variant from the original", async () => {
		expect(await ensureDerivative(path.join(dir, `${id}.md.webp`))).toEqual({ status: "ready" });
		expect(await readdir(dir)).toContain(`${id}.md.webp`);
	});

	it("refuses derivative chains and creates no files", async () => {
		const before = (await readdir(dir)).sort();
		for (const name of [`${id}.md.md.webp`, `${id}.sm.blur.webp`, `${id}.grid.grid.mp4`, `${id}.preview.preview.mp4`, `${id}.grid.poster.jpg`]) {
			expect(await ensureDerivative(path.join(dir, name))).toEqual({ status: "miss" });
		}
		expect((await readdir(dir)).sort()).toEqual(before);
	});

	it("misses when the original does not exist", async () => {
		expect(await ensureDerivative(path.join(dir, "nope.md.webp"))).toEqual({ status: "miss" });
		expect(await ensureDerivative(path.join(dir, "nope.preview.mp4"))).toEqual({ status: "miss" });
	});
});
