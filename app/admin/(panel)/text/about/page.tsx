import { saveAboutSections, savePageHero } from "@/app/actions/text-actions";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { aboutBlocks } from "@/app/about/about-blocks";
import { db } from "@/lib/db";
import { aboutSections, pageHeroes } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

const NUMBERED = [...aboutBlocks]
	.filter((b) => b.num > 0)
	.sort((a, b) => a.num - b.num);

export default async function AdminTextAboutPage() {
	const [hero, sections, heroEnRows, heroDeRows] = await Promise.all([
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "about")),
		db.select().from(aboutSections).orderBy(asc(aboutSections.sort_order)),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "about__en")),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "about__de")),
	]);

	const saveHero = savePageHero.bind(null, "about");
	const h = hero[0];
	const hEn = heroEnRows[0];
	const hDe = heroDeRows[0];

	const sectionsBySlug = Object.fromEntries(
		sections.filter((s) => !/__(en|de)$/.test(s.slug)).map((s) => [s.slug, s]),
	);
	const enSectionsBySlug = Object.fromEntries(
		sections.filter((s) => s.slug.endsWith("__en")).map((s) => [s.slug.replace("__en", ""), s]),
	);
	const deSectionsBySlug = Object.fromEntries(
		sections.filter((s) => s.slug.endsWith("__de")).map((s) => [s.slug.replace("__de", ""), s]),
	);

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Обо мне" description="Шапка и блоки #1–#9" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">

					{/* ── Page header ── */}
					{h && (
						<div className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
							<div className="flex items-center gap-3">
								<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">H</span>
								<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">/about</span>
							</div>
							<KVForm
								fields={[
									{ key: "label",    label: "Лейбл (мелкий текст сверху)", value: h.label,          enValue: hEn?.label ?? "",    deValue: hDe?.label ?? "" },
									{ key: "title",    label: "Заголовок",                    value: h.title,          enValue: hEn?.title ?? "",    deValue: hDe?.title ?? "" },
									{ key: "subtitle", label: "Подзаголовок (справа)",         value: h.subtitle ?? "", enValue: hEn?.subtitle ?? "", deValue: hDe?.subtitle ?? "" },
								]}
								action={saveHero}
							/>
						</div>
					)}

					{/* ── Blocks #1–#8 ── */}
					{NUMBERED.map((block) => {
						const section = sectionsBySlug[block.slug];
						const enSection = enSectionsBySlug[block.slug];
						const deSection = deSectionsBySlug[block.slug];

						return (
							<div key={block.slug} className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
								<div className="flex items-center gap-3">
									<span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${block.slug === "hobi" ? "bg-amber-500 text-white" : "bg-foreground text-background"}`}>
										{block.num}
									</span>
									{section && (
										<Link
											href={`/about/${section.url_slug ?? section.slug}`}
											target="_blank"
											className="ml-auto font-mono text-[9px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
										>
											/about/{section.url_slug ?? section.slug} <ArrowUpRight className="inline-block size-[1em] align-[-0.15em]" />
										</Link>
									)}
								</div>

								{section ? (
									<>
										<KVForm
											fields={[{
												key: `section_${section.id}_title`,
												label: "Название блока",
												value: section.title,
												enValue: enSection?.title ?? "",
												deValue: deSection?.title ?? "",
											}]}
											action={saveAboutSections}
										/>
										<div className="flex flex-col gap-1.5">
											<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
												URL путь
											</span>
											<form action={saveAboutSections} className="flex items-center gap-2">
												<span className="shrink-0 font-mono text-[11px] text-muted-foreground/50">/about/</span>
												<input
													name={`section_${section.id}_url_slug`}
													type="text"
													defaultValue={section.url_slug ?? section.slug}
													placeholder={section.slug}
													className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-[12px] text-foreground outline-none focus:border-foreground"
												/>
												<button
													type="submit"
													className="shrink-0 rounded-xl bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-80"
												>
													Сохранить
												</button>
											</form>
											<p className="text-[10px] text-muted-foreground/50">
												Только латиница и дефисы. Текущий: <span className="font-mono">{section.url_slug ?? section.slug}</span>
											</p>
										</div>
									</>
								) : (
									<p className="rounded-xl border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground/50">
										Блок не найден в БД — slug: {block.slug}
									</p>
								)}
							</div>
						);
					})}

					{/* ── Quote (no number) ── */}
					<div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/50 p-4">
						<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">❝</span>
						<span className="text-xs text-muted-foreground/60">Цитата — управляется в разделе «Цитаты»</span>
						<Link href="/admin/text/quotes" className="ml-auto text-[11px] font-semibold text-foreground/50 transition-colors hover:text-foreground">
							→ Цитаты
						</Link>
					</div>

					{/* ── Block #9: Bottom bar ── */}
					<div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/50 p-4">
						<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">9</span>
						<span className="text-xs text-muted-foreground/60">Нижний бар — декоративная полоса, текста нет</span>
					</div>


				</div>
			</div>
		</div>
	);
}
