import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllAboutBlockTexts, getAboutSections } from "@/lib/content";
import { getAboutBlockBySlug } from "@/app/about/about-blocks";
import { AboutBlockTextForm } from "../about-block-form";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminAboutBlockPage({ params }: Props) {
	const { slug } = await params;
	const block = getAboutBlockBySlug(slug);
	if (!block) notFound();

	const [sections, texts] = await Promise.all([
		getAboutSections(),
		getAllAboutBlockTexts(),
	]);

	// Take the "raw" RU and EN (without replacing EN with RU), so the editor shows
	// the real content of each language.
	const content = texts[slug] ?? "";
	const contentEn = texts[`${slug}__en`] ?? "";
	const contentDe = texts[`${slug}__de`] ?? "";

	const dbSection = sections.find((s) => s.slug === slug);
	const title = dbSection?.title ?? block.title;

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
				<Link
					href="/admin/about"
					className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
				>
					<span aria-hidden>‹</span> ОБО МНЕ
				</Link>
				<h1 className="mt-2 text-base font-bold">{title}</h1>
				<p className="mt-0.5 font-mono text-[11px] text-muted-foreground">/about/{slug}</p>
			</div>

			<div className="flex min-h-0 flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
				<AboutBlockTextForm slug={slug} title={title} content={content} contentEn={contentEn} contentDe={contentDe} />
			</div>
		</div>
	);
}
