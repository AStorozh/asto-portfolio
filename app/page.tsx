import { getAllQuotes, getAllSiteImages, getHomeTexts } from "@/lib/content";
import Link from "next/link";
import { ArrowUpRight } from "./arrow-up-right";
import { getLang, withLang } from "@/lib/lang";
import { mediaUrl, mediaBlur, mediaVideoPreview, mediaPoster, mediaVideoThumb, isVideoUrl } from "@/lib/media-url";
import { AnimatedNameTitle } from "./animated-name-title";
import { RotatingQuote } from "./rotating-quote";
import { BgVideo } from "./bg-video";
import { MediaGate } from "./media-gate";
import { WorksFanBlock } from "./works-fan-block";

export default async function HomePage() {
	const lang = await getLang();
	const [rawT, allQuotes, siteImgs] = await Promise.all([
		getHomeTexts(),
		getAllQuotes(lang),
		getAllSiteImages(),
	]);
	const t = withLang(rawT, lang);

	const worksBgRaw = siteImgs["home_works_bg"] ?? "";
	const aboutBgRaw = siteImgs["home_about_bg"] ?? "";
	const aboutIsVideo = isVideoUrl(aboutBgRaw);
	// Video uses the preview copy (720p, no audio): the original weighs megabytes, and under
	// the blur and darkening the difference isn't visible. mediaVideo for local
	// files returned the source as is - hence the heavy home page.
	const aboutBg  = aboutIsVideo ? mediaVideoPreview(aboutBgRaw) : mediaUrl(aboutBgRaw, { w: 1600 });
	const resumeBg = mediaUrl(siteImgs["home_resume_bg"] ?? "", { w: 600 });
	const logoMark = mediaUrl(siteImgs["logo"] ?? "", { w: 400 });
	// Placeholder: for video - a poster from the first frame, for an image - a blurred mini version.
	const aboutBgBlur = aboutIsVideo ? mediaPoster(aboutBgRaw) : mediaBlur(aboutBgRaw);
	// Sharp poster of the "About me" block - instantly shows a crisp frame while the video loads.
	const aboutBgPoster = aboutIsVideo ? mediaVideoThumb(aboutBgRaw) : "";

	const fallbackQuotes = [
		lang === "en"
			? { text: "The best way to predict the future is to create it.", author: "Alan Kay" }
			: lang === "de"
				? { text: "Der beste Weg, die Zukunft vorherzusagen, ist, sie zu gestalten.", author: "Alan Kay" }
				: { text: "Лучший способ предсказать будущее — создать его.", author: "Alan Kay" },
	];
	const quotes = allQuotes.length > 0 ? allQuotes : fallbackQuotes;

	const parseBadges = (key: string, fallback: string[]) => {
		if (!(key in t)) return fallback;
		return t[key].split("\n").map((b: string) => b.trim()).filter(Boolean);
	};
	const resumeBadges = parseBadges("resume_badges", [t.resume_badge    ?? "CV · PDF"]);
	const aboutBadges  = parseBadges("about_badges",  [t.contacts_title  ?? "КОНТАКТЫ", t.stack_title ?? "СТЕК"]);

	return (
		<div className="bg-background overflow-x-hidden">
			<MediaGate />
			<main className="relative flex min-h-[calc(100dvh-4rem)] flex-col gap-4 overflow-x-hidden px-4 py-4 sm:gap-5 sm:px-5 sm:py-5 lg:h-[calc(100dvh-4rem)] lg:min-h-[660px]">

				{/* ── Name ── */}
				<section
					data-block="блок с именем"
					className="flex h-[17.7dvh] min-h-[7rem] shrink-0 flex-col overflow-hidden rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]"
				>
					<div className="flex h-full min-h-0 w-full items-center p-4 sm:p-5">
						<AnimatedNameTitle words={
							t["home_name"]
								? t["home_name"].split("\n").map((w: string) => w.trim()).filter(Boolean)
								: lang === "ru" ? ["Сторожевских", "Артемий"] : ["Artemiy", "Storozhevskikh"]
						} />
					</div>
				</section>

				{/* ── Main grid ── */}
				<section className="grid min-h-0 gap-4 sm:gap-5
					grid-cols-2 auto-rows-[minmax(11rem,auto)]
					lg:flex-1 lg:auto-rows-[auto] lg:grid-cols-12 lg:grid-rows-[1fr_auto]">

					{/* Works: block with a fan of project cards. z-10 so the cards lie over the neighboring resume block */}
					<WorksFanBlock t={t} lang={lang} worksBgRaw={worksBgRaw} logoUrl={logoMark} className="z-10 col-span-1 h-44 min-h-0 sm:h-56 lg:col-span-3 lg:row-start-1 lg:h-auto" />

					{/* Resume */}
					<Link
						data-block="блок резюме"
						href="/resume-file"
						className="group relative col-span-1 h-44 min-h-0 overflow-hidden rounded-3xl border border-border/70 bg-foreground text-background shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 active:translate-y-0 sm:h-56 lg:h-auto lg:col-span-3 lg:row-start-1"
					>
						{resumeBg ? (
							<img
								alt=""
								aria-hidden="true"
								src={resumeBg}
								fetchPriority="high"
								decoding="async"
								className="pointer-events-none absolute bottom-0 right-4 h-1/2 w-auto max-w-[55%] select-none object-contain opacity-40 sm:h-3/5"
								style={{
									maskImage: "radial-gradient(ellipse 100% 100% at 55% 40%, black 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.2) 72%, transparent 90%)",
									WebkitMaskImage: "radial-gradient(ellipse 100% 100% at 55% 40%, black 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.2) 72%, transparent 90%)",
								}}
							/>
						) : logoMark ? (
							<img
								src={logoMark}
								alt=""
								aria-hidden="true"
								className="pointer-events-none absolute bottom-0 right-0 h-32 w-auto select-none sm:h-48"
								style={{ filter: "brightness(0) invert(1)", opacity: 0.35 }}
							/>
						) : null}
						<div className="relative flex h-full flex-col p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold tracking-[0.18em] text-white/60 sm:text-[11px]">
									{t.cta_label ?? "КЛИКНИТЕ ЧТОБЫ ПЕРЕЙТИ"}
								</span>
								<span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
									<span className="text-base leading-none sm:text-lg"><ArrowUpRight /></span>
								</span>
							</div>
							<h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:mt-6 sm:text-3xl lg:mt-8 lg:text-4xl">
								{t.resume_title ?? "РЕЗЮМЕ"}
							</h2>
							<div className="mt-3 hidden flex-wrap gap-2 sm:flex">
								{resumeBadges.map((b) => (
									<span key={b} className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/90">{b}</span>
								))}
							</div>
							<p className="mt-auto min-h-0 whitespace-pre-line pt-3 text-[11px] font-medium uppercase leading-relaxed tracking-[0.12em] text-white/65 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] sm:pt-4 sm:text-xs lg:pt-6 lg:[-webkit-line-clamp:3]">
								{t.resume_description ?? "ОПЫТ, СТЕК И КРАТКИЙ СПИСОК РОЛЕЙ: СТРАНИЦА ДЛЯ РЕЗЮМЕ И ССЫЛКИ НА ФАЙЛ."}
							</p>
						</div>
					</Link>

					{/* Quote + About me */}
					<div className="col-span-2 order-3 flex min-h-0 flex-col gap-4 sm:gap-5 lg:order-none lg:col-span-6 lg:row-span-2 lg:row-start-1">
						<div
							data-block="дополнительный блок над обо мне"
							className="flex h-[14dvh] min-h-[4.5rem] w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl bg-transparent sm:h-[17.7dvh]"
						>
							<div className="flex h-full min-h-0 w-full items-center justify-center p-4 sm:p-6">
								<RotatingQuote
									key={lang}
									quotes={quotes}
									className="max-w-2xl text-center text-balance text-sm font-medium leading-relaxed tracking-tight text-foreground sm:text-base sm:text-lg"
								/>
							</div>
						</div>

						<Link
							data-block="блок обомне"
							href="/about"
							className="group min-h-[16rem] flex-1 overflow-hidden rounded-3xl border border-border/70 bg-foreground shadow-[0_1px_0_rgba(255,255,255,0.06),0_22px_70px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 active:translate-y-0 lg:min-h-0"
						>
							<div className="relative flex h-full min-h-0 flex-col">
								{aboutBgBlur && (
									<div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-bottom opacity-90 grayscale" style={{ backgroundImage: `url(${aboutBgBlur})` }} />
								)}
								{aboutIsVideo ? (
									<BgVideo src={aboutBg} poster={aboutBgPoster || aboutBgBlur} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90 grayscale" />
								) : aboutBg ? (
									<>
										<img alt="" aria-hidden="true" src={aboutBg} fetchPriority="high" decoding="async" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90 contrast-125 grayscale object-bottom" />
										<img alt="" aria-hidden="true" src={aboutBg} decoding="async" className="pointer-events-none absolute inset-0 h-full w-full scale-[1.03] object-cover opacity-90 blur-2xl grayscale object-bottom [clip-path:inset(62%_0_0_0)]" />
									</>
								) : null}
								<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_30%_10%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(to_bottom,rgba(0,0,0,0.28),transparent_55%)]" />

								<div className="relative flex basis-[62%] shrink-0 min-h-0 flex-col p-5 text-white sm:p-6 lg:basis-auto lg:flex-1">
									<div className="flex items-start justify-between">
										<span className="text-[11px] font-semibold tracking-[0.18em] text-white/70">
											{t.about_title ?? "ОБО МНЕ"}
										</span>
										<div className="flex flex-wrap items-center gap-2">
											{aboutBadges.map((b) => (
												<span key={b} className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/90 sm:px-4 sm:py-2 sm:text-xs">{b}</span>
											))}
										</div>
									</div>
								</div>

								<div className="relative flex flex-1 min-h-0 flex-col items-center justify-center overflow-hidden rounded-t-3xl bg-black/25 p-5 text-white sm:p-6 lg:h-[17.7dvh] lg:flex-none">
									<div className="pointer-events-none absolute inset-0 rounded-t-3xl border-t border-white/15 bg-black/45" />
									<p className="relative z-10 max-w-2xl text-center text-balance text-lg leading-snug tracking-tight sm:text-xl md:text-2xl">
										{t.about_description ?? "Кто я? Что я? И почему я? Вся информация обо мне здесь!"}
									</p>
									<div className="absolute bottom-5 right-5 z-10">
										<span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-sm transition-transform group-hover:translate-x-0.5">
											<span className="text-lg leading-none"><ArrowUpRight /></span>
										</span>
									</div>
								</div>
							</div>
						</Link>
					</div>

					{/* Disclaimer */}
					<div
						data-block="дополнительный блок под работами и резюме"
						className="col-span-2 order-4 flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border-2 border-foreground bg-transparent lg:order-none lg:h-[17.7dvh] lg:col-span-6 lg:row-start-2"
					>
						<div className="flex h-full min-h-0 w-full items-center p-4 sm:p-5 sm:p-6 lg:[container-type:size]">
							<p className="text-justify text-sm leading-relaxed text-foreground sm:text-[15px] sm:text-base lg:text-[clamp(0.62rem,min(13cqh,2.6cqw),1.1rem)]">
								{t.disclaimer ?? "Сайт является персональным портфолио с информацией обо мне, моих проектах и контактах."}{" "}
								<Link href="/privacy" className="underline underline-offset-2 hover:text-foreground/70">
									{lang === "en" ? "More about data" : lang === "de" ? "Mehr über Daten" : "Подробнее о данных"}
								</Link>
							</p>
						</div>
					</div>

				</section>
			</main>
		</div>
	);
}
