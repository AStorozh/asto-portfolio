import { asc, eq } from "drizzle-orm";
import { workHowDone, workResults, workTags, workWhatIDid } from "@/lib/schema";
import type { Tx } from "./audit-core";

// Work lists (tags, "what I did", "how it's built", results) in full and as they are stored in the database, together with translations.
// Needed so that list edits are written to the journal as "before and after" and rolled back without losing translations.

export type Lists = {
	tags: string[];
	tags_en: (string | null)[];
	tags_de: (string | null)[];
	what_i_did: string[];
	how_done: string[];
	results: string[];
	results_en: (string | null)[];
	results_de: (string | null)[];
};

/** List groups: each has its own field names. An edit and a rollback touch the whole group. */
export const GROUPS: Record<string, (keyof Lists)[]> = {
	tags: ["tags", "tags_en", "tags_de"],
	what_i_did: ["what_i_did"],
	how_done: ["how_done"],
	results: ["results", "results_en", "results_de"],
};

export async function readLists(tx: Tx, workId: number): Promise<Lists> {
	const [tags, did, how, results] = await Promise.all([
		tx.select().from(workTags).where(eq(workTags.work_id, workId)).orderBy(asc(workTags.sort_order)),
		tx.select().from(workWhatIDid).where(eq(workWhatIDid.work_id, workId)).orderBy(asc(workWhatIDid.sort_order)),
		tx.select().from(workHowDone).where(eq(workHowDone.work_id, workId)).orderBy(asc(workHowDone.sort_order)),
		tx.select().from(workResults).where(eq(workResults.work_id, workId)).orderBy(asc(workResults.sort_order)),
	]);
	return {
		tags: tags.map((t) => t.tag),
		tags_en: tags.map((t) => t.tag_en),
		tags_de: tags.map((t) => t.tag_de),
		what_i_did: did.map((r) => r.text),
		how_done: how.map((r) => r.text),
		results: results.map((r) => r.text),
		results_en: results.map((r) => r.text_en),
		results_de: results.map((r) => r.text_de),
	};
}

/** Write list groups from a snapshot (the group's old rows are deleted). The snapshot must contain all the group's fields. */
export async function writeLists(tx: Tx, workId: number, lists: Partial<Lists>): Promise<void> {
	if (lists.tags) {
		await tx.delete(workTags).where(eq(workTags.work_id, workId));
		if (lists.tags.length) {
			await tx.insert(workTags).values(
				lists.tags.map((tag, i) => ({ work_id: workId, tag, tag_en: lists.tags_en?.[i] ?? null, tag_de: lists.tags_de?.[i] ?? null, sort_order: i })),
			);
		}
	}
	for (const [key, table] of [["what_i_did", workWhatIDid], ["how_done", workHowDone]] as const) {
		const rows = lists[key];
		if (!rows) continue;
		await tx.delete(table).where(eq(table.work_id, workId));
		if (rows.length) await tx.insert(table).values(rows.map((text, i) => ({ work_id: workId, text, sort_order: i })));
	}
	if (lists.results) {
		await tx.delete(workResults).where(eq(workResults.work_id, workId));
		if (lists.results.length) {
			await tx.insert(workResults).values(
				lists.results.map((text, i) => ({ work_id: workId, text, text_en: lists.results_en?.[i] ?? null, text_de: lists.results_de?.[i] ?? null, sort_order: i })),
			);
		}
	}
}

/** From a full snapshot keep only the groups that are affected (by the presence of their fields in the set). */
export function pick(lists: Lists, groups: string[]): Partial<Lists> {
	const out: Partial<Lists> = {};
	for (const g of groups) for (const f of GROUPS[g]) (out as Record<string, unknown>)[f] = lists[f];
	return out;
}
