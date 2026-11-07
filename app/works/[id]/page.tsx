import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkBySlug, getWorksTexts } from "@/lib/content";
import { getLang, getTranslations, withLang } from "@/lib/lang";

import { WorkDetailSection } from "./work-detail-section";

type WorkPageProps = {
	params: Promise<{ id: string }>;
};

export default async function WorkPage({ params }: WorkPageProps) {
	const { id } = await params;
	const lang = await getLang();
	const [dbWork, rawWorksTexts, t] = await Promise.all([
		getWorkBySlug(id, lang),
		getWorksTexts(),
		getTranslations(lang),
	]);
	const worksTexts = withLang(rawWorksTexts, lang);

	if (!dbWork) notFound();

	const title       = dbWork.title;
	const description = dbWork.description;
	const overview    = dbWork.overview ?? "";
	const categories  = dbWork.categories?.length ? dbWork.categories : (dbWork.category ? [dbWork.category] : []);
	const tools       = dbWork.tags;
	const result      = dbWork.result;
	const links       = dbWork.links ?? [];

	const galleryImages = dbWork.dbImages.map((src, i) => ({ src, alt: `${title}, ${t.ui_photo} ${i + 1}` }));

	return (
		<main className="min-h-[calc(100dvh-4rem)] px-5 py-5" aria-label={title}>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">

				{/* Back + category */}
				<div className="flex items-center gap-2">
					<Link
						href="/works"
						className="inline-flex w-max items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-foreground shadow-sm transition-[transform,background-color] hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
					>
						<span aria-hidden>‹</span>
						<span>{t.work_back}</span>
					</Link>
					{categories.length > 0 && (
						<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
							{categories.map((c) => (
								<Link
									key={c}
									href={`/works?category=${encodeURIComponent(c)}`}
									className="inline-flex w-max items-center rounded-full border-2 border-foreground bg-background px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-foreground shadow-sm transition-colors hover:bg-muted/40"
								>
									{c}
								</Link>
							))}
						</div>
					)}
				</div>

				<WorkDetailSection
					id={id}
					title={title}
					description={description}
					overview={overview}
					tools={tools}
					result={result}
					links={links}
					galleryImages={galleryImages}
					aiLabel={worksTexts["ai_block_label"] ?? t.work_ai_label}
					aiText={worksTexts["ai_block_text"] ?? t.work_ai_text}
				/>

			</div>
		</main>
	);
}
