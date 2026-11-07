import type { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";

const execFileP = promisify(execFile);

export const dynamic = "force-dynamic";

function chromeBinary(): string {
	const candidates = [
		process.env.CHROME_PATH,
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/Applications/Chromium.app/Contents/MacOS/Chromium",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium-browser",
		"/usr/bin/chromium",
	].filter(Boolean) as string[];
	for (const c of candidates) {
		if (c.includes("/") && existsSync(c)) return c;
	}
	return "google-chrome"; // last resort - from PATH
}

export async function GET(req: NextRequest) {
	const cookieLang = req.cookies.get("lang")?.value;
	const lang = cookieLang === "en" ? "en" : cookieLang === "de" ? "de" : "ru";
	const host = req.headers.get("host") ?? "127.0.0.1:3000";
	const proto = req.headers.get("x-forwarded-proto") ?? "http";
	const url = `${proto}://${host}/resume-file/print?lang=${lang}`;
	const out = path.join(os.tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);

	try {
		await execFileP(
			chromeBinary(),
			[
				"--headless=new",
				"--no-sandbox",
				"--disable-gpu",
				"--no-pdf-header-footer",
				"--virtual-time-budget=4000",
				`--print-to-pdf=${out}`,
				url,
			],
			{ timeout: 30000 },
		);
		const pdf = await readFile(out);
		unlink(out).catch(() => {});
		return new Response(new Uint8Array(pdf), {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": 'attachment; filename="resume.pdf"',
				"Cache-Control": "no-store",
			},
		});
	} catch (e) {
		unlink(out).catch(() => {});
		return new Response("PDF generation failed: " + (e as Error).message, { status: 500 });
	}
}
