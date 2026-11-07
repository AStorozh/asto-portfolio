"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/lang-context";
import { WorkGallery, type WorkGalleryImage } from "./work-gallery";
import { ArrowUpRight } from "../arrow-up-right";

type Category = { id: number; slug: string; label: string };

type Work = {
	slug: string;
	title: string;
	category: string;
	categories: string[];
	featured: boolean;
	description: string;
	tags: string[];
	images: WorkGalleryImage[];
};

const navItemBase =
	"group relative flex w-full items-center gap-2.5 overflow-hidden rounded-2xl px-3.5 py-2.5 text-left text-[13px] font-semibold leading-snug tracking-[0.02em] transition-all duration-300 ease-out active:scale-[0.985]";

const mobileCatBase =
	"shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold leading-none tracking-[0.04em] transition-colors whitespace-nowrap";
const mobileCatClass =
	`${mobileCatBase} border-foreground/15 bg-background text-foreground/70 hover:border-foreground/40 hover:text-foreground`;
const mobileCatCurrentClass =
	`${mobileCatBase} border-foreground bg-foreground text-background shadow-sm`;

// Background/color/border/shadow are set by the featured condition: an important work is a dark card
// with light text, a regular one is light.
const workCardClass =
	"@container/card shrink-0 rounded-3xl border-2 p-4 sm:p-5";
// Minimum row height (can grow for the full description); depends on the card width.
const workCardBodyHeight = "min-h-36 @[40rem]/card:min-h-40 @[56rem]/card:min-h-48";

