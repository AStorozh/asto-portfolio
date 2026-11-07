// Warm-up of derivatives for already uploaded media: thumbnails/medium sizes
// of images and light preview videos for grids. The /uploads route can build them
// on the fly, but then the first visitor pays for generation - this endpoint does
// the work ahead of time.
//
// Open once in the browser as admin - the work runs in the background, the response comes
// back immediately. A repeat visit shows progress:
//   /api/admin/backfill-derivatives            - create the missing ones
//   /api/admin/backfill-derivatives?rebuild=1  - rebuild everything from scratch
//   ...&only=preview                           - video previews only
// A repeat call is safe: while work is in progress, a second run doesn't start.

import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildImageDerivative, buildVideoGrid, buildVideoPreview, buildVideoStill, type ImageVariant } from "@/lib/storage";

export const maxDuration = 300;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

type Job = { src: string; dest: string; kind: "image" | "preview" | "grid" | "still"; variant?: string };

async function exists(p: string): Promise<boolean> {
	try {
		return (await fs.stat(p)).isFile();
	} catch {
		return false;
	}
}

// Walk UPLOAD_DIR and collect the missing derivatives.
async function collect(dir: string, jobs: Job[], rebuild = false): Promise<void> {
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			await collect(full, jobs, rebuild);
			continue;
		}
		// Sources are files without a derivative suffix in the name.
		if (e.name.endsWith(".webp") && !/\.(md|sm|blur)\.webp$/.test(e.name)) {
			const base = full.slice(0, -".webp".length);
			for (const v of ["md", "sm", "blur"] as ImageVariant[]) {
				const dest = `${base}.${v}.webp`;
				if (rebuild || !(await exists(dest))) jobs.push({ src: full, dest, kind: "image", variant: v });
			}
		} else if (e.name.endsWith(".mp4") && !/\.(preview|grid)\.mp4$/.test(e.name)) {
			const base = full.slice(0, -".mp4".length);
			if (rebuild || !(await exists(`${base}.preview.mp4`)))
				jobs.push({ src: full, dest: `${base}.preview.mp4`, kind: "preview" });
			if (rebuild || !(await exists(`${base}.grid.mp4`)))
				jobs.push({ src: full, dest: `${base}.grid.mp4`, kind: "grid" });
			for (const k of ["poster", "thumb"]) {
				const dest = `${base}.${k}.jpg`;
				if (rebuild || !(await exists(dest))) jobs.push({ src: full, dest, kind: "still", variant: k });
			}
		}
	}
}

// Progress of the background run: one per process.
type Progress = {
	running: boolean;
	total: number;
	done: number;
	failed: { file: string; error: string }[];
	startedAt: number;
	finishedAt?: number;
};
let progress: Progress | null = null;

async function runJob(job: Job): Promise<void> {
	if (job.kind === "image") await buildImageDerivative(job.src, job.dest, job.variant as ImageVariant);
	else if (job.kind === "preview") await buildVideoPreview(job.src, job.dest);
	else if (job.kind === "grid") await buildVideoGrid(job.src, job.dest);
	else await buildVideoStill(job.src, job.dest, job.variant as "poster" | "thumb");
}

// Run the queue in the background: videos encode for minutes, and holding an HTTP request
// for all that time is not possible - the browser or nginx would drop the connection midway.
async function runAll(jobs: Job[]) {
	for (const job of jobs) {
		try {
			await runJob(job);
		} catch (e) {
			progress?.failed.push({
				file: path.relative(UPLOAD_DIR, job.dest),
				error: e instanceof Error ? e.message : "unknown",
			});
		}
		if (progress) progress.done++;
	}
	if (progress) {
		progress.running = false;
		progress.finishedAt = Date.now();
	}
}

function report(extra: Record<string, unknown> = {}) {
	if (!progress) return NextResponse.json({ status: "idle", ...extra });
	const left = progress.total - progress.done;
	return NextResponse.json({
		status: progress.running ? "работаю" : "готово",
		обработано: progress.done,
		всего: progress.total,
		осталось: left,
		ошибок: progress.failed.length,
		failed: progress.failed.slice(0, 20),
		секунд: Math.round(((progress.finishedAt ?? Date.now()) - progress.startedAt) / 1000),
		...extra,
	});
}

async function handle(req: NextRequest) {
	if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	// Work is already running - just show progress, don't start a second run.
	if (progress?.running) return report();

	// rebuild=1 - rebuild even existing derivatives: needed when quality
	// settings (size/crf) changed, otherwise old files would stay forever.
	const rebuild = req.nextUrl.searchParams.get("rebuild") === "1";
	// only=preview|image|still - fix a single type of derivative.
	const only = req.nextUrl.searchParams.get("only");

	const all: Job[] = [];
	await collect(UPLOAD_DIR, all, rebuild);
	// Images are fast - they go first; videos (ffmpeg) follow one at a time.
	const jobs = (only ? all.filter((j) => j.kind === only) : all)
		.sort((a, b) => (a.kind === "preview" || a.kind === "grid" ? 1 : 0) - (b.kind === "preview" || b.kind === "grid" ? 1 : 0));

	if (jobs.length === 0) return report({ status: "нечего делать" });

	progress = { running: true, total: jobs.length, done: 0, failed: [], startedAt: Date.now() };
	void runAll(jobs);

	return report({ запущено: true, подсказка: "обнови эту страницу, чтобы увидеть прогресс" });
}

export const POST = handle;
export const GET = handle;
