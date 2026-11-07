"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight } from "./arrow-up-right";
import { useState, useTransition } from "react";
import { useT } from "@/lib/lang-context";
import { setLangCookie } from "@/app/actions/lang-action";
import { useCall } from "./ai-assistant/call-context";

type Lang = "ru" | "en" | "de";

const LANGS: { code: Lang; label: string }[] = [
	{ code: "ru", label: "RU" },
	{ code: "en", label: "EN" },
	{ code: "de", label: "DE" },
];

function formatCallDuration(seconds: number) {
	const m = Math.floor(seconds / 60).toString().padStart(2, "0");
	const s = (seconds % 60).toString().padStart(2, "0");
	return `${m}:${s}`;
}

interface SiteHeaderProps {
	navLabels?: Record<string, string>;
	defaultLang?: Lang;
	logoUrl?: string;
}

export function SiteHeader({ navLabels, defaultLang = "ru", logoUrl }: SiteHeaderProps) {
	const nl = (key: string, fallback: string) => navLabels?.[key] ?? fallback;
	const pathname = usePathname();
	const router = useRouter();
	const call = useCall();
	const t = useT();
	const [lang, setLang] = useState<Lang>(defaultLang);
	const [isPending, startTransition] = useTransition();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const lightBar = false;

	if (pathname.startsWith("/admin")) return null;
	if (pathname === "/resume-file/embed") return null;

	function handleLangSelect(code: Lang) {
		if (code === lang || isPending) return;
		startTransition(async () => {
			await setLangCookie(code);
			setLang(code);
			router.refresh();
		});
	}

	function renderLangSwitch() {
		return (
			<div
				role="group"
				aria-label="Switch language"
				className="inline-flex items-stretch gap-0.5 self-stretch rounded-full border border-white/15 bg-white/[0.06] p-0.5"
			>
				{LANGS.map(({ code, label }) => {
					const active = lang === code;
					return (
						<button
							key={code}
							type="button"
							onClick={() => handleLangSelect(code)}
							disabled={isPending}
							aria-pressed={active}
							className={`inline-flex items-center rounded-full px-3 text-sm font-semibold tracking-tight transition-all duration-300 disabled:cursor-default ${
								active
									? "bg-white text-neutral-900 shadow-[0_0_14px_rgba(255,255,255,0.55),0_1px_2px_rgba(0,0,0,0.2)]"
									: "text-white/55 hover:text-white"
							}`}
						>
							{label}
						</button>
					);
				})}
			</div>
		);
	}

	function closeMenu() {
		setIsMenuOpen(false);
	}

	const barClass = lightBar
		? "relative flex h-16 items-center justify-between rounded-b-3xl bg-white px-3 text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.06),0_18px_55px_rgba(0,0,0,0.1)] sm:px-5"
		: "relative flex h-16 items-center justify-between rounded-b-3xl bg-foreground px-3 text-white shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] sm:px-5";

	const brandClass = lightBar
		? "flex items-center text-neutral-900"
		: "flex items-center text-white";

	function navItemClass(href: string, forceActive = false) {
		const isActive = forceActive || pathname === href;
		const base =
			"inline-flex items-center rounded-full border px-4 py-1.5 transition-colors";
		const inactive = lightBar
			? "border-transparent bg-transparent text-neutral-900 hover:text-neutral-500"
			: "border-transparent bg-transparent text-white hover:text-white/80";
		const active = lightBar
			? "border-neutral-900/20 bg-neutral-900/[0.06] text-neutral-900 shadow-sm"
			: "border-white/15 bg-white/10 text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]";

		return `${base} ${isActive ? active : inactive}`;
	}

	function renderNavLink(href: string, label: string) {
		const isActive = pathname === href;
		return (
			<Link
				key={href}
				href={href}
				className={`group relative inline-flex items-center px-1 py-1 text-[15px] font-medium tracking-tight transition-colors duration-300 ${
					isActive ? "text-white" : "text-white/65 hover:text-white"
				}`}
			>
				<span className="relative z-10 transition-transform duration-300 group-hover:-translate-y-px">
					{label}
				</span>
				{/* gold underline */}
				<span
					aria-hidden
					className={`pointer-events-none absolute -bottom-0.5 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-amber-600 shadow-[0_0_8px_rgba(217,160,78,0.6)] transition-all duration-300 ease-out ${
						isActive
							? "w-full opacity-100"
							: "w-0 opacity-0 group-hover:w-full group-hover:opacity-70"
					}`}
				/>
				{/* soft glow under the active one */}
				<span
					aria-hidden
					className={`pointer-events-none absolute -bottom-1 left-1/2 h-5 w-12 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,160,78,0.28),transparent_70%)] blur-md transition-opacity duration-500 ${
						isActive ? "opacity-100" : "opacity-0"
					}`}
				/>
			</Link>
		);
	}

	function aiAssistantClass() {
		return "ai-surface inline-flex items-center rounded-full border border-yellow-100/30 px-4 py-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_24px_rgba(217,160,78,0.26)] transition-colors hover:border-yellow-100/45 hover:brightness-110";
	}

	// AI assistant button content: call status, if one is in progress.
	function aiAssistantLabel() {
		if (call.status === "active") {
			return (
				<span className="inline-flex items-center gap-2">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(217,160,78,0.8)]" />
					</span>
					<span className="tabular-nums">
						{lang === "en" ? "Call" : lang === "de" ? "Anruf" : "Звонок"} {formatCallDuration(call.seconds)}
					</span>
				</span>
			);
		}
		if (call.status === "connecting")
			return lang === "en" ? "Connecting…" : lang === "de" ? "Verbindung…" : "Соединение…";
		return nl("ai_assistant", "AI-ассистент");
	}

	const mobileNavLinks = [
		{ href: "/", label: nl("home", "Главная") },
		{ href: "/about", label: nl("about", "Обо мне") },
		{ href: "/works", label: nl("works", "Работы") },
		{ href: "/resume-file", label: nl("resume", "Резюме") },
		{ href: "/contacts", label: nl("contacts", "Контакты") },
	];

	return (
		<header className="relative z-[100] w-full bg-transparent">
			<div className="px-5">
				<div className={barClass}>
					<div className={brandClass}>
						<Link
							href="/"
							className="group inline-flex items-end gap-1.5"
							aria-label={t.aria_home}
							onClick={closeMenu}
						>
							{logoUrl && (
								<img
									src={logoUrl}
									alt={t.ui_logo_alt}
									draggable={false}
									className="block h-4 w-auto select-none sm:h-5"
								/>
							)}
							<span className="whitespace-nowrap text-sm font-medium leading-none tracking-tight opacity-90 sm:text-base">
								{nl("logo", ".portfolio")}
							</span>
						</Link>
					</div>

					{/* Desktop nav */}
					<nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-11 text-base lg:flex">
						{mobileNavLinks.map(({ href, label }) => renderNavLink(href, label))}
					</nav>

					{/* Desktop right controls */}
					<div className="hidden items-center gap-5 text-base lg:flex">
						{call.status !== "idle" && (
							<button
								type="button"
								onClick={call.toggle}
								aria-label={t.aria_end_call}
								title={t.aria_end_call}
								className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
							>
								<svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
									<rect x="6" y="6" width="12" height="12" rx="2" />
								</svg>
							</button>
						)}
						<Link href="/ai-assistant" className={aiAssistantClass()}>
							{aiAssistantLabel()}
						</Link>
						{renderLangSwitch()}
					</div>

					{/* Mobile right controls */}
					<div className="flex items-center gap-2 lg:hidden">
						{call.status !== "idle" && (
							<button
								type="button"
								onClick={call.toggle}
								aria-label={t.aria_end_call}
								title={t.aria_end_call}
								className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
							>
								<svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
									<rect x="6" y="6" width="12" height="12" rx="2" />
								</svg>
							</button>
						)}
						{renderLangSwitch()}
						<button
							type="button"
							onClick={() => setIsMenuOpen((v) => !v)}
							aria-label={isMenuOpen ? t.ui_menu_close : t.ui_menu_open}
							aria-expanded={isMenuOpen}
							className={navItemClass("__menu-btn", true)}
						>
							{isMenuOpen ? "✕" : "≡"}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile dropdown menu */}
			{isMenuOpen && (
				<div className="absolute inset-x-5 top-full z-50 mt-2 lg:hidden overflow-hidden rounded-3xl bg-foreground shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
					<nav className="flex flex-col gap-0.5 p-3" aria-label={t.aria_mobile_menu}>
						{mobileNavLinks.map(({ href, label }) => {
							const isActive = pathname === href;
							return (
								<Link
									key={href}
									href={href}
									onClick={closeMenu}
									className={`flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors ${
										isActive ? "bg-white/10" : "hover:bg-white/8"
									}`}
								>
									{label}
								</Link>
							);
						})}
						<div className="mt-1.5 pt-1.5 border-t border-white/10">
							<Link
								href="/ai-assistant"
								onClick={closeMenu}
								className="ai-surface flex w-full items-center justify-between rounded-2xl border border-yellow-100/30 px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
							>
								{aiAssistantLabel()}
								<span className="text-base leading-none opacity-70"><ArrowUpRight /></span>
							</Link>
						</div>
					</nav>
				</div>
			)}
		</header>
	);
}
