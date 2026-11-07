"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db, withDbRetry } from "@/lib/db";
import { deleteUpload } from "@/lib/storage";
import { workCategories, workImages, workItemCategories, workItems, workLinks, workResults, workTags } from "@/lib/schema";
import { slugify } from "@/lib/slug";
import { asc, eq, inArray } from "drizzle-orm";
import { revalidateContent } from "@/lib/revalidate";

// ─── Categories ───────────────────────────────────────────────────────────────

export async function addWorkCategory(formData: FormData) {
	await requireAdmin();
	const label = (formData.get("label") as string)?.trim();
	if (!label) return;
	const label_en = (formData.get("label_en") as string)?.trim() || null;
	const label_de = (formData.get("label_de") as string)?.trim() || null;
	const slug = label.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) + `-${Date.now()}`;
	const existing = await db.select({ sort_order: workCategories.sort_order }).from(workCategories).orderBy(asc(workCategories.sort_order));
	const nextOrder = existing.length > 0 ? (existing[existing.length - 1]?.sort_order ?? 0) + 1 : 0;
	await db.insert(workCategories).values({ slug, label, label_en, label_de, sort_order: nextOrder });
	revalidateContent("/admin/works");
	revalidateContent("/works");
}

export async function deleteWorkCategory(formData: FormData) {
	await requireAdmin();
	const id = parseInt(formData.get("id") as string);
	if (!id) return;
	await db.delete(workCategories).where(eq(workCategories.id, id));
	revalidateContent("/admin/works");
	revalidateContent("/works");
}

function parseLines(value: string): string[] {
	return value.split("\n").map((s) => s.trim()).filter(Boolean);
}

