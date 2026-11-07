import { revalidatePath, revalidateTag } from "next/cache";
import { CONTENT_TAG } from "@/lib/content";
import { invalidateAiKnowledge } from "@/lib/ai-context";
import { db } from "@/lib/db";
import { auditReady, record } from "./audit-core";
import { errorReason } from "./http";

export type Target = string | { path: string; type: "layout" | "page" };

/**
 * Make an edit visible: reset the DB query cache and the pages that show this content
 * (as admin actions do), and refresh the site's AI-assistant dossier.
 * The tag is reset immediately (expire: 0): a plain revalidateTag would serve the visitor the old text one more time.
 */
export function publish(targets: Target[]): void {
	revalidateTag(CONTENT_TAG, { expire: 0 });
	for (const t of targets) {
		if (typeof t === "string") revalidatePath(t);
		else revalidatePath(t.path, t.type);
	}
	invalidateAiKnowledge();
}

/** A line for the server log (PM2): what Sena did and when. We don't write the texts themselves, only keys and lengths. */
export function audit(action: string, detail: Record<string, unknown>): void {
	console.log(`[sena-api] ${action} ${JSON.stringify(detail)}`);
}

/** Log entry for an action with no revert (cache reset, analytics export): it doesn't change data, so a log error doesn't block it. */
export async function logPlain(e: { action: string; target: string; summary: string }): Promise<void> {
	try {
		await auditReady();
		await db.transaction((tx) => record(tx, { ...e, changes: null, undo: null }));
	} catch (err) {
		console.error("[sena-api] запись в журнал не удалась:", errorReason(err));
	}
}
