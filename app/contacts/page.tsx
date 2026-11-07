import { getContactMethods, getContactsTexts, getPageHeroForLang } from "@/lib/content";
import { ArrowUpRight } from "../arrow-up-right";
import { getLang, withLang } from "@/lib/lang";
import { AiCallBlock } from "./ai-call-block";

const bgColors = [
	"oklch(0.14 0 0)",
	"oklch(0.19 0 0)",
	"oklch(0.24 0 0)",
	"oklch(0.29 0 0)",
];

export default async function ContactsPage() {
	const lang = await getLang();
	const [hero, rawT, methods] = await Promise.all([
		getPageHeroForLang("contacts", lang),
		getContactsTexts(),
		getContactMethods(lang),
	]);
	const t = withLang(rawT, lang);

	const ctaLabel = t.cta_label ?? "КЛИКНИТЕ ЧТОБЫ ПЕРЕЙТИ";

	return (
		<main className="min-h-[calc(100dvh-4rem)] overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5 lg:h-[calc(100dvh-4rem)] lg:min-h-[660px]">
			<section className="flex min-h-full flex-col gap-4 sm:gap-5 lg:h-full lg:min-h-0">
				<div
					data-block="контакты заголовок"
					className="h-[17.7dvh] min-h-[6rem] shrink-0 rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] lg:h-auto lg:flex-1 lg:min-h-0 lg:shrink"
				>
					<div className="flex h-full flex-col p-5">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
								{hero?.label ?? "СТРАНИЦА"}
							</span>
						</div>
						<div className="mt-auto flex items-baseline justify-between gap-4">
							<h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
								{hero?.title ?? "КОНТАКТЫ"}
							</h1>
							<span className="text-right text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
								{hero?.subtitle ?? "ВЫБЕРИТЕ СПОСОБ СВЯЗИ"}
							</span>
						</div>
					</div>
				</div>

				{methods.map((method, idx) => (
					<a
						key={method.slug}
						data-block={`контакты ${method.slug}`}
						href={method.href}
						target={method.href.startsWith("http") ? "_blank" : undefined}
						rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
						aria-label={`${lang === "en" ? "Write" : lang === "de" ? "Schreiben" : "Написать"}: ${method.platform}`}
						data-analytics="contact_click"
						data-analytics-meta={method.platform}
						style={{
							backgroundColor: bgColors[idx] ?? "oklch(0.29 0 0)",
							zIndex: 50 - idx * 10,
						}}
						className={`group relative h-[17.7dvh] min-h-[6rem] shrink-0 rounded-3xl border border-border/70 text-background shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 active:translate-y-0 lg:h-auto lg:flex-1 lg:min-h-0 lg:shrink${idx > 0 ? " lg:-mt-16" : ""}`}
					>
						<div className="flex h-full flex-col p-5">
							<div className="hidden items-center justify-between sm:flex">
								<span className="text-[11px] font-semibold tracking-[0.18em] text-white/60">
									{ctaLabel}
								</span>
							</div>
							<div className="mt-auto flex items-baseline justify-between gap-4 pr-14">
								<h2 className="gold-surface-shift bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-4xl font-extrabold tracking-[0.01em] text-background transition-colors duration-300 group-hover:text-transparent sm:text-5xl md:text-6xl">
									{method.platform}
								</h2>
								<span className="hidden text-right text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-white/65 sm:inline">
									{method.title}
								</span>
							</div>
							<span className="absolute bottom-5 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform group-hover:translate-x-0.5">
								<span className="text-lg leading-none text-background transition-colors duration-300 group-hover:text-amber-300"><ArrowUpRight /></span>
							</span>
						</div>
					</a>
				))}

				<AiCallBlock
					label={t.ai_assistant_label ?? "AI-АССИСТЕНТ"}
					description={t.ai_assistant_description ?? "ЗАДАТЬ ВОПРОС ПО РЕЗЮМЕ."}
					zIndex={50 - methods.length * 10}
					lang={lang}
				/>
			</section>
		</main>
	);
}
