import { saveHomeTexts } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { homeTexts } from "@/lib/schema";
import Link from "next/link";
import { BadgesEditor } from "../_components/badges-editor";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

export default async function AdminTextHomePage() {
	const texts = await db.select().from(homeTexts);
	const t = Object.fromEntries(texts.map((r) => [r.key, r.value]));
	const hasKey = (key: string) => texts.some((r) => r.key === key);

	const getBadges = (block: string, fallback: string[]) => {
		const key = `${block}_badges`;
		if (!hasKey(key)) return fallback;
		return (t[key] ?? "").split("\n").map((b) => b.trim()).filter(Boolean);
	};

	const en = (key: string) => t[`${key}__en`] ?? "";

	const de = (key: string) => t[`${key}__de`] ?? "";

	const worksBadges  = getBadges("works",  [t.works_subtitle ?? "ПРОЕКТЫ"]);
	const resumeBadges = getBadges("resume", [t.resume_badge   ?? "CV · PDF"]);
	const aboutBadges  = getBadges("about",  [t.contacts_title ?? "КОНТАКТЫ", t.stack_title ?? "СТЕК"]);

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Главная" description="Текст по блокам страницы" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-8">

					{/* ── General ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">★</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Общий текст</h3>
						</div>
						<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">Применяется к блокам Работы и Резюме</p>
						<KVForm
							fields={[{ key: "cta_label", label: "CTA лейбл (мелкий текст на каждом блоке)", value: t.cta_label ?? "", enValue: en("cta_label"), deValue: de("cta_label") }]}
							action={saveHomeTexts}
						/>
					</section>
					<hr className="border-border/50" />

					{/* ── Block 1: Works ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">1</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Блок Работы</h3>
							<span className="font-mono text-[9px] text-muted-foreground/40">→ /works</span>
						</div>
						<KVForm
							fields={[
								{ key: "works_title",       label: "Заголовок",  value: t.works_title ?? "",       enValue: en("works_title"), deValue: de("works_title") },
								{ key: "works_description", label: "Описание",   value: t.works_description ?? "", enValue: en("works_description"), deValue: de("works_description"), multiline: true },
							]}
							action={saveHomeTexts}
						/>
						<BadgesEditor block="works" badges={worksBadges} label="Бейджи" />
					</section>
					<hr className="border-border/50" />

					{/* ── Block 2: Resume ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">2</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Блок Резюме</h3>
							<span className="font-mono text-[9px] text-muted-foreground/40">→ /resume</span>
						</div>
						<KVForm
							fields={[
								{ key: "resume_title",       label: "Заголовок",  value: t.resume_title ?? "",       enValue: en("resume_title"), deValue: de("resume_title") },
								{ key: "resume_description", label: "Описание",   value: t.resume_description ?? "", enValue: en("resume_description"), deValue: de("resume_description"), multiline: true },
							]}
							action={saveHomeTexts}
						/>
						<BadgesEditor block="resume" badges={resumeBadges} label="Бейджи" />
					</section>
					<hr className="border-border/50" />

					{/* ── Block 3: About me ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">3</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Блок Обо мне</h3>
							<span className="font-mono text-[9px] text-muted-foreground/40">→ /about</span>
						</div>
						<KVForm
							fields={[
								{ key: "about_title",       label: "Лейбл (левый верхний)",    value: t.about_title ?? "",       enValue: en("about_title"), deValue: de("about_title") },
								{ key: "about_description", label: "Описание (крупный текст)",  value: t.about_description ?? "", enValue: en("about_description"), deValue: de("about_description"), multiline: true },
							]}
							action={saveHomeTexts}
						/>
						<BadgesEditor block="about" badges={aboutBadges} label="Бейджи (правый верхний угол)" />
					</section>
					<hr className="border-border/50" />

					{/* ── Block 4: Signature ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">4</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Подпись внизу</h3>
						</div>
						<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">Маленький блок под работами и резюме</p>
						<KVForm
							fields={[{ key: "disclaimer", label: "Текст", value: t.disclaimer ?? "", enValue: en("disclaimer"), deValue: de("disclaimer"), multiline: true }]}
							action={saveHomeTexts}
						/>
					</section>
					<hr className="border-border/50" />

					{/* ── Quotes ── */}
					<section className="flex flex-col gap-3">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">❝</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Цитата</h3>
						</div>
						<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">Управляются в отдельном разделе, меняются каждые 10 сек</p>
						<Link
							href="/admin/text/quotes"
							className="ml-9 inline-flex w-max items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:border-foreground/30 hover:bg-muted/30"
						>
							Перейти к цитатам →
						</Link>
					</section>

				</div>
			</div>
		</div>
	);
}
