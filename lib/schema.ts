import { boolean, integer, pgSchema, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const ff = pgSchema("future_face");

// ─── Navigation ────────────────────────────────────────────────────────────────

export const siteNavigation = ff.table("site_navigation", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 50 }).notNull().unique(),
	label: text("label").notNull(),
	href: varchar("href", { length: 255 }),
	sort_order: integer("sort_order").notNull().default(0),
});

// ─── Page heroes (PAGE block) ──────────────────────────────────────────────────

export const pageHeroes = ff.table("page_heroes", {
	id: serial("id").primaryKey(),
	page: varchar("page", { length: 50 }).notNull().unique(),
	label: text("label").notNull(),
	title: text("title").notNull(),
	subtitle: text("subtitle"),
});

// ─── Quotes ────────────────────────────────────────────────────────────────────

export const quotes = ff.table("quotes", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	text: text("text").notNull(),
	author: text("author").notNull(),
	pages: text("pages").array().notNull().default([]),
});

// ─── Home ──────────────────────────────────────────────────────────────────────

export const homeTexts = ff.table("home_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

// ─── About ─────────────────────────────────────────────────────────────────────

export const aboutTexts = ff.table("about_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

export const aboutSections = ff.table("about_sections", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	url_slug: varchar("url_slug", { length: 100 }).unique(),
	title: text("title").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
});

// ─── Works ─────────────────────────────────────────────────────────────────────

export const worksTexts = ff.table("works_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

export const workCategories = ff.table("work_categories", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	label: text("label").notNull(),
	label_en: text("label_en"),
	label_de: text("label_de"),
	sort_order: integer("sort_order").notNull().default(0),
});

export const workItems = ff.table("work_items", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 100 }).notNull().unique(),
	title: text("title").notNull(),
	title_en: text("title_en"),
	title_de: text("title_de"),
	category: varchar("category", { length: 100 }).notNull(),
	category_en: text("category_en"),
	category_de: text("category_de"),
	description: text("description").notNull(),
	description_en: text("description_en"),
	description_de: text("description_de"),
	overview: text("overview").notNull(),
	overview_en: text("overview_en"),
	overview_de: text("overview_de"),
	featured: boolean("featured").notNull().default(false), // important work - highlighted on the site
	sort_order: integer("sort_order").notNull().default(0),
});

export const workTags = ff.table("work_tags", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	tag: text("tag").notNull(),
	tag_en: text("tag_en"),
	tag_de: text("tag_de"),
	sort_order: integer("sort_order").notNull().default(0),
});

export const workWhatIDid = ff.table("work_what_i_did", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
});

export const workHowDone = ff.table("work_how_done", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
});

export const workResults = ff.table("work_results", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	text_en: text("text_en"),
	text_de: text("text_de"),
	sort_order: integer("sort_order").notNull().default(0),
});

export const workImages = ff.table("work_images", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	url: text("url").notNull(),
	// Storage file key. The column keeps its historical name from the days of
	// Cloudinary - we'll rename it with the nearest migration.
	storage_key: text("cloudinary_id").notNull().default(""),
	sort_order: integer("sort_order").notNull().default(0),
});

// External links for a work: live site, GitHub repository, etc.
export const workLinks = ff.table("work_links", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	url: text("url").notNull(),
	label: text("label").notNull().default(""),
	sort_order: integer("sort_order").notNull().default(0),
});

// Work ↔ categories link (many-to-many): a work can belong to several sections.
export const workItemCategories = ff.table("work_item_categories", {
	id: serial("id").primaryKey(),
	work_id: integer("work_id")
		.notNull()
		.references(() => workItems.id, { onDelete: "cascade" }),
	category_id: integer("category_id")
		.notNull()
		.references(() => workCategories.id, { onDelete: "cascade" }),
});

// ─── Contacts ──────────────────────────────────────────────────────────────────

export const contactsTexts = ff.table("contacts_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

export const contactMethods = ff.table("contact_methods", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	platform: text("platform").notNull(),
	title: text("title").notNull(),
	title_en: text("title_en"),
	title_de: text("title_de"),
	href: text("href").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
});

// ─── Resume ────────────────────────────────────────────────────────────────────

export const resumeTexts = ff.table("resume_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

// Extra resume blocks (heading + text/list); part: "sidebar" | "main"
export const resumeSections = ff.table("resume_sections", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 60 }).notNull().unique(),
	part: varchar("part", { length: 16 }).notNull().default("sidebar"),
	title: text("title").notNull().default(""),
	title_en: text("title_en"),
	title_de: text("title_de"),
	body: text("body").notNull().default(""),
	body_en: text("body_en"),
	body_de: text("body_de"),
	sort_order: integer("sort_order").notNull().default(0),
});

// ─── AI-assistant ──────────────────────────────────────────────────────────────

export const aiAssistantTexts = ff.table("ai_assistant_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull(),
});

export const aiCapabilities = ff.table("ai_capabilities", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	hint: text("hint").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
});

// Assistant brain settings (system prompt, mode instructions, model, web search)
export const aiSettings = ff.table("ai_settings", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull().unique(),
	value: text("value").notNull().default(""),
});