function parseTags(value: string): string[] {
	return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseList(value: string): string[] {
	return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Work links arrive as a JSON array [{ url, label }]. We keep only
// valid http(s) addresses and trim the label and URL length.
function parseLinks(value: string): { url: string; label: string }[] {
	let raw: unknown;
	try {
		raw = JSON.parse(value || "[]");
	} catch {
		return [];
	}
	if (!Array.isArray(raw)) return [];
	const out: { url: string; label: string }[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const url = String((item as { url?: unknown }).url ?? "").trim().slice(0, 500);
		if (!/^https?:\/\//i.test(url)) continue;
		const label = String((item as { label?: unknown }).label ?? "").trim().slice(0, 60);
		out.push({ url, label });
	}
	return out;
}

// A work can belong to several categories. All selected ids come from the form
// (field category_id, multiple values). We return valid ids in the selected
// order + the primary category (its label/label_en are written to work_items for compatibility
// and as the "main" label on the card).
async function resolveCategories(
	formData: FormData,
): Promise<{ ids: number[]; primaryLabel: string; primaryLabelEn: string | null; primaryLabelDe: string | null }> {
	let ids = formData
		.getAll("category_id")
		.map((v) => parseInt(String(v)))
		.filter((n) => Number.isFinite(n));
	ids = [...new Set(ids)];

	// Backward compatibility: if a single label came in the category field.
	if (ids.length === 0) {
		const label = (formData.get("category") as string)?.trim();
		if (label) {
			const [c] = await db.select().from(workCategories).where(eq(workCategories.label, label));
			if (c) ids = [c.id];
		}
	}
	if (ids.length === 0) return { ids: [], primaryLabel: "", primaryLabelEn: null, primaryLabelDe: null };

	const rows = await db.select().from(workCategories).where(inArray(workCategories.id, ids));
	const byId = new Map(rows.map((r) => [r.id, r]));
	const validIds = ids.filter((id) => byId.has(id));
	const first = validIds.length ? byId.get(validIds[0]) : undefined;
	return { ids: validIds, primaryLabel: first?.label ?? "", primaryLabelEn: first?.label_en ?? null, primaryLabelDe: first?.label_de ?? null };
}

export async function createWork(formData: FormData) {
	await requireAdmin();
	const title       = (formData.get("title")       as string)?.trim() ?? "";
	const titleEn     = (formData.get("title_en")    as string)?.trim() || null;
	const titleDe     = (formData.get("title_de")    as string)?.trim() || null;
	const description = (formData.get("description") as string)?.trim() ?? "";
	const descriptionEn = (formData.get("description_en") as string)?.trim() || null;
	const descriptionDe = (formData.get("description_de") as string)?.trim() || null;
	const overview    = (formData.get("overview")    as string)?.trim() ?? "";
	const overviewEn  = (formData.get("overview_en") as string)?.trim() || null;
	const overviewDe  = (formData.get("overview_de") as string)?.trim() || null;
	const imageUrls     = parseList(formData.get("image_urls")     as string ?? "");
	const storageKeys = parseList(formData.get("storage_keys") as string ?? "");
	const tools    = parseTags(formData.get("tools")    as string ?? "");
	const toolsEn  = parseTags(formData.get("tools_en") as string ?? "");
	const toolsDe  = parseTags(formData.get("tools_de") as string ?? "");
	const results   = parseLines(formData.get("results")    as string ?? "");
	const resultsEn = parseLines(formData.get("results_en") as string ?? "");
	const resultsDe = parseLines(formData.get("results_de") as string ?? "");

	const { ids: categoryIds, primaryLabel, primaryLabelEn, primaryLabelDe } = await resolveCategories(formData);
	const featured = formData.get("featured") === "true";

	// Slug: take the manually entered one, otherwise suggest one from the title (with transliteration).
	const rawSlug = (formData.get("slug") as string)?.trim() ?? "";
	let slug = slugify(rawSlug) || slugify(title) || `work-${Date.now()}`;
	const existing = await db.select({ slug: workItems.slug }).from(workItems);
	if (existing.some((r) => r.slug === slug)) slug = `${slug}-${Date.now()}`;

	const [work] = await db
		.insert(workItems)
		.values({
			slug,
			title,
			title_en: titleEn,
			title_de: titleDe,
			category: primaryLabel,
			category_en: primaryLabelEn,
			category_de: primaryLabelDe,
			description,
			description_en: descriptionEn,
			description_de: descriptionDe,
			overview,
			overview_en: overviewEn,
			overview_de: overviewDe,
			featured,
			sort_order: 0,
		})
		.returning({ id: workItems.id });

	if (!work) return;

	if (categoryIds.length)
		await db.insert(workItemCategories).values(
			categoryIds.map((category_id) => ({ work_id: work.id, category_id })),
		);

	if (imageUrls.length)
		await db.insert(workImages).values(
			imageUrls.map((url, i) => ({
				work_id: work.id,
				url,
				storage_key: storageKeys[i] ?? "",
				sort_order: i,
			})),
		);

	if (tools.length)
		await db.insert(workTags).values(
			tools.map((tag, i) => ({ work_id: work.id, tag, tag_en: toolsEn[i] || null, tag_de: toolsDe[i] || null, sort_order: i })),
		);

	if (results.length)
		await db.insert(workResults).values(
			results.map((text, i) => ({ work_id: work.id, text, text_en: resultsEn[i] || null, text_de: resultsDe[i] || null, sort_order: i })),
		);

	const links = parseLinks(formData.get("links") as string ?? "");
	if (links.length)
		await db.insert(workLinks).values(
			links.map((l, i) => ({ work_id: work.id, url: l.url, label: l.label, sort_order: i })),
		);

	revalidateContent("/admin/works");
	revalidateContent("/works");
	revalidateContent(`/works/${slug}`);
}

export async function updateWork(formData: FormData) {
	await requireAdmin();
	const id          = parseInt(formData.get("id")          as string);
	const rawSlug     = (formData.get("slug")        as string)?.trim() ?? "";
	const title       = (formData.get("title")       as string)?.trim() ?? "";
	const titleEn     = (formData.get("title_en")    as string)?.trim() || null;
	const titleDe     = (formData.get("title_de")    as string)?.trim() || null;
	const description = (formData.get("description") as string)?.trim() ?? "";
	const descriptionEn = (formData.get("description_en") as string)?.trim() || null;
	const descriptionDe = (formData.get("description_de") as string)?.trim() || null;
	const overview    = (formData.get("overview")    as string)?.trim() ?? "";
	const overviewEn  = (formData.get("overview_en") as string)?.trim() || null;
	const overviewDe  = (formData.get("overview_de") as string)?.trim() || null;
	const imageUrls     = parseList(formData.get("image_urls")     as string ?? "");
	const storageKeys = parseList(formData.get("storage_keys") as string ?? "");
	const tools    = parseTags(formData.get("tools")    as string ?? "");
	const toolsEn  = parseTags(formData.get("tools_en") as string ?? "");
	const toolsDe  = parseTags(formData.get("tools_de") as string ?? "");
	const results   = parseLines(formData.get("results")    as string ?? "");
	const resultsEn = parseLines(formData.get("results_en") as string ?? "");
	const resultsDe = parseLines(formData.get("results_de") as string ?? "");

	const { ids: categoryIds, primaryLabel, primaryLabelEn, primaryLabelDe } = await resolveCategories(formData);
	const featured = formData.get("featured") === "true";

	// Get the current slug before the update (for revalidatePath)
	const [current] = await db.select({ slug: workItems.slug }).from(workItems).where(eq(workItems.id, id));
	const oldSlug = current?.slug ?? rawSlug;

	// Sanitize the new slug (transliteration + normalization); if empty, keep the old one
	const newSlug = slugify(rawSlug) || slugify(title) || oldSlug;

	const existing = newSlug !== oldSlug
		? await db.select({ id: workItems.id }).from(workItems).where(eq(workItems.slug, newSlug))
		: [];
	const slugToUse = existing.length === 0 ? newSlug : oldSlug;

	await db
		.update(workItems)
		.set({
			slug: slugToUse,
			title,
			title_en: titleEn,
			title_de: titleDe,
			category: primaryLabel,
			category_en: primaryLabelEn,
			category_de: primaryLabelDe,
			description,
			description_en: descriptionEn,
			description_de: descriptionDe,
			overview,
			overview_en: overviewEn,
			overview_de: overviewDe,
			featured,
		})
		.where(eq(workItems.id, id));

	// Recreate links to categories (many-to-many).
	await db.delete(workItemCategories).where(eq(workItemCategories.work_id, id));
	if (categoryIds.length)
		await db.insert(workItemCategories).values(
			categoryIds.map((category_id) => ({ work_id: id, category_id })),
		);

	const oldImages = await db
		.select({ url: workImages.url, storage_key: workImages.storage_key })
		.from(workImages)
		.where(eq(workImages.work_id, id));

	await db.delete(workImages).where(eq(workImages.work_id, id));

	// Delete only those images that are no longer among the saved ones (compared by key).
	const removed = oldImages.filter((r) => r.storage_key && !storageKeys.includes(r.storage_key));

	await Promise.all(
		removed.map((r) => deleteUpload({ url: r.url })),
	);

	if (imageUrls.length)
		await db.insert(workImages).values(
			imageUrls.map((url, i) => ({
				work_id: id,
				url,
				storage_key: storageKeys[i] ?? "",
				sort_order: i,
			})),
		);

	await db.delete(workTags).where(eq(workTags.work_id, id));
	if (tools.length)
		await db.insert(workTags).values(
			tools.map((tag, i) => ({ work_id: id, tag, tag_en: toolsEn[i] || null, tag_de: toolsDe[i] || null, sort_order: i })),
		);

	await db.delete(workResults).where(eq(workResults.work_id, id));
	if (results.length)
		await db.insert(workResults).values(
			results.map((text, i) => ({ work_id: id, text, text_en: resultsEn[i] || null, text_de: resultsDe[i] || null, sort_order: i })),
		);

	const links = parseLinks(formData.get("links") as string ?? "");
	await db.delete(workLinks).where(eq(workLinks.work_id, id));
	if (links.length)
		await db.insert(workLinks).values(
			links.map((l, i) => ({ work_id: id, url: l.url, label: l.label, sort_order: i })),
		);

	revalidateContent("/admin/works");
	revalidateContent("/works");
	revalidateContent(`/works/${oldSlug}`);
	revalidateContent(`/works/${slugToUse}`);
}

export async function deleteWork(formData: FormData) {
	await requireAdmin();
	const id   = parseInt(formData.get("id")   as string);
	const slug = (formData.get("slug") as string)?.trim() ?? "";

	const images = await db
		.select({ url: workImages.url, storage_key: workImages.storage_key })
		.from(workImages)
		.where(eq(workImages.work_id, id));

	await db.delete(workItems).where(eq(workItems.id, id));

	await Promise.all(
		images.map((r) => deleteUpload({ url: r.url })),
	);

	revalidateContent("/admin/works");
	revalidateContent("/works");
	revalidateContent(`/works/${slug}`);
}

// Drag-and-drop order of works: we receive the list of ids in the new order and
// set sort_order = position. Idempotent, so it is safe to retry.
export async function reorderWorks(formData: FormData) {
	await requireAdmin();
	const ids = ((formData.get("ids") as string) ?? "")
		.split(",")
		.map((s) => parseInt(s.trim()))
		.filter((n) => Number.isFinite(n));
	if (ids.length === 0) return;
	await withDbRetry(() =>
		Promise.all(ids.map((id, index) => db.update(workItems).set({ sort_order: index }).where(eq(workItems.id, id)))),
	);
	revalidateContent("/admin/works");
	revalidateContent("/works");
}
