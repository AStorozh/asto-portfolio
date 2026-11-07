import { db, withDbRetry } from "@/lib/db";
import { workCategories, workImages, workItemCategories, workItems, workLinks, workResults, workTags } from "@/lib/schema";
import { asc } from "drizzle-orm";
import {  WorkCreateForm } from "./work-form";
import { CategoryManager } from "./category-manager";
import { WorksReorderList } from "./works-reorder-list";

export default async function AdminWorksPage() {
	const [works, categories, tags, images, results, catMap, links] = await withDbRetry(() => Promise.all([
		db.select().from(workItems).orderBy(asc(workItems.sort_order)),
		db.select().from(workCategories).orderBy(asc(workCategories.sort_order)),
		db.select().from(workTags),
		db.select().from(workImages),
		db.select().from(workResults),
		db.select().from(workItemCategories),
		db.select().from(workLinks),
	]));

	const worksWithData = works.map((w) => {
		const wTags = tags.filter((t) => t.work_id === w.id).sort((a, b) => a.sort_order - b.sort_order);
		const wResults = results.filter((r) => r.work_id === w.id).sort((a, b) => a.sort_order - b.sort_order);
		const categoryIds = catMap.filter((m) => m.work_id === w.id).map((m) => m.category_id);
		return {
			id: w.id,
			slug: w.slug,
			title: w.title,
			title_en: w.title_en ?? "",
			title_de: w.title_de ?? "",
			category: w.category,
			categoryIds,
			featured: w.featured,
			description: w.description,
			description_en: w.description_en ?? "",
			description_de: w.description_de ?? "",
			overview: w.overview,
			overview_en: w.overview_en ?? "",
			overview_de: w.overview_de ?? "",
			tools: wTags.map((t) => t.tag),
			tools_en: wTags.map((t) => t.tag_en ?? ""),
			tools_de: wTags.map((t) => t.tag_de ?? ""),
			images: images
				.filter((i) => i.work_id === w.id)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map((i) => ({ url: i.url, storageKey: i.storage_key })),
			results: wResults.map((r) => r.text),
			results_en: wResults.map((r) => r.text_en ?? ""),
			results_de: wResults.map((r) => r.text_de ?? ""),
			links: links
				.filter((l) => l.work_id === w.id)
				.sort((a, b) => a.sort_order - b.sort_order)
				.map((l) => ({ url: l.url, label: l.label })),
		};
	});

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
				<h1 className="text-base font-bold">Управление работами</h1>
				<p className="mt-0.5 text-[12px] text-muted-foreground">
					{works.length} {works.length === 1 ? "работа" : works.length < 5 ? "работы" : "работ"} · {categories.length} категорий
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-4">

					<CategoryManager categories={categories} />

					<WorkCreateForm categories={categories} />

					{worksWithData.length > 0 && (
						<div className="flex flex-col gap-3">
							<p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Существующие работы · перетащите за ручку ⠿ для изменения порядка
							</p>
							<WorksReorderList works={worksWithData} categories={categories} />
						</div>
					)}

				</div>
			</div>
		</div>
	);
}