// ─── About block texts ─────────────────────────────────────────────────────────

export const aboutBlockTexts = ff.table("about_block_texts", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	content: text("content").notNull().default(""),
});

// ─── Lichnost gallery ──────────────────────────────────────────────────────────

export const personalGalleryImages = ff.table("lichnost_images", {
	id: serial("id").primaryKey(),
	gallery_image_id: integer("gallery_image_id")
		.notNull()
		.references(() => galleryImages.id, { onDelete: "cascade" }),
	sort_order: integer("sort_order").notNull().default(0),
});

// ─── Gallery ───────────────────────────────────────────────────────────────────

export const galleryImages = ff.table("gallery_images", {
	id: serial("id").primaryKey(),
	url: text("url").notNull(),
	filename: text("filename").notNull().default(""),
	media_type: varchar("media_type", { length: 10 }).notNull().default("image"),
	// Storage file key. The column keeps its historical name from the days of
	// Cloudinary - we'll rename it with the nearest migration.
	storage_key: text("cloudinary_id").notNull().default(""),
	width: integer("width"),
	height: integer("height"),
	created_at: timestamp("created_at").notNull().defaultNow(),
});

export const siteImages = ff.table("site_images", {
	id: serial("id").primaryKey(),
	slot: varchar("slot", { length: 100 }).notNull().unique(),
	url: text("url"),
});

// ─── UI Texts ──────────────────────────────────────────────────────────────────

export const uiTexts = ff.table("ui_texts", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 150 }).notNull().unique(),
	value: text("value").notNull(),
});

// ─── Admin Notes ───────────────────────────────────────────────────────────────

export const adminNotes = ff.table("admin_notes", {
	id: serial("id").primaryKey(),
	content: text("content").notNull(),
	created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Analytics ──────────────────────────────────────────────────────────────────

// Tracking links (campaigns): a separate link ?ref=<code> for recruiters/friends/yourself.
// Sections for the tracking links list in the admin (e.g. "Sena", "Resume"). Created by a
// targeted CREATE TABLE (db:push is unsafe here), see the analytics admin.
export const analyticsLinkGroups = ff.table("analytics_link_groups", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
	sort_order: integer("sort_order").notNull().default(0),
	created_at: timestamp("created_at").notNull().defaultNow(),
});

export const analyticsLinks = ff.table("analytics_links", {
	id: serial("id").primaryKey(),
	code: varchar("code", { length: 32 }).notNull().unique(),
	label: text("label").notNull().default(""),
	audience: varchar("audience", { length: 24 }),
	excluded: boolean("excluded").notNull().default(false), // (deprecated) exclude from overall totals
	tracking: boolean("tracking").notNull().default(true), // false → events of this link are not recorded
	target: text("target").notNull().default("/"), // page the short link /<code> leads to
	group_id: integer("group_id").references(() => analyticsLinkGroups.id, { onDelete: "set null" }), // section in the admin list
	created_at: timestamp("created_at").notNull().defaultNow(),
});

// Analytics events. Anonymous: visitor_id = daily hash(ip+ua+secret).
export const analyticsEvents = ff.table("analytics_events", {
	id: serial("id").primaryKey(),
	created_at: timestamp("created_at").notNull().defaultNow(),
	type: varchar("type", { length: 32 }).notNull(),
	path: text("path"),
	referrer: text("referrer"),
	link_code: varchar("link_code", { length: 32 }),
	visitor_id: varchar("visitor_id", { length: 64 }),
	session_id: varchar("session_id", { length: 64 }),
	lang: varchar("lang", { length: 8 }),
	device: varchar("device", { length: 16 }),
	country: varchar("country", { length: 8 }),
	meta: text("meta"),
});

// ─── Sena action log ───────────────────────────────────────────────────────────────────────────────
// Every edit made through the private API (lib/sena-api) is written here in the same transaction as the edit itself:
// what changed, before → after, who and from where, and how to roll it back (undo). Reads and dry runs are short rows.
export const senaAudit = ff.table("sena_audit", {
	id: serial("id").primaryKey(),
	created_at: timestamp("created_at").notNull().defaultNow(),
	kind: varchar("kind", { length: 16 }).notNull(), // write | preview | rejected | read
	action: varchar("action", { length: 64 }).notNull(), // texts.put, work.patch, link.create, revert …
	target: text("target").notNull().default(""), // what was edited, in plain words: texts/home, works/site-a
	method: varchar("method", { length: 8 }).notNull().default(""),
	path: text("path").notNull().default(""),
	status: integer("status").notNull().default(200),
	ip: varchar("ip", { length: 64 }),
	summary: text("summary").notNull().default(""),
	changes: text("changes"), // JSON: list of "what → before → after"
	undo: text("undo"), // JSON: undo steps; null - cannot be undone
	reverts_id: integer("reverts_id"), // for a revert entry: which entry was reverted
	reverted_by: integer("reverted_by"), // for a reverted entry: which entry reverted it
	reverted_at: timestamp("reverted_at"),
});
