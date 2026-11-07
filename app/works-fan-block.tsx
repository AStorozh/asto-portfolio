import Link from "next/link";
import { ArrowUpRight } from "./arrow-up-right";
import type { KV } from "@/lib/content";
import type { Lang } from "@/lib/lang";
import { mediaUrl, mediaBlur, mediaVideoPreview, mediaPoster, isVideoUrl } from "@/lib/media-url";
import { BgVideo } from "./bg-video";
import { SenaLogo } from "./sena-logo";
import { LumaLogo } from "./luma-logo";
import { NetLogo } from "./net-logo";

// The "Works" block from the home page, with a fan of project link cards sticking out of it like from a pocket.
// Size and grid position are set by className from outside.
export function WorksFanBlock({ t, lang, worksBgRaw, logoUrl, className }: { t: KV; lang: Lang; worksBgRaw: string; logoUrl?: string; className: string }) {
	const worksIsVideo = isVideoUrl(worksBgRaw);
	const worksBg = worksIsVideo ? mediaVideoPreview(worksBgRaw) : mediaUrl(worksBgRaw, { w: 700 });
	const worksBgBlur = worksIsVideo ? mediaPoster(worksBgRaw) : mediaBlur(worksBgRaw);

	const worksBadges =
		"works_badges" in t
			? t.works_badges
					.split("\n")
					.map((b: string) => b.trim())
					.filter(Boolean)
			: [t.works_subtitle ?? "ПРОЕКТЫ"];

	// On hover a card comes to the front and lifts slightly so its description is visible.
	// Fan cards left to right: rotation, shade of gray (lightens in equal steps so the edges don't blend) and where the click leads.
	// Descriptions in the site's three languages. Links are temporary, to any works on the site; the real project pages will be plugged in later.
	const fan: { deg: number; bg: string; label: string; href: string; description?: Record<Lang, string>; bigLabel?: boolean; logo?: React.ReactNode; logoWidth?: string; logoTop?: string }[] = [
		{
			deg: -20,
			bg: "bg-[#9e9e9e]",
			label: "ASTO",
			// The same logo as on the left of the top menu
			logo: logoUrl ? <img src={logoUrl} alt="" draggable={false} className="block h-auto w-full select-none opacity-65 brightness-0" /> : undefined,
			logoWidth: "w-[48%]",
			logoTop: "top-[45%]",
			href: "/works/asto-portfolio",
			description: {
				ru: "Сайт-портфолио с ИИ\u2060-\u2060ассистентом и собственной аналитикой, управляемый агентами через API",
				en: "Portfolio site with an AI assistant and in\u2060-\u2060house analytics, managed by agents via API",
				de: "Portfolio\u2060-\u2060Website mit KI\u2060-\u2060Assistent und eigener Analytik, gesteuert von Agenten über API",
			},
		},
		{
			deg: -7,
			bg: "bg-[#b4b4b4]",
			label: "HIREFLOW",
			logo: <NetLogo text="HireFlow" className="block aspect-[3/1] w-full" />,
			logoWidth: "w-[66%]",
			logoTop: "top-[48%]",
			href: "/works/hireflow",
			description: {
				ru: "Платформа автопоиска работы: подбор и оценка вакансий, сопроводительные письма, API для ИИ\u2060-\u2060агентов",
				en: "Automated job search platform: vacancy matching and scoring, cover letters, API for AI agents",
				de: "Plattform für automatische Jobsuche: Auswahl und Bewertung von Stellen, Anschreiben, API für KI\u2060-\u2060Agenten",
			},
		},
		{
			deg: 7,
			bg: "bg-[#cacaca]",
			bigLabel: true,
			label: "Luma",
			logo: <LumaLogo className="h-auto w-full" />,
			logoWidth: "w-[20%]",
			href: "/works/luma",
			description: {
				ru: "Личная операционная система жизни для контроля жизни с открытым API для ИИ\u2060-\u2060агентов",
				en: "Personal life operating system to keep your life under control, with an open API for AI agents",
				de: "Persönliches Betriebssystem fürs Leben, um den Alltag im Griff zu haben, mit offener API für KI\u2060-\u2060Agenten",
			},
		},
		{
			deg: 20,
			bg: "bg-[#e0e0e0]",
			bigLabel: true,
			label: "Sena",
			logo: <SenaLogo className="h-auto w-full" />,
			href: "/works/sena",
			description: {
				ru: "Оркестратор 7 ИИ\u2060-\u2060агентов, которые помнят, учатся и сами работают с 200+ сервисами и источниками",
				en: "Orchestrator of 7 AI agents that remember, learn and work on their own with 200+ services and sources",
				de: "Orchestrator aus 7 KI\u2060-\u2060Agenten, die sich erinnern, lernen und selbstständig mit über 200 Diensten und Quellen arbeiten",
			},
		},
	];
	// Cards stick out between the "Works" heading and the description:
	// --cards-top - top of the cards, right under the heading;
	// --pocket - where the description starts (measured from the block's bottom), below it the cards are hidden;
	// --fade - height of the smooth transition so the cards dissolve without a sharp line.
	// The mask fades the cards' bottom both inside the block and beyond its edges, so nothing clips them at the sides.
	// Clipping at --pocket is needed for clicks: the hidden bottom of the cards doesn't intercept clicks on the description.
	const fanMask =
		"linear-gradient(to bottom, black calc(100% - var(--pocket) - var(--fade)), rgba(0,0,0,0.75) calc(100% - var(--pocket) - var(--fade) * 0.7), rgba(0,0,0,0.35) calc(100% - var(--pocket) - var(--fade) * 0.4), rgba(0,0,0,0.1) calc(100% - var(--pocket) - var(--fade) * 0.15), transparent calc(100% - var(--pocket)))";

	// Front face of the "Works" block, 1:1 as on the home page.
	const worksFace = (
		<>
			{worksBgBlur && <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-bottom blur-[6px]" style={{ backgroundImage: `url(${worksBgBlur})` }} />}
			{worksIsVideo ? (
				<BgVideo src={worksBg} poster={worksBgBlur} className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover blur-[6px]" />
			) : worksBg ? (
				<img
					alt=""
					aria-hidden="true"
					src={worksBg}
					fetchPriority="high"
					decoding="async"
					className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-100 contrast-110 object-bottom blur-[6px]"
				/>
			) : null}
			<div className="pointer-events-none absolute inset-0 rounded-3xl border-t border-white/15 bg-black/45" />
			{/* Smooth darkening from the bottom: hides the sharp dark edge of the photo and raises the shadow slightly above the description */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 h-[75%]"
				style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.82) 22%, rgba(0,0,0,0.62) 40%, rgba(0,0,0,0.38) 58%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0.05) 90%, transparent 100%)" }}
			/>
			<div className="relative z-10 flex h-full flex-col p-4 sm:p-6">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-semibold tracking-[0.18em] text-white/60 sm:text-[11px]">{t.cta_label ?? "КЛИКНИТЕ ЧТОБЫ ПЕРЕЙТИ"}</span>
					<span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform group-hover:translate-x-0.5 sm:h-9 sm:w-9">
						<span className="text-base leading-none sm:text-lg">
							<ArrowUpRight />
						</span>
					</span>
				</div>
				<h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:mt-6 sm:text-3xl lg:mt-8 lg:text-4xl">{t.works_title ?? "РАБОТЫ"}</h2>
				<div className="mt-3 hidden flex-wrap gap-2 sm:flex">
					{worksBadges.map((b: string) => (
						<span key={b} className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/90">
							{b}
						</span>
					))}
				</div>
				<p className="mt-auto min-h-0 pt-3 text-[11px] font-medium uppercase leading-relaxed tracking-[0.12em] text-white/65 overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] sm:pt-4 sm:text-xs lg:pt-6 lg:[-webkit-line-clamp:3]">
					{t.works_description ?? "ПОДБОРКА ПРОЕКТОВ: ЛЕНДИНГИ, ИНТЕРФЕЙСЫ, АНИМАЦИИ, АДАПТИВНАЯ ВЕРСТКА."}
				</p>
			</div>
		</>
	);

	return (
		<div
			data-block="блок работы"
			className={`group relative ${className} rounded-3xl [--cards-top:5.75rem] [--fade:2.5rem] [--pocket:3.25rem] sm:[--cards-top:7.25rem] sm:[--fade:4rem] sm:[--pocket:4rem] lg:[--cards-top:9.25rem] lg:[--fade:7rem] lg:[--pocket:5.25rem] text-background shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] transition-transform will-change-transform hover:-translate-y-0.5 active:translate-y-0`}
		>
			<Link href="/works" className="absolute inset-0 isolate overflow-hidden rounded-3xl border border-border/70 bg-black/25">
				{worksFace}
			</Link>

			{/* Fan of three empty cards: the bottom is hidden behind the description, the top sticks out up to the heading */}
			{/* The layer is twice as wide as the block so the mask doesn't cut cards that stick out past the side edges */}
			{/* translateZ(0) keeps the masked layer on the GPU permanently: otherwise, when hovering outside the block, Chrome
			    moves it to a new layer mid-animation, loses the mask for a frame, and a white stripe flashes at the "pocket" */}
			{/* Below lg the block is low and wide and the fan gets squashed, so there it is not shown at all. */}
			<div className="pointer-events-none absolute inset-y-0 -inset-x-1/2 z-10 hidden [transform:translateZ(0)] [backface-visibility:hidden] lg:block" style={{ maskImage: fanMask, WebkitMaskImage: fanMask, clipPath: "inset(-100% 0 calc(var(--pocket) + 1px) 0)" }}>
				{/* @container: sizes inside a card are in cqw (share of the card width), so on any screen
				    the card keeps the proportions of the wide-screen version instead of a fixed text size. */}
				<div data-block="веер карточек" className="@container absolute inset-x-[32.5%] bottom-0 top-[var(--cards-top)]">
					{fan.map(({ deg, bg, label, href, description, bigLabel, logo, logoWidth, logoTop }) => (
						<Link
							key={label}
							href={href}
							className={`pointer-events-auto absolute inset-0 origin-[50%_120%] [transform:rotate(var(--deg))] transition-transform duration-300 hover:z-10 hover:[transform:rotate(var(--deg))_translateY(-3%)] rounded-3xl border border-black/10 ${bg} shadow-[0_18px_55px_rgba(0,0,0,0.25)]`}
							style={{ "--deg": `${deg}deg` } as React.CSSProperties}
						>
							<span
								className={`absolute left-[5cqw] top-[6.3cqw] rotate-180 [writing-mode:vertical-rl] font-extrabold tracking-tight text-foreground ${bigLabel ? "text-[8.8cqw]" : "text-[7.55cqw]"}`}
							>
								{label}
							</span>
							{description && (
								<span className="absolute left-[22.6cqw] right-[6.3cqw] top-[6.3cqw] text-balance text-[4.1cqw] font-medium leading-snug text-foreground/70 @max-[200px]:hidden">
									{description[lang]}
								</span>
							)}
							{/* Project logo under the description, centered on the card width */}
							{logo && (
								<span className={`absolute left-1/2 ${logoTop ?? "top-[41%]"} block ${logoWidth ?? "w-[34%]"} -translate-x-1/2 text-foreground/80`}>{logo}</span>
							)}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
