// Local media storage on the VPS.
//
// On upload, files are optimized and written to disk (UPLOAD_DIR), and exposed
// via URLs like /uploads/<folder>/<id>.<ext>. Derivatives (thumbnail, blur,
// video poster) are derived from the main file's name by pure string logic - see lib/media-url.ts.
//
// Naming convention (everything is derived from <id>):
//   image:     <id>.webp   <id>.md.webp (≤1280)   <id>.sm.webp (≤640)   <id>.blur.webp (32px)
//   svg/gif:   <id>.svg / <id>.gif (as is, no derivatives)
//   video:     <id>.mp4   <id>.preview.mp4 (≤720p, 30fps, no audio; if it is not at least 10%
//              lighter than the original, it is just a copy of it)
//              <id>.grid.mp4 (≤540p - for gallery tiles)
//              <id>.poster.jpg (blurred frame)   <id>.thumb.jpg (sharp frame)
//
// Derivatives are self-healing: if a file is missing on disk, the /uploads route
// rebuilds it on the fly via ensureDerivative() (see app/uploads/[...path]/route.ts).

import { promises as fs, createWriteStream } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import sharp from "sharp";

export const PUBLIC_BASE = "/uploads";
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"]);

export type SaveResult = {
	url: string;
	key: string; // relative key "folder/id.ext" - written to the cloudinary_id field for deletion
	mediaType: "image" | "video";
	width: number | null;
	height: number | null;
};

function extOf(name: string): string {
	return path.extname(name).toLowerCase();
}

function isVideoInput(name: string, mime: string): boolean {
	return mime.startsWith("video/") || VIDEO_EXTS.has(extOf(name));
}

// Write the incoming file (web stream) to a temp file on disk - we don't keep
// the whole file (especially video up to 100 MB) in memory.
export async function streamToTmp(file: File): Promise<string> {
	const tmp = path.join(os.tmpdir(), `up-${randomUUID()}${extOf(file.name) || ""}`);
	const nodeStream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
	await pipeline(nodeStream, createWriteStream(tmp));
	return tmp;
}

