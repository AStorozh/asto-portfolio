import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { exportAnalyticsToSheet } from "@/lib/analytics-export";

export const maxDuration = 60;

// Analytics export to Google Sheets.
// Access: either a signed-in admin, or cron with the header Authorization: Bearer CRON_SECRET
// (Vercel Cron adds it automatically if the CRON_SECRET env is set).
async function authorized(req: Request): Promise<boolean> {
	const secret = process.env.CRON_SECRET;
	const auth = req.headers.get("authorization");
	if (secret && auth === `Bearer ${secret}`) return true;
	return isAdmin();
}

async function run(req: Request) {
	if (!(await authorized(req))) {
		return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
	}
	const result = await exportAnalyticsToSheet();
	return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: Request) {
	return run(req);
}
export async function POST(req: Request) {
	return run(req);
}
