import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { isAdmin } from "@/lib/admin-auth";
import { saveUpload, streamToTmp } from "@/lib/storage";

// Common skeleton for a file upload from the admin: check permissions, take the file from
// the form, save to a temp file, put into storage and always clean up
// after itself. Only what to do with the saved file differs, and that is
// supplied by the calling route.
type Saved = Awaited<ReturnType<typeof saveUpload>>;

// What we accept at all. Everything else is rejected before writing to disk: "upload
// anything" is too broad a right even for the admin.
const ALLOWED_TYPES = new Set([
	"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
	"image/heic", "image/heif", "image/svg+xml",
	"video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/x-msvideo",
]);
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB: ceiling for a phone video

export async function handleUpload(
	req: NextRequest,
	folder: string,
	onSaved: (saved: Saved, form: FormData) => Promise<Record<string, unknown>> | Record<string, unknown>,
): Promise<NextResponse> {
	if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	const formData = await req.formData();
	const file = formData.get("file") as File | null;
	if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

	if (file.size > MAX_BYTES) {
		return NextResponse.json(
			{ error: `файл больше ${Math.round(MAX_BYTES / 1024 / 1024)} МБ` },
			{ status: 413 },
		);
	}
	if (file.type && !ALLOWED_TYPES.has(file.type)) {
		return NextResponse.json({ error: `тип ${file.type} не поддерживается` }, { status: 415 });
	}

	const tmp = await streamToTmp(file);
	try {
		const saved = await saveUpload(tmp, folder, file.name, file.type);
		return NextResponse.json(await onSaved(saved, formData));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const sizeMb = (file.size / 1024 / 1024).toFixed(1);
		console.error(`[${folder}/upload] failed name=${file.name} type=${file.type} size=${sizeMb}MB message=${message}`);
		return NextResponse.json({ error: message }, { status: 500 });
	} finally {
		await fs.unlink(tmp).catch(() => {});
	}
}
