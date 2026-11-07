"use client";

import Link from "next/link";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItemBase =
	"group relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl px-3.5 py-2 text-left text-[13px] font-semibold leading-snug tracking-[0.02em] transition-all duration-300 ease-out active:scale-[0.985]";

const subItemBase =
	"flex w-full items-center gap-2 rounded-full border px-3 py-1 text-left text-[12px] font-medium leading-snug tracking-[0.01em] transition-colors";
const subItemClass = `${subItemBase} border-transparent bg-transparent text-white/50 hover:bg-white/8 hover:text-white/90`;
const subItemCurrentClass = `${subItemBase} border-white/10 bg-white/8 text-white/95`;

const siteButtonClass =
	"group/site mt-auto inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-4 pr-1.5 text-white shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0";

const iconProps = {
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	className: "h-3.5 w-3.5 shrink-0",
};

const icons = {
	home: (
		<svg {...iconProps}>
			<path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
			<path d="M7.5 18V12.5h5V18" />
		</svg>
	),
	about: (
		<svg {...iconProps}>
			<circle cx="10" cy="7" r="3" />
			<path d="M3.5 17.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" />
		</svg>
	),
	works: (
		<svg {...iconProps}>
			<rect x="2" y="2" width="7" height="7" rx="1.5" />
			<rect x="11" y="2" width="7" height="7" rx="1.5" />
			<rect x="2" y="11" width="7" height="7" rx="1.5" />
			<rect x="11" y="11" width="7" height="7" rx="1.5" />
		</svg>
	),
	resume: (
		<svg {...iconProps}>
			<rect x="4" y="1.5" width="12" height="17" rx="1.5" />
			<path d="M7 6.5h6M7 10h6M7 13.5h4" />
		</svg>
	),
	aiAssistant: (
		<svg {...iconProps}>
			<path d="M10 2l1.8 4.2L16 8l-4.2 1.8L10 14l-1.8-4.2L4 8l4.2-1.8L10 2z" />
			<path d="M16 13l.9 2.1 2.1.9-2.1.9L16 19l-.9-2.1L13 16l2.1-.9L16 13z" />
		</svg>
	),
	contacts: (
		<svg {...iconProps}>
			<rect x="2" y="4" width="16" height="12" rx="2" />
			<path d="M2 7l8 5 8-5" />
		</svg>
	),
	navigation: (
		<svg {...iconProps}>
			<path d="M2.5 5h15M2.5 10h15M2.5 15h9" />
		</svg>
	),
	quotes: (
		<svg {...iconProps}>
			<path d="M3 7.5C3 6.12 4.12 5 5.5 5H7v3H5.5A.5.5 0 005 8.5V10H7v4H3V7.5z" />
			<path d="M11 7.5C11 6.12 12.12 5 13.5 5H15v3h-1.5a.5.5 0 00-.5.5V10h2v4h-4V7.5z" />
		</svg>
	),
};

type Child = { href: string; label: string; icon: React.ReactNode };
type Section = { href: string; label: string; children?: Child[] };

const sections: Section[] = [
	{ href: "/admin/design", label: "Дизайн" },
	{
		href: "/admin/text",
		label: "Текст",
		children: [
			{ href: "/admin/text/home",         label: "Главная",      icon: icons.home },
			{ href: "/admin/text/about",        label: "Обо мне",      icon: icons.about },
			{ href: "/admin/text/works",        label: "Работы",       icon: icons.works },
			{ href: "/admin/text/resume",       label: "Резюме",       icon: icons.resume },
			{ href: "/admin/text/ai-assistant", label: "AI-ассистент", icon: icons.aiAssistant },
			{ href: "/admin/text/contacts",     label: "Контакты",     icon: icons.contacts },
			{ href: "/admin/text/navigation",   label: "Навигация",    icon: icons.navigation },
			{ href: "/admin/text/quotes",       label: "Цитаты",       icon: icons.quotes },
		],
	},
	{ href: "/admin/gallery",      label: "Медиатека" },
	{ href: "/admin/personal",     label: "Галерея"},
	{ href: "/admin/works",        label: "Работы" },
	{ href: "/admin/about",        label: "Обо мне"},
	{ href: "/admin/resume",       label: "Резюме" },
	{ href: "/admin/ai-assistant", label: "AI-ассистент" },
	{ href: "/admin/analytics",    label: "Аналитика" },
	{ href: "/admin/notes",        label: "Заметки" },
];

