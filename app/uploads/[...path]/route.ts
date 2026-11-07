// Serving uploaded media from UPLOAD_DIR. Works right after deploy (until
// nginx is configured to serve /uploads directly). Supports Range - needed for
// seeking/preloading video (<video preload="metadata">).

import { NextRequest } from "next/server";
import { ensureDerivative } from "@/lib/storage";
import { createReadStream, promises as fs } from "fs";
import { Readable } from "stream";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

const MIME: Record<string, string> = {
	".webp": "image/webp",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".mp4": "video/mp4",
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
	const { path: segs } = await ctx.params;
	const rel = segs.join("/");
	if (rel.includes("..") || rel.includes("\0")) return new Response("bad request", { status: 400 });

	const filePath = path.join(UPLOAD_DIR, rel);
	if (!path.resolve(filePath).startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
		return new Response("forbidden", { status: 403 });
	}

	// Derivatives (thumbnail, preview video, frame) are generated on the fly if they
	// do not exist yet: files from old uploads thus "catch up" with the current naming convention.
	let servePath = filePath;
	let immutable = true;

	let stat;
	try {
		stat = await fs.stat(servePath);
		if (!stat.isFile()) throw new Error("not a file");
	} catch {
		const built = await ensureDerivative(filePath).catch(() => ({ status: "miss" }) as const);
		if (built.status === "pending") {
			// Preview transcode runs in the background - serve the original for now, but without a permanent cache,
			// so the next request picks up the lightweight version.
			servePath = built.fallback;
			immutable = false;
		} else if (built.status === "miss") {
			// Local dev: the file is not in UPLOAD_DIR - the media lives on the VPS. Redirect to
			// the prod origin to see real images/videos without downloading the whole folder.
			// MEDIA_FALLBACK_ORIGIN is not set in prod, so this is simply a 404.
			const fallback = process.env.MEDIA_FALLBACK_ORIGIN;
			if (fallback) {
				// The derivative may be missing on the origin too (file uploaded before it existed) -
				// then point to the source: heavier, but the image/video is there.
				const base = rel
					.replace(/\.(md|sm|blur)\.webp$/, ".webp")
					.replace(/\.preview\.mp4$/, ".mp4");
				return Response.redirect(`${fallback.replace(/\/$/, "")}/uploads/${base}`, 307);
			}
			return new Response("not found", { status: 404 });
		}
		try {
			stat = await fs.stat(servePath);
			if (!stat.isFile()) throw new Error("not a file");
		} catch {
			return new Response("not found", { status: 404 });
		}
	}

	const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
	const baseHeaders: Record<string, string> = {
		"Content-Type": type,
		"Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=60",
		"Accept-Ranges": "bytes",
		// Do not guess the type from content: otherwise a spoofed extension may
		// make the browser execute the file as a script.
		"X-Content-Type-Options": "nosniff",
	};

	// SVG is XML and may contain <script>. Opened via a direct
	// link, it would run in the site's context, so we lock it down completely.
	if (type === "image/svg+xml") {
		baseHeaders["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
	}

	const range = req.headers.get("range");
	if (range) {
		const m = /bytes=(\d*)-(\d*)/.exec(range);
		let start = m && m[1] ? parseInt(m[1], 10) : 0;
		let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
		if (!Number.isFinite(start)) start = 0;
		if (!Number.isFinite(end) || end >= stat.size) end = stat.size - 1;
		if (start > end || start >= stat.size) {
			return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
		}
		const stream = createReadStream(servePath, { start, end });
		return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
			status: 206,
			headers: {
				...baseHeaders,
				"Content-Range": `bytes ${start}-${end}/${stat.size}`,
				"Content-Length": String(end - start + 1),
			},
		});
	}

	const stream = createReadStream(servePath);
	return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
		status: 200,
		headers: { ...baseHeaders, "Content-Length": String(stat.size) },
	});
}
