"use server";
import { requireAdmin } from "@/lib/admin-auth";

import { db } from "@/lib/db";
import { analyticsLinks, analyticsEvents, analyticsLinkGroups } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { revalidateContent } from "@/lib/revalidate";
import { exportAnalyticsToSheet } from "@/lib/analytics-export";
import { toLocalPath } from "@/lib/safe-path";

// Slug for a nice URL: only Latin letters/digits/hyphen.
function slugifyCode(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32); // analytics_links.code is varchar(32)
}

function normalizeTarget(input: string): string {
	return toLocalPath(input);
}

export async function createAnalyticsLink(fd: FormData) {
	await requireAdmin();
	const label = ((fd.get("label") as string) ?? "").trim();
	const audience = ((fd.get("audience") as string) ?? "").trim() || null;
	const rawCode = ((fd.get("code") as string) ?? "").trim();
	const target = normalizeTarget((fd.get("target") as string) ?? "/");

	// Slug: take the entered one, otherwise derive it from the name; guarantee uniqueness.
	let code = slugifyCode(rawCode) || slugifyCode(label) || `link-${Date.now().toString(36)}`;
	const existing = await db.select({ code: analyticsLinks.code }).from(analyticsLinks);
	const taken = new Set(existing.map((r) => r.code));
	if (taken.has(code)) code = `${code}-${Date.now().toString(36).slice(-4)}`;

	const groupId = Number(fd.get("group_id")) || null;
	await db.insert(analyticsLinks).values({ code, label, audience, target, group_id: groupId });
	revalidateContent("/admin/analytics");
}

// Editing a link: name, slug and destination page.
// When the slug changes, earlier events stay on the old code (its stats are kept separately).
export async function updateAnalyticsLink(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	if (!id) return;
	const label = ((fd.get("label") as string) ?? "").trim();
	const target = normalizeTarget((fd.get("target") as string) ?? "/");
	const rawCode = ((fd.get("code") as string) ?? "").trim();
	let code = slugifyCode(rawCode) || `link-${Date.now().toString(36)}`;

	const existing = await db.select({ id: analyticsLinks.id, code: analyticsLinks.code }).from(analyticsLinks);
	if (existing.some((r) => r.code === code && r.id !== id)) {
		code = `${code}-${Date.now().toString(36).slice(-4)}`;
	}

	await db.update(analyticsLinks).set({ label, code, target }).where(eq(analyticsLinks.id, id));
	revalidateContent("/admin/analytics");
}

export async function deleteAnalyticsLink(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	if (!id) return;
	await db.delete(analyticsLinks).where(eq(analyticsLinks.id, id));
	revalidateContent("/admin/analytics");
}

export async function toggleAnalyticsLinkTracking(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	const tracking = fd.get("tracking") === "true";
	if (!id) return;
	await db.update(analyticsLinks).set({ tracking }).where(eq(analyticsLinks.id, id));
	revalidateContent("/admin/analytics");
}

// Full cleanup of events (data management).
export async function clearAnalyticsEvents() {
	await requireAdmin();
	await db.delete(analyticsEvents);
	revalidateContent("/admin/analytics");
}

// Manual refresh of the Google sheet (admin button).
export async function refreshAnalyticsSheet(): Promise<{ ok: boolean; error?: string }> {
	await requireAdmin();
	return exportAnalyticsToSheet();
}

// ── Sections of the links list ────────────────────────────────────────────

export async function createLinkGroup(fd: FormData) {
	await requireAdmin();
	const name = ((fd.get("name") as string) ?? "").trim().slice(0, 80);
	if (!name) return;
	const groups = await db.select({ sort_order: analyticsLinkGroups.sort_order }).from(analyticsLinkGroups);
	const next = groups.reduce((m, g) => Math.max(m, g.sort_order), -1) + 1;
	await db.insert(analyticsLinkGroups).values({ name, sort_order: next });
	revalidateContent("/admin/analytics");
}

export async function renameLinkGroup(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	const name = ((fd.get("name") as string) ?? "").trim().slice(0, 80);
	if (!id || !name) return;
	await db.update(analyticsLinkGroups).set({ name }).where(eq(analyticsLinkGroups.id, id));
	revalidateContent("/admin/analytics");
}

// Deleting a section keeps its links: they move to "No section".
export async function deleteLinkGroup(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	if (!id) return;
	await db.update(analyticsLinks).set({ group_id: null }).where(eq(analyticsLinks.group_id, id));
	await db.delete(analyticsLinkGroups).where(eq(analyticsLinkGroups.id, id));
	revalidateContent("/admin/analytics");
}

// Move a section one place up (-1) or down (+1).
export async function moveLinkGroup(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	const dir = Number(fd.get("dir")) < 0 ? -1 : 1;
	if (!id) return;
	const groups = await db.select().from(analyticsLinkGroups).orderBy(asc(analyticsLinkGroups.sort_order), asc(analyticsLinkGroups.id));
	const i = groups.findIndex((g) => g.id === id);
	const j = i + dir;
	if (i < 0 || j < 0 || j >= groups.length) return;
	[groups[i], groups[j]] = [groups[j], groups[i]];
	await db.transaction(async (tx) => {
		for (const [k, g] of groups.entries()) {
			await tx.update(analyticsLinkGroups).set({ sort_order: k }).where(eq(analyticsLinkGroups.id, g.id));
		}
	});
	revalidateContent("/admin/analytics");
}

// Put a link into a section (empty group_id = "No section").
export async function setLinkGroup(fd: FormData) {
	await requireAdmin();
	const id = Number(fd.get("id"));
	const groupId = Number(fd.get("group_id")) || null;
	if (!id) return;
	await db.update(analyticsLinks).set({ group_id: groupId }).where(eq(analyticsLinks.id, id));
	revalidateContent("/admin/analytics");
}
