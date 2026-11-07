import { Suspense } from "react";
import { getAllWorkItems, getWorkCategories } from "@/lib/content";
import { getLang, getTranslations } from "@/lib/lang";
import { WorksFilter } from "./works-filter";

export default async function WorksPage() {
	const lang = await getLang();
	const [dbWorks, categories, t] = await Promise.all([
		getAllWorkItems(lang),
		getWorkCategories(lang),
		getTranslations(lang),
	]);

	const works = dbWorks.map((dbWork) => ({
		slug: dbWork.slug,
		title: dbWork.title,
		category: dbWork.category,
		categories: dbWork.categories,
		featured: dbWork.featured,
		description: dbWork.description,
		tags: dbWork.tags,
		images: dbWork.dbImages.map((src, i) => ({ src, alt: `${dbWork.title}, ${t.ui_photo} ${i + 1}` })),
	}));

	return (
		<main
			className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-5"
			aria-label={t.aria_works_page}
		>
			<Suspense>
				<WorksFilter works={works} categories={categories} />
			</Suspense>
		</main>
	);
}
