import { eq, sql } from "drizzle-orm";
import { db, withDbRetry } from "@/lib/db";
import { analyticsLinks } from "@/lib/schema";
import { auditReady, record, type Step } from "./audit-core";
import { ApiError, bad, flag, onlyKnown, text } from "./http";
import { audit, publish } from "./publish";

// Link labels: a short address /<code> that leads to a site page and records that someone came through it
// (?ref=<code>). For job applications: each vacancy gets its own link, so you can see who opened what.

type Fields = Record<string, unknown>;

// Addresses already taken by real site pages: a short link with such a code won't open
// (section pages take priority over /[slug]).
const RESERVED = new Set([
	"about", "actions", "admin", "ai-assistant", "api", "contacts", "privacy", "products", "resume-file", "uploads", "works",
	"_next", "favicon.ico", "robots.txt", "sitemap.xml", "icon", "apple-icon", "opengraph-image",
]);

const slugify = (input: string) =>
	input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32).replace(/-+$/, ""); // the code in the DB is up to 32 characters (on a collision a "-xxxx" suffix is added, see freeCode)

/** Destination page: a path inside the site. Addresses like //other.site and ones with a protocol are rejected (otherwise the link would become an open redirect). */
function target(value: unknown): string {
	const raw = text(value, "target", { max: 300 }).trim() || "/";
	const path = raw.startsWith("/") ? raw : `/${raw}`;
	if (path.startsWith("//") || path.includes("\\") || /^\/+[a-z][a-z0-9+.-]*:/i.test(path) || /[\s<>"']/.test(path)) {
		bad("Поле «target» должно быть путём внутри сайта, например /resume-file или /works/site-a");
	}
	return path;
}

function audience(value: unknown): string | null {
	if (value === null) return null;
	const v = text(value, "audience", { max: 24, allowEmpty: true }).trim();
	if (v && !/^[\p{L}\p{N}_\- ]+$/u.test(v)) bad("Поле «audience» — короткая метка из букв, цифр, пробела и дефиса (например recruiter)");
	return v || null;
}

function siteUrl(code: string): string | null {
	const base = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
	return base ? `${base}/${code}` : null;
}

const withUrl = <T extends { code: string }>(row: T) => ({ ...row, url: siteUrl(row.code) });

export async function listLinks() {
	const rows = (await withDbRetry(() =>
		db.execute(sql`
			select id, code, label, audience, tracking, target, created_at,
				(select count(distinct e.visitor_id) from future_face.analytics_events e where e.link_code = analytics_links.code) as visitors
			from future_face.analytics_links order by created_at
		`),
	)) as unknown as { id: number; code: string; label: string; audience: string | null; tracking: boolean; target: string; created_at: string; visitors: string | number }[];
	return rows.map((r) => withUrl({ ...r, visitors: Number(r.visitors) }));
}

async function find(code: string) {
	const [row] = await db.select().from(analyticsLinks).where(eq(analyticsLinks.code, code));
	if (!row) throw new ApiError(404, "not_found", `Ссылки «${code}» нет`);
	return row;
}

async function freeCode(wanted: string, exceptId?: number): Promise<string> {
	const taken = (await db.select({ id: analyticsLinks.id, code: analyticsLinks.code }).from(analyticsLinks)).filter((r) => r.id !== exceptId);
	let code = wanted;
	if (taken.some((r) => r.code === code)) code = `${code.slice(0, 27)}-${Date.now().toString(36).slice(-4)}`;
	return code;
}

function checkCode(code: string): void {
	if (!code) bad("Не удалось собрать код ссылки: укажи «code» или «label» латиницей");
	if (RESERVED.has(code)) bad(`Код «${code}» занят страницей сайта: ссылка с ним не откроется. Выбери другой`);
}

export async function createLink(body: Fields, dryRun: boolean) {
	onlyKnown(body, ["label", "audience", "code", "target", "dry_run"]);
	const label = "label" in body ? text(body.label, "label", { max: 200, allowEmpty: true }).trim() : "";
	const wanted = slugify("code" in body ? text(body.code, "code", { max: 40 }) : label) || `link-${Date.now().toString(36)}`;
	checkCode(wanted);
	const values = { label, audience: "audience" in body ? audience(body.audience) : null, target: "target" in body ? target(body.target) : "/" };
	const code = await freeCode(wanted);
	if (dryRun) return { dry_run: true, applied: false, audit_id: null, code, ...values, url: siteUrl(code) };
	await auditReady();
	const auditId = await db.transaction(async (tx) => {
		await tx.insert(analyticsLinks).values({ code, ...values });
		const undo: Step[] = [{ t: "row_delete", table: "analytics_links", key: code, expect: values }];
		return record(tx, { action: "link.create", target: `links/${code}`, summary: `Новая ссылка «${code}»${values.label ? ` («${values.label}»)` : ""} → ${values.target}`, changes: { code, ...values }, undo });
	});
	publish(["/admin/analytics"]);
	audit("link_create", { id: auditId, code });
	return { dry_run: false, applied: true, audit_id: auditId, code, ...values, url: siteUrl(code) };
}

export async function patchLink(code: string, body: Fields, dryRun: boolean) {
	onlyKnown(body, ["label", "audience", "code", "target", "tracking", "dry_run"]);
	const before = await find(code);
	const set: Fields = {};
	if ("label" in body) set.label = text(body.label, "label", { max: 200, allowEmpty: true }).trim();
	if ("audience" in body) set.audience = audience(body.audience);
	if ("target" in body) set.target = target(body.target);
	if ("tracking" in body) set.tracking = flag(body.tracking, "tracking");
	if ("code" in body) {
		const next = slugify(text(body.code, "code", { max: 40 }));
		checkCode(next);
		// when the code changes, earlier events stay on the old code (as in the admin), and the old short link stops working
		if (next !== before.code) set.code = await freeCode(next, before.id);
	}
	const changes = Object.keys(set)
		.filter((f) => JSON.stringify((before as Record<string, unknown>)[f] ?? null) !== JSON.stringify(set[f] ?? null))
		.map((f) => ({ field: f, old: (before as Record<string, unknown>)[f] ?? null, new: set[f] ?? null }));
	let auditId: number | null = null;
	if (!dryRun && changes.length) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.update(analyticsLinks).set(set).where(eq(analyticsLinks.id, before.id));
			const old = Object.fromEntries(Object.keys(set).map((k) => [k, (before as Record<string, unknown>)[k] ?? null]));
			// the step key is the code the link has now (after the edit), so when the code changes it is the new code
			const undo: Step[] = [{ t: "row", table: "analytics_links", key: String(set.code ?? code), set: old, expect: set }];
			return record(tx, { action: "link.patch", target: `links/${code}`, summary: `Ссылка «${code}»: ${changes.map((c) => c.field).join(", ")}`, changes, undo });
		});
		publish(["/admin/analytics"]);
		audit("link_update", { id: auditId, code, fields: changes.map((c) => c.field) });
	}
	return { code: (set.code as string | undefined) ?? code, dry_run: dryRun, applied: !dryRun && changes.length > 0, audit_id: auditId, changes };
}

export async function deleteLink(code: string, dryRun: boolean) {
	const before = await find(code);
	let auditId: number | null = null;
	if (!dryRun) {
		await auditReady();
		auditId = await db.transaction(async (tx) => {
			await tx.delete(analyticsLinks).where(eq(analyticsLinks.id, before.id));
			const undo: Step[] = [{ t: "row_insert", table: "analytics_links", row: before as unknown as Record<string, unknown> }];
			return record(tx, { action: "link.delete", target: `links/${code}`, summary: `Удалена ссылка «${code}»`, changes: { deleted: before }, undo });
		});
		publish(["/admin/analytics"]);
		audit("link_delete", { id: auditId, code });
	}
	// link events stay in analytics; a deleted link is restored by rolling back the journal entry
	return { dry_run: dryRun, applied: !dryRun, audit_id: auditId, deleted: withUrl(before) };
}
