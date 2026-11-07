import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { aboutSections } from "@/lib/schema";
import { or, eq } from "drizzle-orm";
import { getAboutBlockText } from "@/lib/content";
import { AboutContent } from "@/lib/about-content";
import { getLang, getTranslations, withLang } from "@/lib/lang";
import { getAboutBlockBySlug } from "../about-blocks";

export const dynamic = "force-dynamic";

type AboutBlockPageProps = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: AboutBlockPageProps): Promise<Metadata> {
	const { slug: urlSlug } = await params;
	const lang = await getLang();
	const t = await getTranslations(lang);

	const [sectionRow] = await db
		.select()
		.from(aboutSections)
		.where(or(eq(aboutSections.url_slug, urlSlug), eq(aboutSections.slug, urlSlug)))
		.limit(1);

	if (!sectionRow) return { title: t.ui_not_found };

	const block = getAboutBlockBySlug(sectionRow.slug);
	const allSections = await db.select().from(aboutSections);
	const sectionTitles = withLang(
		Object.fromEntries(allSections.map((s) => [s.slug, s.title])),
		lang,
	);
	const title = sectionTitles[sectionRow.slug] ?? block?.title ?? sectionRow.title;
	return { title: `${title} — ${t.about_meta_suffix}` };
}

export default async function AboutBlockPage({ params }: AboutBlockPageProps) {
	const { slug: urlSlug } = await params;

	// Look up the section by url_slug or slug (for backward compatibility)
	const [sectionRow] = await db
		.select()
		.from(aboutSections)
		.where(or(eq(aboutSections.url_slug, urlSlug), eq(aboutSections.slug, urlSlug)))
		.limit(1);

	if (!sectionRow) notFound();

	const internalSlug = sectionRow.slug;
	const block = getAboutBlockBySlug(internalSlug);
	if (!block) notFound();

	const lang = await getLang();
	const [allSections, content, t] = await Promise.all([
		db.select().from(aboutSections),
		getAboutBlockText(internalSlug, lang),
		getTranslations(lang),
	]);

	const sectionTitles = withLang(
		Object.fromEntries(allSections.map((s) => [s.slug, s.title])),
		lang,
	);
	const title = sectionTitles[internalSlug] ?? block.title;

	return (
		<main
			className="min-h-[calc(100dvh-4rem)] px-5 py-5"
			aria-label={`${t.about_back}: ${title}`}
			data-page="обо мне — блок"
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
				<Link
					href="/about"
					className="inline-flex w-max items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-foreground shadow-sm transition-[transform,background-color] hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
					aria-label={t.about_aria_back}
				>
					<span aria-hidden>‹</span>
					<span>{t.about_back}</span>
				</Link>

				<section className="rounded-3xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] sm:p-6">
					<p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">{t.about_page_label}</p>
					<h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
				</section>

				{content && (
					<section className="rounded-3xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] sm:p-7">
						<AboutContent text={content} />
					</section>
				)}
			</div>
		</main>
	);
}
