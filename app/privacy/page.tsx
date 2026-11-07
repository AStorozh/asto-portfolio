import Link from "next/link";
import { getLang } from "@/lib/lang";
import { privacyContent } from "@/lib/privacy-content";
import { ArrowUpRight } from "../arrow-up-right";

// The "About data" page: what the site collects and why. The link to it is in the
// disclaimer on the home page.
export default async function PrivacyPage() {
	const lang = await getLang();
	const c = privacyContent(lang);

	return (
		<main className="min-h-[calc(100dvh-4rem)] overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5">
			<div className="mx-auto flex max-w-4xl flex-col gap-4 sm:gap-5">
				<div
					data-block="о данных заголовок"
					className="h-[17.7dvh] min-h-[6rem] shrink-0 rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]"
				>
					<div className="flex h-full flex-col p-5">
						<span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
							{c.label}
						</span>
						<div className="mt-auto flex items-baseline justify-between gap-4">
							<h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">{c.title}</h1>
							<span className="hidden text-right text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-muted-foreground sm:block">
								{c.subtitle}
							</span>
						</div>
					</div>
				</div>

				{/* All text as one block: sections are separated by headings, not frames. */}
				<div
					data-block="о данных текст"
					className="rounded-3xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] sm:p-6"
				>
					<p className="text-sm leading-relaxed text-foreground sm:text-base">{c.intro}</p>
					<p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						{c.updated}
					</p>

					{c.sections.map((section) => (
						<section key={section.title} className="mt-8 border-t border-foreground/10 pt-6">
							<h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{section.title}</h2>
							<ul className="mt-4 flex flex-col gap-3">
								{section.items.map((item) => (
									<li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
										<span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</section>
					))}

					{/* The button sits in the line with the text, not under it. */}
					<div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 pt-6">
						<div className="min-w-0">
							<h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{c.contactTitle}</h2>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.contactText}</p>
						</div>
						<Link
							href="/contacts"
							className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border-2 border-foreground py-2 pl-5 pr-2 text-sm font-semibold tracking-tight transition-transform hover:-translate-y-0.5 active:translate-y-0"
						>
							{c.contactCta}
							<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.06] text-base leading-none transition-transform group-hover:translate-x-0.5">
								<ArrowUpRight />
							</span>
						</Link>
					</div>
				</div>
			</div>
		</main>
	);
}
