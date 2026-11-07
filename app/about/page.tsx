import { getAboutSectionsRaw, getAllQuotes, getAllSiteImages, getPageHeroForLang } from "@/lib/content";
import { ArrowUpRight } from "../arrow-up-right";
import { getLang, getTranslations, withLang } from "@/lib/lang";

import { mediaUrl, mediaBlur, mediaVideoPreview, mediaPoster, isVideoUrl } from "@/lib/media-url";
import Link from "next/link";
import { RotatingQuote } from "../rotating-quote";
import { BgVideo } from "../bg-video";
import { MediaGate } from "../media-gate";
import { aboutBlocks } from "./about-blocks";
import { FitTitles } from "../fit-titles";

const focusRing =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default async function AboutPage() {
	const lang = await getLang();
	const [hero, sections, allQuotes, siteImgs] = await Promise.all([
		getPageHeroForLang("about", lang),
		getAboutSectionsRaw(),
		getAllQuotes(lang),
		getAllSiteImages(),
	]);
	const whoYaBgRaw       = siteImgs["about_who_bg"]         ?? "";
	const personalityBgRaw = siteImgs["about_personality_bg"] ?? "";
	const whoYaBg       = isVideoUrl(whoYaBgRaw)       ? mediaVideoPreview(whoYaBgRaw)       : mediaUrl(whoYaBgRaw,       { w: 1100 });
	const personalityBg = isVideoUrl(personalityBgRaw) ? mediaVideoPreview(personalityBgRaw) : mediaUrl(personalityBgRaw, { w: 1100 });
	const whoYaBgBlur       = isVideoUrl(whoYaBgRaw)       ? mediaPoster(whoYaBgRaw)       : mediaBlur(whoYaBgRaw);
	const personalityBgBlur = isVideoUrl(personalityBgRaw) ? mediaPoster(personalityBgRaw) : mediaBlur(personalityBgRaw);
	const t = await getTranslations(lang);
	const blockTitleFallbacks: Record<string, string> = {
		"kto-ya": t.about_kto_ya,
		"chem-polezen": t.about_chem_polezen,
		"opyt": t.about_opyt,
		"obrazovanie": t.about_obrazovanie,
		"interesy": t.about_interesy,
		"seychas": t.about_seychas,
		"navyki": t.about_navyki,
		"galereya": t.about_galereya,
		"hobi": t.about_hobi,
	};
	const sectionTitles = withLang(
		Object.fromEntries(sections.map((s) => [s.slug, s.title])),
		lang,
	);
	const sectionUrlSlugs = Object.fromEntries(
		sections
			.filter((s) => !/__(en|de)$/.test(s.slug))
			.map((s) => [s.slug, s.url_slug ?? s.slug]),
	);
	const fallbackQuote = lang === "en"
		? { text: "The best way to predict the future is to create it.", author: "Alan Kay" }
		: lang === "de"
			? { text: "Der beste Weg, die Zukunft vorherzusagen, ist, sie zu gestalten.", author: "Alan Kay" }
			: { text: "Лучший способ предсказать будущее — создать его.", author: "Alan Kay" };
	const fallbackQuotes = [fallbackQuote];
	const quotes = allQuotes.length > 0 ? allQuotes : fallbackQuotes;
	return (
		<main className="min-h-[calc(100dvh-4rem)] overflow-x-hidden bg-background px-4 pb-0 pt-4 sm:px-5 sm:pt-5 lg:h-[calc(100dvh-4rem)] lg:min-h-[660px]">
			<MediaGate />
			<FitTitles selector="[data-about-title]" watch={lang} />
			<section className="flex min-h-full flex-col gap-4 overflow-visible sm:gap-5 lg:h-full lg:min-h-0">
				<div
					data-block="обо мне заголовок"
					className="h-[17.7dvh] min-h-[6rem] shrink-0 rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]"
				>
					<div className="flex h-full flex-col p-5">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
								{hero?.label ?? t.about_page_label}
							</span>
						</div>
						<div className="mt-auto flex items-baseline justify-between gap-4">
							<h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
								{hero?.title ?? t.about_back}
							</h1>
							<span className="text-right text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
								{hero?.subtitle ?? "ПРОФИЛЬ"}
							</span>
						</div>
					</div>
				</div>

				<div
					data-block="обо мне сетка (3 ряда)"
					className="grid min-h-0 grid-flow-dense auto-rows-[minmax(10rem,auto)] grid-cols-1 gap-4 overflow-visible bg-background sm:gap-5 md:grid-cols-2 lg:flex-1 lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-5 lg:grid-rows-[repeat(3,minmax(0,1fr))]"
				>
					{aboutBlocks.map((block) => {
						const { title, slug, num } = block;
						const isKtoYa = slug === "kto-ya";
						// The "Gallery" block leads to a separate grid page, not to the block page.
						const isPersonalGallery = slug === "galereya";
						const isSeichas = slug === "seychas";
						const isAiAssistant = slug === "hobi";
						const isDarkGray = slug === "navyki";
						const isLight = slug === "interesy" || slug === "opyt";
						const colSpan =
							slug === "chem-polezen" || slug === "seychas" || slug === "navyki"
								? "md:col-span-2 lg:col-span-2"
								: "";
						const rowSpan =
							slug === "galereya"
								? "md:row-span-2 lg:row-span-3"
								: slug === "kto-ya" || slug === "interesy"
									? "md:row-span-2 lg:row-span-2"
									: "";

						const style = isDarkGray ? { backgroundColor: "oklch(0.32 0 0)" } : undefined;
						const baseShared =
							"group relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl transition-all hover:-translate-y-0.5 active:translate-y-0";
						const ktoOrDefaultShadow = (isKtoYa || isPersonalGallery)
							? "shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)]"
							: isAiAssistant
								? "shadow-[0_1px_0_rgba(255,255,255,0.12),0_18px_55px_rgba(217,160,78,0.25)]"
							: isLight
								// the same shadow from the borders outward + the same inward (inset), so the background inside doesn't look lighter
								? "shadow-[0_18px_55px_rgba(0,0,0,0.22),inset_0_0_55px_rgba(0,0,0,0.22)]"
							: "shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.22)]";
						const skin = (isKtoYa || isPersonalGallery)
							? "border border-border/70 bg-black/25 text-white"
							: isAiAssistant
								? "ai-surface border border-yellow-100/30 text-white"
							: isDarkGray
								? "border border-white/20 text-white"
								: isLight
									? "border-2 border-foreground bg-background text-foreground"
									: "border border-border/70 bg-foreground text-white";

						if (isSeichas) {
							return (
								<div
									key={slug}
									data-block={`обо мне блок #${num}`}
									className={`flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-transparent ${colSpan} ${rowSpan}`}
								>
									<div className="flex h-full min-h-0 w-full items-center justify-center p-5 sm:p-6">
										<RotatingQuote
											key={lang}
											quotes={quotes}
											className="max-w-2xl text-center text-balance text-base font-medium leading-relaxed tracking-tight text-foreground sm:text-lg"
										/>
									</div>
								</div>
							);
						}

						return (
							<Link
								key={slug}
								href={isAiAssistant ? "/ai-assistant" : isPersonalGallery ? "/about/personal" : `/about/${sectionUrlSlugs[slug] ?? slug}`}
								data-block={`обо мне блок #${num}`}
								style={style}
								aria-label={`${t.ui_go_to_aria}: ${sectionTitles[slug] ?? blockTitleFallbacks[slug] ?? title}`}
								className={`${baseShared} ${ktoOrDefaultShadow} ${skin} ${colSpan} ${rowSpan} ${focusRing}`}
							>
								{(isKtoYa || isPersonalGallery) && (
									<>
										{(() => {
											const bgSrc = isPersonalGallery ? personalityBg : whoYaBg;
											const bgBlur = isPersonalGallery ? personalityBgBlur : whoYaBgBlur;
											return isVideoUrl(bgSrc) ? (
												<BgVideo src={bgSrc} poster={bgBlur} className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-100 blur-[6px] saturate-150" />
											) : bgSrc ? (
												<>
													<div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-bottom blur-[6px]" style={{ backgroundImage: `url(${bgBlur})` }} />
													<img alt="" aria-hidden="true" src={bgSrc} decoding="async" className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-100 contrast-110 saturate-150 object-bottom blur-[6px]" />
												</>
											) : null;
										})()}
										{/* Blur - by a filter on the background itself, not backdrop-filter: that one repainted the blur over the video on every frame and produced stripes in Chrome */}
										<div className="pointer-events-none absolute inset-0 rounded-3xl border-t border-white/15 bg-black/45" />
									</>
								)}
								<div className="relative z-10 flex h-full min-h-0 flex-col p-5 sm:p-6">
									<div className="flex items-center justify-between gap-3">
										<span
											className={
												isKtoYa
													? "text-[11px] font-semibold tracking-[0.18em] text-white/65"
													: isAiAssistant
														? "text-[11px] font-semibold tracking-[0.18em] text-white/75"
													: isDarkGray
														? "text-[11px] font-semibold tracking-[0.18em] text-white/55"
														: isLight
															? "text-[11px] font-semibold tracking-[0.18em] text-muted-foreground"
															: "text-[11px] font-semibold tracking-[0.18em] text-white/60"
											}
										>
											{t.about_block_prefix} #{num}
										</span>
										<span
											aria-hidden
											className={
												isLight
													? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.06] text-foreground transition-transform group-hover:translate-x-0.5"
													: isAiAssistant
														? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-transform group-hover:translate-x-0.5"
													: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-transform group-hover:translate-x-0.5"
											}
										>
											<span className="text-lg leading-none"><ArrowUpRight /></span>
										</span>
									</div>
									<h2 data-about-title className="mt-auto text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
										{sectionTitles[slug] ?? blockTitleFallbacks[slug] ?? title}
									</h2>
								</div>
							</Link>
						);
					})}
				</div>

				<div
					data-block="обо мне нижний бар #9"
					className="h-16 shrink-0 rounded-t-3xl bg-foreground shadow-[0_1px_0_rgba(255,255,255,0.06)]"
				/>
			</section>
		</main>
	);
}
