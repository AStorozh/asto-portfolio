import Link from "next/link";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { getAllAboutBlockTexts, getAboutSections } from "@/lib/content";
import { aboutBlocks } from "@/app/about/about-blocks";

const EDITABLE_SLUGS = ["kto-ya", "chem-polezen", "opyt", "interesy", "navyki", "galereya"];

const cardClass =
	"group relative flex h-32 flex-col overflow-hidden rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_0_rgba(0,0,0,0.06),0_14px_36px_rgba(0,0,0,0.1)] active:translate-y-0";

export default async function AdminAboutPage() {
	const [texts, sections] = await Promise.all([
		getAllAboutBlockTexts(),
		getAboutSections(),
	]);

	const sectionTitles = Object.fromEntries(sections.map((s) => [s.slug, s.title]));

	const editableBlocks = aboutBlocks.filter((b) => EDITABLE_SLUGS.includes(b.slug));

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5">
				<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">Обо мне</p>
				<p className="mt-1 text-xs text-muted-foreground">Выберите раздел для редактирования</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="grid grid-cols-2 gap-3">
					{editableBlocks.map((block) => {
						const title = sectionTitles[block.slug] ?? block.title;
						const content = texts[block.slug] ?? "";
						return (
							<Link
								key={block.slug}
								href={`/admin/about/${block.slug}`}
								className={cardClass}
							>
								<div className="flex items-start justify-between">
									<span className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted-foreground/50">
										#{block.num}
									</span>
									<span className="font-mono text-[9px] font-semibold tracking-widest text-muted-foreground/40">
										/about/{block.slug}
									</span>
								</div>
								<div className="mt-auto flex items-end justify-between gap-2">
									<div className="min-w-0">
										<p className="text-[15px] font-extrabold leading-tight tracking-tight text-foreground">
											{title}
										</p>
										{content ? (
											<p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
												{content.slice(0, 48)}{content.length > 48 ? "…" : ""}
											</p>
										) : (
											<p className="mt-0.5 text-[11px] text-muted-foreground/40">пусто</p>
										)}
									</div>
									<span className="mb-0.5 shrink-0 text-[13px] text-foreground/25 transition-transform group-hover:translate-x-0.5">
										<ArrowUpRight />
									</span>
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
}
