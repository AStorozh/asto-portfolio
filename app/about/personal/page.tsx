import Link from "next/link";
import { getAboutBlockText, getPersonalGalleryImages } from "@/lib/content";
import { getLang, getTranslations } from "@/lib/lang";
import { PersonalGalleryGrid } from "./personal-gallery-grid";
import { GalleryEnd, GalleryNotes } from "./gallery-notes";
import { parseGalleryNotes } from "./gallery-notes-parse";

export default async function PersonalGalleryPage() {
	const [items, lang] = await Promise.all([getPersonalGalleryImages(), getLang()]);
	const notes = parseGalleryNotes(await getAboutBlockText("galereya", lang));
	const t = await getTranslations(lang);
	const emptyText =
		lang === "en" ? "No photos or videos yet" : lang === "de" ? "Noch keine Fotos oder Videos" : "Фото и видео ещё не добавлены";

	return (
		<main
			className="min-h-[calc(100dvh-4rem)] overflow-x-clip px-5 py-5"
			aria-label={t.about_galereya}
		>
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-5 min-[1360px]:max-w-[min(64rem,calc(100vw-30rem))]">
				<Link
					href="/about"
					className="inline-flex w-max items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-foreground shadow-sm transition-[transform,background-color] hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
					aria-label={t.about_aria_back}
				>
					<span aria-hidden>‹</span>
					<span>{t.about_back}</span>
				</Link>

				<section className="rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] p-5 sm:p-6">
					<p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">{t.about_page_label}</p>
					<h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.about_galereya}</h1>
				</section>

				{items.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
				) : (
					<div className="relative">
						<PersonalGalleryGrid items={items} />
						<GalleryNotes notes={notes} />
					</div>
				)}
				{items.length > 0 && (
					<GalleryEnd text={lang === "en" ? "To be continued…" : lang === "de" ? "Fortsetzung folgt…" : "Продолжение следует…"} />
				)}
			</div>
		</main>
	);
}
