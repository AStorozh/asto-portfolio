import { handleUpload } from "@/lib/upload-route";
import { NextRequest } from "next/server";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
	return handleUpload(req, "works", ({ url, key }) => ({ url, storageKey: key }));
}