export function AdminSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	// Phone only: the menu opens as a drawer over the page.
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);
	const current =
		sections.flatMap((s) => [s, ...(s.children ?? [])]).filter((s) => pathname === s.href || pathname.startsWith(s.href + "/")).pop()
			?.label ?? "";

	const logout = async () => {
		try {
			await fetch("/api/admin/logout", { method: "POST" });
		} catch {
			// ignore - we redirect to the login anyway
		}
		router.replace("/admin/login");
		router.refresh();
	};

	return (
		<>
		{/* Phone top bar */}
		<div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-2.5 text-white md:hidden">
			<span className="text-lg font-extrabold tracking-tight">ADMIN</span>
			<span className="min-w-0 flex-1 truncate text-right text-[13px] font-semibold text-white/70">{current}</span>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label="Открыть меню"
				aria-expanded={open}
				className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10"
			>
				<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
					<path d="M3 5.5h14M3 10h14M3 14.5h14" />
				</svg>
			</button>
		</div>
		{open && <div aria-hidden className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={close} />}
		<aside
			aria-label="Навигация админки"
			className={`fixed inset-y-2 left-2 z-50 flex w-64 max-w-[calc(100vw-1rem)] shrink-0 flex-col overflow-hidden rounded-3xl bg-foreground text-white shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] transition-transform duration-300 md:static md:z-auto md:w-52 md:translate-x-0 lg:w-56 ${
				open ? "translate-x-0" : "-translate-x-[110%]"
			}`}
		>
			<div className="relative px-4 pb-4 pt-5 sm:px-5">
				<button
					type="button"
					onClick={close}
					aria-label="Закрыть меню"
					className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 md:hidden"
				>
					<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
						<path d="M5 5l10 10M15 5L5 15" />
					</svg>
				</button>
				<span className="text-2xl font-extrabold tracking-tight">ADMIN</span>
				<div className="mt-2.5 h-[2px] w-9 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.85)]" />
			</div>
			<nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2 sm:p-3">
				{sections.map((s) => {
					const isActive = pathname === s.href || pathname.startsWith(s.href + "/");
					return (
						<div key={s.href}>
							<Link
								href={s.href}
								onClick={close}
								aria-current={pathname === s.href ? "page" : undefined}
								className={`${navItemBase} ${isActive ? "text-white" : "text-white/70 hover:text-white"}`}
							>
								{/* background backdrop */}
								<span
									aria-hidden
									className={`pointer-events-none absolute inset-0 rounded-2xl ring-inset transition-all duration-300 ${
										isActive
											? "bg-white/[0.09] ring-1 ring-white/10"
											: "bg-transparent ring-0 ring-white/0 group-hover:bg-white/[0.045]"
									}`}
								/>
								{/* white glow for the active item */}
								<span
									aria-hidden
									className={`pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_50%,rgba(255,255,255,0.18),transparent_62%)] transition-opacity duration-500 ${
										isActive ? "opacity-100" : "opacity-0"
									}`}
								/>
								{/* white indicator - left border, bends around the corners */}
								<span
									aria-hidden
									className={`pointer-events-none absolute inset-0 rounded-2xl border-l-2 border-white drop-shadow-[0_0_4px_rgba(255,255,255,0.6)] transition-all duration-300 ${
										isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
									}`}
								/>
								<span className="relative z-10 pl-2 transition-transform duration-300 group-hover:translate-x-0.5">
									{s.label}
								</span>
								<span
									aria-hidden
									className={`relative z-10 ml-auto inline-flex items-center justify-center -translate-y-[1px] scale-125 text-xl leading-none transition-all duration-300 ${
										isActive
											? "translate-x-0 text-white opacity-100"
											: "-translate-x-1.5 text-white opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
									}`}
								>
									›
								</span>
							</Link>
							{isActive && s.children && (
								<div className="mt-2 mb-1 ml-2 flex flex-col gap-0.5 border-l border-white/10 pl-2">
									{s.children.map((c) => {
										const isCurrent = pathname === c.href;
										return (
											<Link
												key={c.href}
												href={c.href}
												onClick={close}
												aria-current={isCurrent ? "page" : undefined}
												className={isCurrent ? subItemCurrentClass : subItemClass}
											>
												{c.icon}
												{c.label}
											</Link>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
				<Link href="/" className={siteButtonClass}>
					<span className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-[0.18em]">
						На сайт
					</span>
					<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform group-hover/site:translate-x-0.5">
						<span className="text-lg leading-none"><ArrowUpRight /></span>
					</span>
				</Link>
				<button
					type="button"
					onClick={logout}
					className="group/out mt-2 inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/10 bg-transparent py-1.5 pl-4 pr-1.5 text-white/55 transition-all hover:border-white/15 hover:bg-white/5 hover:text-white/90 active:translate-y-0"
				>
					<span className="min-w-0 truncate text-[13px] font-semibold uppercase tracking-[0.18em]">
						Выйти
					</span>
					<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform group-hover/out:translate-x-0.5">
						<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
							<path d="M13 6V4.5a1.5 1.5 0 00-1.5-1.5H5A1.5 1.5 0 003.5 4.5v11A1.5 1.5 0 005 17h6.5a1.5 1.5 0 001.5-1.5V14" />
							<path d="M8.5 10h8.5M14.5 7l2.5 3-2.5 3" />
						</svg>
					</span>
				</button>
			</nav>
		</aside>
		</>
	);
}
