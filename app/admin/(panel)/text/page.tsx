import Link from "next/link";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { TranslateButton } from "./_components/translate-button";

const cardClass = "group relative flex h-32 flex-col overflow-hidden rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_0_rgba(0,0,0,0.06),0_14px_36px_rgba(0,0,0,0.1)] active:translate-y-0";
const goldClass = "ai-surface group relative flex h-32 flex-col overflow-hidden rounded-2xl border border-yellow-100/30 p-4 text-white shadow-[0_1px_0_rgba(255,255,255,0.12),0_8px_28px_rgba(217,160,78,0.2)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0";

const pages = [
	{
		slug: "home", label: "Главная", route: "/",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><path d="M7.5 18V12.5h5V18" /></svg>,
	},
	{
		slug: "about", label: "Обо мне", route: "/about",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="10" cy="7" r="3" /><path d="M3.5 17.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" /></svg>,
	},
	{
		slug: "works", label: "Работы", route: "/works",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" /><rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" /></svg>,
	},
	{
		slug: "contacts", label: "Контакты", route: "/contacts",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="2" y="4" width="16" height="12" rx="2" /><path d="M2 7l8 5 8-5" /></svg>,
	},
	{
		slug: "resume", label: "Резюме", route: "/resume-file",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><rect x="4" y="1.5" width="12" height="17" rx="1.5" /><path d="M7 6.5h6M7 10h6M7 13.5h4" /></svg>,
	},
	{
		slug: "ai-assistant", label: "AI-ассистент", route: "/ai-assistant", gold: true,
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M10 2l1.8 4.2L16 8l-4.2 1.8L10 14l-1.8-4.2L4 8l4.2-1.8L10 2z" /><path d="M16 13l.9 2.1 2.1.9-2.1.9L16 19l-.9-2.1L13 16l2.1-.9L16 13z" /></svg>,
	},
];

const globals = [
	{
		slug: "navigation", label: "Навигация", route: "header",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M2.5 5h15M2.5 10h15M2.5 15h9" /></svg>,
	},
	{
		slug: "quotes", label: "Цитаты", route: "global",
		icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 7.5C3 6.12 4.12 5 5.5 5H7v3H5.5A.5.5 0 005 8.5V10H7v4H3V7.5z" /><path d="M11 7.5C11 6.12 12.12 5 13.5 5H15v3h-1.5a.5.5 0 00-.5.5V10h2v4h-4V7.5z" /></svg>,
	},
];

function SectionCard({ s }: { s: (typeof pages)[number] }) {
	const isGold = "gold" in s && s.gold;
	return (
		<Link
			href={`/admin/text/${s.slug}`}
			className={isGold ? goldClass : cardClass}
		>
			<div className="flex items-start justify-between">
				<span className={isGold ? "text-white/60" : "text-foreground/30"}>{s.icon}</span>
				<span className={isGold ? "font-mono text-[9px] font-semibold tracking-widest text-white/50" : "font-mono text-[9px] font-semibold tracking-widest text-muted-foreground/50"}>
					{s.route}
				</span>
			</div>
			<div className="mt-auto flex items-end justify-between gap-2">
				<p className={isGold ? "text-[15px] font-extrabold leading-tight tracking-tight text-white" : "text-[15px] font-extrabold leading-tight tracking-tight text-foreground"}>
					{s.label}
				</p>
				<span className={isGold ? "mb-0.5 shrink-0 text-[13px] text-white/40 transition-transform group-hover:translate-x-0.5" : "mb-0.5 shrink-0 text-[13px] text-foreground/25 transition-transform group-hover:translate-x-0.5"}>
					<ArrowUpRight />
				</span>
			</div>
		</Link>
	);
}

export default function AdminTextPage() {
	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5">
				<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">Текст сайта</p>
				<p className="mt-1 text-xs text-muted-foreground">Выберите раздел для редактирования</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-6">

					<TranslateButton />

					<div className="flex flex-col gap-3">
						<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/50">
							Страницы сайта
						</p>
						<div className="grid grid-cols-2 gap-3">
							{pages.map((s) => <SectionCard key={s.slug} s={s} />)}
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="h-px flex-1 bg-border/50" />
						<span className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/40">Прочее</span>
						<div className="h-px flex-1 bg-border/50" />
					</div>

					<div className="grid grid-cols-2 gap-3 -mt-3">
						{globals.map((s) => <SectionCard key={s.slug} s={s} />)}
					</div>

				</div>
			</div>
		</div>
	);
}