export function WorksFilter({
	works,
	categories,
}: {
	works: Work[];
	categories: Category[];
}) {
	const t = useT();
	const searchParams = useSearchParams();
	const [activeCategory, setActiveCategory] = useState<string>(
		() => searchParams.get("category") ?? "all",
	);
	const [query, setQuery] = useState("");

	const renderNavItem = (label: string, value: string, delay: number) => {
		const active = activeCategory === value;
		return (
			<button
				key={value}
				type="button"
				onClick={() => setActiveCategory(value)}
				aria-pressed={active}
				className={`sidebar-item-in ${navItemBase} ${active ? "text-white" : "text-white/55 hover:text-white"}`}
				style={{ animationDelay: `${delay}ms` }}
			>
				{/* background layer */}
				<span
					aria-hidden
					className={`pointer-events-none absolute inset-0 rounded-2xl ring-inset transition-all duration-300 ${
						active
							? "bg-white/[0.09] ring-1 ring-white/10"
							: "bg-transparent ring-0 ring-white/0 group-hover:bg-white/[0.045]"
					}`}
				/>
				{/* gold glow for the active one */}
				<span
					aria-hidden
					className={`pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_50%,rgba(217,160,78,0.2),transparent_62%)] transition-opacity duration-500 ${
						active ? "opacity-100" : "opacity-0"
					}`}
				/>
				{/* gold indicator - left border, wraps around the block's corners */}
				<span
					aria-hidden
					className={`pointer-events-none absolute inset-0 rounded-2xl border-l-2 border-amber-400 drop-shadow-[0_0_4px_rgba(217,160,78,0.6)] transition-all duration-300 ${
						active
							? "opacity-100"
							: "opacity-0 group-hover:opacity-50"
					}`}
				/>
				<span className="relative z-10 pl-2 transition-transform duration-300 group-hover:translate-x-0.5">
					{label}
				</span>
				<span
					aria-hidden
					className={`relative z-10 ml-auto inline-flex items-center justify-center -translate-y-[1px] scale-125 text-xl leading-none transition-all duration-300 ${
						active
							? "translate-x-0 text-amber-300 opacity-100"
							: "-translate-x-1.5 text-white opacity-0 group-hover:translate-x-0 group-hover:opacity-60"
					}`}
				>
					›
				</span>
			</button>
		);
	};

	const filtered = works.filter((w) => {
		const cats = w.categories.length ? w.categories : (w.category ? [w.category] : []);
		const matchCat = activeCategory === "all" || cats.includes(activeCategory);
		const q = query.trim().toLowerCase();
		const matchSearch =
			!q ||
			w.title.toLowerCase().includes(q) ||
			w.description.toLowerCase().includes(q) ||
			cats.some((c) => c.toLowerCase().includes(q)) ||
			w.tags.some((tag) => tag.toLowerCase().includes(q));
		return matchCat && matchSearch;
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-5">

			{/* ── Mobile category chips (horizontal scroll) ── */}
			<div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:hidden">
				<button
					type="button"
					onClick={() => setActiveCategory("all")}
					className={activeCategory === "all" ? mobileCatCurrentClass : mobileCatClass}
					aria-pressed={activeCategory === "all"}
				>
					{t.works_all}
				</button>
				{categories.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setActiveCategory(cat.label)}
						className={activeCategory === cat.label ? mobileCatCurrentClass : mobileCatClass}
						aria-pressed={activeCategory === cat.label}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* ── Desktop sidebar ── */}
			<aside
				className="relative hidden w-56 shrink-0 flex-col overflow-hidden rounded-3xl border-2 border-foreground bg-foreground text-white shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.28)] sm:flex sm:w-60"
				aria-label={t.works_aria_categories}
			>
				{/* soft gold glow on top */}
				<div
					aria-hidden
					className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,160,78,0.16),transparent_70%)] blur-2xl"
				/>

				{/* Heading */}
				<div className="relative px-5 pt-5 pb-4">
					<h2 className="whitespace-nowrap text-4xl font-extrabold leading-none tracking-tight drop-shadow-[0_2px_18px_rgba(217,160,78,0.25)]">
						{t.works_sidebar_title}
					</h2>
					<div className="mt-3 h-[2px] w-9 rounded-full bg-gradient-to-r from-amber-300 to-amber-600 shadow-[0_0_10px_rgba(217,160,78,0.5)]" />
				</div>

				<nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none]" aria-label={t.works_aria_nav}>
					{renderNavItem(t.works_all, "all", 60)}
					{categories.map((cat, i) => renderNavItem(cat.label, cat.label, 60 + (i + 1) * 55))}
				</nav>
				<div className="shrink-0 p-2 pt-0 sm:p-3 sm:pt-0">
					<Link
						href="/ai-assistant"
						className="ai-surface group/about inline-flex w-full items-center justify-between gap-2 rounded-full border border-yellow-100/30 py-1.5 pl-4 pr-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_24px_rgba(217,160,78,0.24)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
						aria-label={t.works_aria_ai}
					>
						<span className="text-[11px] font-semibold tracking-[0.18em] text-white">{t.works_ai_label}</span>
						<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-transform group-hover/about:translate-x-0.5">
							<span className="text-lg leading-none" aria-hidden><ArrowUpRight /></span>
						</span>
					</Link>
				</div>
			</aside>

			{/* ── Main content ── */}
			<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 sm:gap-5">
				{/* Search */}
				<div
					role="search"
					aria-label={t.works_search_label}
					className="flex h-14 shrink-0 items-center gap-3 rounded-3xl border-2 border-foreground bg-background px-3 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] sm:h-16 sm:gap-4 sm:px-5"
				>
					<span className="hidden shrink-0 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground sm:inline">
						{t.works_search}
					</span>
					<div className="relative min-w-0 flex-1">
						<label htmlFor="works-search-query" className="sr-only">{t.works_search_label}</label>
						<svg
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden
						>
							<circle cx="10.5" cy="10.5" r="5.5" />
							<path d="M14 14L20 20" />
						</svg>
						<input
							id="works-search-query"
							type="text"
							autoComplete="off"
							placeholder={t.works_search_placeholder}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="h-10 w-full rounded-xl border-0 bg-transparent py-2 pl-10 pr-8 text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery("")}
								aria-label={t.works_search_clear}
								className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] text-foreground/50 transition-colors hover:bg-foreground/20 hover:text-foreground"
							>
								✕
							</button>
						)}
					</div>
				</div>

				{/* Works list */}
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5 sm:gap-5 [scrollbar-gutter:stable]">
					{filtered.length === 0 && (
						<div className="flex flex-1 items-center justify-center">
							<p className="text-sm text-muted-foreground">{t.works_empty}</p>
						</div>
					)}
					{filtered.map((work) => (
						<Link
							key={work.slug}
							href={`/works/${work.slug}`}
							className="block"
							aria-label={`${t.works_aria_open} ${work.title}`}
						>
							<article className={`${workCardClass} shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]${work.featured ? " border-foreground bg-foreground text-background" : " border-foreground bg-background"}`}>
								<div className={`flex shrink-0 flex-row items-stretch gap-[clamp(0.75rem,2cqi,1.25rem)] ${workCardBodyHeight}`}>
									<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 @[34rem]/card:gap-4">
										{/* category and title - priority, always visible, size scales smoothly with the card width */}
										<div className="shrink-0">
											{work.featured && (
												<span className="mb-1 flex w-max items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/15 px-2 py-0.5 font-bold uppercase tracking-[0.14em] text-amber-300 text-[clamp(0.55rem,1.5cqi,0.66rem)]">
													<span aria-hidden>★</span> {t.works_featured}
												</span>
											)}
											<span className={`font-semibold uppercase tracking-[0.18em] text-[clamp(0.6rem,1.7cqi,0.72rem)] ${work.featured ? "text-background/55" : "text-muted-foreground"}`}>
												{(work.categories.length ? work.categories : [work.category]).filter(Boolean).join(" · ")}
											</span>
											<h2 className="pt-1.5 font-extrabold leading-snug tracking-tight text-[clamp(0.95rem,3cqi,1.35rem)] @[34rem]/card:pt-2.5">
												{work.title}
											</h2>
										</div>
										{/* description - flexible, scrolls; hidden only when there is very little room */}
										<p className={`hidden pr-0.5 leading-snug @[15rem]/card:block text-[clamp(0.78rem,2cqi,0.95rem)] ${work.featured ? "text-background/75" : "text-muted-foreground"}`}>
											{work.description}
										</p>
									</div>
									{/* gallery column - width scales smoothly with the card width */}
									<div className="@container/gallery h-36 min-h-0 self-center @[40rem]/card:h-40 @[56rem]/card:h-48 w-[clamp(7rem,38cqi,30rem)] shrink-0 overflow-hidden">
										<WorkGallery
											compact
											images={work.images}
											label={work.title}
											className="h-full min-h-0"
										/>
									</div>
								</div>
							</article>
						</Link>
					))}

					{/* Other categories block */}
					{activeCategory !== "all" && filtered.length > 0 && (
						(() => {
							const others = categories.filter((c) => c.label !== activeCategory);
							if (others.length === 0) return null;
							return (
								<div className="shrink-0 rounded-3xl border-2 border-foreground/10 bg-muted/20 p-4 sm:p-5">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										{t.works_other_sections}
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										{others.map((cat) => (
											<button
												key={cat.id}
												type="button"
												onClick={() => setActiveCategory(cat.label)}
												className="inline-flex items-center rounded-full border border-foreground/15 bg-background px-4 py-2 text-[12px] font-semibold tracking-[0.04em] text-foreground/80 shadow-sm transition-all hover:border-foreground/40 hover:text-foreground hover:-translate-y-0.5 active:translate-y-0"
											>
												{cat.label}
											</button>
										))}
										<button
											type="button"
											onClick={() => setActiveCategory("all")}
											className="inline-flex items-center rounded-full border border-foreground bg-foreground px-4 py-2 text-[12px] font-semibold tracking-[0.04em] text-background shadow-sm transition-all hover:opacity-80 hover:-translate-y-0.5 active:translate-y-0"
										>
											{t.works_all}
										</button>
									</div>
								</div>
							);
						})()
					)}
				</div>
			</section>
		</div>
	);
}