function run(cmd: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args);
		let stderr = "";
		let stdout = "";
		p.stdout.on("data", (d) => (stdout += d));
		p.stderr.on("data", (d) => (stderr += d));
		p.on("error", reject);
		p.on("close", (code) => {
			if (code === 0) resolve(stdout.trim());
			else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-800)}`));
		});
	});
}

async function probeDimensions(input: string): Promise<{ width: number | null; height: number | null }> {
	try {
		const out = await run(FFPROBE, [
			"-v", "error",
			"-select_streams", "v:0",
			"-show_entries", "stream=width,height",
			"-of", "csv=p=0",
			input,
		]);
		const [w, h] = out.split(",").map((n) => parseInt(n.trim(), 10));
		return { width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null };
	} catch {
		return { width: null, height: null };
	}
}

async function saveImage(tmp: string, folder: string, origName: string, mime: string): Promise<SaveResult> {
	const dir = path.join(UPLOAD_DIR, folder);
	await fs.mkdir(dir, { recursive: true });
	const id = randomUUID();
	const ext = extOf(origName);

	// SVG (logos/favicon) - stored as is: vector quality and a correct type matter.
	if (mime === "image/svg+xml" || ext === ".svg") {
		await fs.copyFile(tmp, path.join(dir, `${id}.svg`));
		return { url: `${PUBLIC_BASE}/${folder}/${id}.svg`, key: `${folder}/${id}.svg`, mediaType: "image", width: null, height: null };
	}

	// GIF - stored as is (animation), no derivatives.
	if (mime === "image/gif" || ext === ".gif") {
		await fs.copyFile(tmp, path.join(dir, `${id}.gif`));
		const meta = await sharp(tmp).metadata().catch(() => null);
		return { url: `${PUBLIC_BASE}/${folder}/${id}.gif`, key: `${folder}/${id}.gif`, mediaType: "image", width: meta?.width ?? null, height: meta?.height ?? null };
	}

	// Raster image → webp in four sizes: full (≤2000), medium (≤1280),
	// small (≤640), blur (32px). Grids pick the size matching the tile width (see mediaUrl).
	const full = path.join(dir, `${id}.webp`);

	await sharp(tmp).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(full);
	await buildImageDerivative(full, path.join(dir, `${id}.md.webp`), "md");
	await buildImageDerivative(full, path.join(dir, `${id}.sm.webp`), "sm");
	await buildImageDerivative(full, path.join(dir, `${id}.blur.webp`), "blur");

	const meta = await sharp(full).metadata().catch(() => null);
	return {
		url: `${PUBLIC_BASE}/${folder}/${id}.webp`,
		key: `${folder}/${id}.webp`,
		mediaType: "image",
		width: meta?.width ?? null,
		height: meta?.height ?? null,
	};
}

// ─── Derivatives ───────────────────────────────────────────────────────────
// Separate functions so that files from old uploads can self-heal with the same code
// (the /uploads route builds the missing derivative on first request).

export type ImageVariant = "md" | "sm" | "blur";

const IMAGE_VARIANTS: Record<ImageVariant, { size: number; quality: number }> = {
	md: { size: 1400, quality: 86 },
	sm: { size: 720, quality: 84 },
	blur: { size: 32, quality: 40 },
};

export async function buildImageDerivative(src: string, dest: string, variant: ImageVariant): Promise<void> {
	const { size, quality } = IMAGE_VARIANTS[variant];
	const fit = variant === "blur" ? "inside" : "inside";
	await sharp(src)
		.rotate()
		.resize(size, size, { fit, withoutEnlargement: variant !== "blur" })
		.webp({ quality })
		.toFile(dest);
}

// Preview video: scaled by the longer side to 720px, no audio, up to 30 fps.
// 720px is enough even for wide grid tiles on retina; below that, softness becomes noticeable.
// Bitrate ceiling so that dynamic clips don't weigh megabytes; faststart so
// playback can begin before the full download.
export async function buildVideoPreview(src: string, dest: string): Promise<void> {
	await run(FFMPEG, [
		"-i", src,
		"-an",
		"-vf", "scale='if(gt(iw,ih),min(720,iw),-2)':'if(gt(iw,ih),-2,min(720,ih))',fps='min(30,source_fps)'",
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "25",
		"-maxrate", "1800k", "-bufsize", "3600k",
		"-g", "60",
		"-movflags", "+faststart",
		"-y", dest,
	]);

	// The source is sometimes already well compressed - then re-encoding only loses
	// quality without saving weight. In that case we store a copy of the original.
	try {
		const [srcStat, destStat] = await Promise.all([fs.stat(src), fs.stat(dest)]);
		if (destStat.size > srcStat.size * 0.9) await fs.copyFile(src, dest);
	} catch {
		// could not compare - leave as is
	}
}

// Copy for grids: a tile is ~350px on screen, 540p is plenty. Weight here
// decides how soon a video starts playing - the file must manage to download
// while the tile is scrolling toward the screen.
export async function buildVideoGrid(src: string, dest: string): Promise<void> {
	await run(FFMPEG, [
		"-i", src,
		"-an",
		"-vf", "scale='if(gt(iw,ih),min(540,iw),-2)':'if(gt(iw,ih),-2,min(540,ih))',fps='min(30,source_fps)'",
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "25",
		"-maxrate", "1400k", "-bufsize", "2800k",
		"-g", "60",
		"-movflags", "+faststart",
		"-y", dest,
	]);

	try {
		const [srcStat, destStat] = await Promise.all([fs.stat(src), fs.stat(dest)]);
		if (destStat.size > srcStat.size * 0.9) await fs.copyFile(src, dest);
	} catch {
		// could not compare - leave as is
	}
}

export async function buildVideoStill(src: string, dest: string, kind: "poster" | "thumb"): Promise<void> {
	const vf = kind === "poster" ? "scale=64:-2,boxblur=4:1" : "scale=400:-2";
	await run(FFMPEG, ["-i", src, "-frames:v", "1", "-vf", vf, "-q:v", kind === "poster" ? "8" : "4", "-y", dest]);
}

// Self-healing of derivatives. Takes the ABSOLUTE path of the requested file
// inside UPLOAD_DIR and, if it is a known derivative and the source exists, builds it.
//   • images (sharp, tens of ms) - built synchronously, returns "ready";
//   • preview videos (ffmpeg, seconds) - started in the background, returns "pending",
//     so the route serves the original for now and doesn't hold the request.
// Concurrent requests for the same file share one task (inflight).
const inflight = new Map<string, Promise<unknown>>();

// Video transcoding is heavy; on a 2-core VPS a dozen parallel ffmpeg processes
// would take the site down. So background previews are built strictly one at a time.
let videoChain: Promise<unknown> = Promise.resolve();

function queueVideo<T>(task: () => Promise<T>): Promise<T> {
	const next = videoChain.then(task, task);
	videoChain = next.catch(() => {});
	return next;
}

function once<T>(key: string, task: () => Promise<T>): Promise<T> {
	const running = inflight.get(key) as Promise<T> | undefined;
	if (running) return running;
	const p = task().finally(() => inflight.delete(key));
	inflight.set(key, p);
	return p;
}

async function exists(p: string): Promise<boolean> {
	try {
		return (await fs.stat(p)).isFile();
	} catch {
		return false;
	}
}

export type EnsureResult = { status: "ready" } | { status: "pending"; fallback: string } | { status: "miss" };

export async function ensureDerivative(filePath: string): Promise<EnsureResult> {
	const dir = path.dirname(filePath);
	const name = path.basename(filePath);
	// Sources are always named <uuid>.<ext> (no dots in the id). Matching only dot-free ids
	// stops chains like <id>.md.md.webp or <id>.grid.grid.mp4, where a derivative would be
	// used as a source and every new name would create another file or ffmpeg job.

	const img = /^([^.]+)\.(md|sm|blur)\.webp$/.exec(name);
	if (img) {
		const src = path.join(dir, `${img[1]}.webp`);
		if (!(await exists(src))) return { status: "miss" };
		await once(filePath, () => buildImageDerivative(src, filePath, img[2] as ImageVariant));
		return { status: "ready" };
	}

	const still = /^([^.]+)\.(poster|thumb)\.jpg$/.exec(name);
	if (still) {
		const src = path.join(dir, `${still[1]}.mp4`);
		if (!(await exists(src))) return { status: "miss" };
		await once(filePath, () => buildVideoStill(src, filePath, still[2] as "poster" | "thumb"));
		return { status: "ready" };
	}

	const grid = /^([^.]+)\.grid\.mp4$/.exec(name);
	if (grid) {
		const src = path.join(dir, `${grid[1]}.mp4`);
		if (!(await exists(src))) return { status: "miss" };
		void once(filePath, () => queueVideo(() => buildVideoGrid(src, filePath))).catch(() => {});
		return { status: "pending", fallback: src };
	}

	const preview = /^([^.]+)\.preview\.mp4$/.exec(name);
	if (preview) {
		const src = path.join(dir, `${preview[1]}.mp4`);
		if (!(await exists(src))) return { status: "miss" };
		// don't wait: transcoding runs in the background, the current visitor gets the original
		void once(filePath, () => queueVideo(() => buildVideoPreview(src, filePath))).catch(() => {});
		return { status: "pending", fallback: src };
	}

	return { status: "miss" };
}

async function saveVideo(tmp: string, folder: string): Promise<SaveResult> {
	const dir = path.join(UPLOAD_DIR, folder);
	await fs.mkdir(dir, { recursive: true });
	const id = randomUUID();

	const mp4 = path.join(dir, `${id}.mp4`);
	const preview = path.join(dir, `${id}.preview.mp4`);
	const poster = path.join(dir, `${id}.poster.jpg`);
	const thumb = path.join(dir, `${id}.thumb.jpg`);

	// Transcode to web-friendly mp4 (h264/aac), width ≤1280, faststart for streaming.
	await run(FFMPEG, [
		"-i", tmp,
		"-vf", "scale='min(1280,iw)':-2",
		"-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
		"-c:a", "aac", "-b:a", "128k",
		"-movflags", "+faststart",
		"-y", mp4,
	]);
	// Light preview copy for grids: ≤480px on the longer side, no audio, 24 fps.
	// The gallery plays this one (5-6x lighter than the original); the full mp4 plays on click.
	await buildVideoPreview(mp4, preview).catch(() => {});
	// Poster - a blurred first frame (instant placeholder).
	await run(FFMPEG, ["-i", tmp, "-frames:v", "1", "-vf", "scale=64:-2,boxblur=4:1", "-q:v", "8", "-y", poster]).catch(() => {});
	// Sharp preview frame for admin thumbnails.
	await run(FFMPEG, ["-i", tmp, "-frames:v", "1", "-vf", "scale=400:-2", "-q:v", "4", "-y", thumb]).catch(() => {});

	const { width, height } = await probeDimensions(mp4);
	return { url: `${PUBLIC_BASE}/${folder}/${id}.mp4`, key: `${folder}/${id}.mp4`, mediaType: "video", width, height };
}

// Single upload entry point: tmp is the path to the temporarily saved source.
export async function saveUpload(tmp: string, folder: string, origName: string, mime: string): Promise<SaveResult> {
	return isVideoInput(origName, mime) ? saveVideo(tmp, folder) : saveImage(tmp, folder, origName, mime);
}

export function isLocalUrl(url: string | null | undefined): boolean {
	return !!url && url.startsWith(`${PUBLIC_BASE}/`);
}

// Deletion: remove both the original and all derivatives - they sit side by side and differ
// only by the name suffix (<id>.webp, <id>.sm.webp, <id>.preview.mp4, etc.).
export async function deleteUpload(opts: { url?: string | null }): Promise<void> {
	const { url } = opts;

	if (isLocalUrl(url)) {
		const rel = url!.slice(PUBLIC_BASE.length + 1); // folder/<id>.ext
		const folder = path.dirname(rel);
		const base = path.basename(rel).split(".")[0]; // <id> without extensions
		if (!base) return;
		const dir = path.join(UPLOAD_DIR, folder);
		if (!path.resolve(dir).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return;
		try {
			const files = await fs.readdir(dir);
			await Promise.all(
				files.filter((f) => f === base || f.startsWith(`${base}.`)).map((f) => fs.unlink(path.join(dir, f)).catch(() => {})),
			);
		} catch {
			/* folder doesn't exist - nothing to delete */
		}
	}
}
