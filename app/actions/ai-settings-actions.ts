"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import { aiSettings } from "@/lib/schema";
import { invalidateAiKnowledge } from "@/lib/ai-context";
import { revalidateContent } from "@/lib/revalidate";

// Keys that can be configured in /admin/ai-assistant.
const ALLOWED_KEYS = [
	"system_prompt",
	"mode_vacancy",
	"mode_task",
	"mode_market",
	"model",
	"temperature",
	"web_search_enabled",
	"max_searches",
	"realtime_model",
	"realtime_voice",
] as const;

export async function saveAiSettings(fd: FormData) {
	await requireAdmin();
	for (const key of ALLOWED_KEYS) {
		if (!fd.has(key)) continue;
		const value = (fd.get(key) as string) ?? "";
		await db
			.insert(aiSettings)
			.values({ key, value })
			.onConflictDoUpdate({ target: aiSettings.key, set: { value } });
	}

	// The content may not have changed, but reset the dossier cache just in case -
	// settings and knowledge are read together.
	invalidateAiKnowledge();
	revalidateContent("/admin/ai-assistant");
}
