import { Fragment } from "react";
import {
	saveContactMethods,
	saveContactsTexts,
	savePageHero,
} from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { contactMethods, contactsTexts, pageHeroes } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

export default async function AdminTextContactsPage() {
	const [hero, texts, methods, heroEnRows, heroDeRows] = await Promise.all([
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "contacts")),
		db.select().from(contactsTexts),
		db.select().from(contactMethods).orderBy(asc(contactMethods.sort_order)),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "contacts__en")),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "contacts__de")),
	]);

	const saveHero = savePageHero.bind(null, "contacts");
	const h = hero[0];
	const hEn = heroEnRows[0];
	const hDe = heroDeRows[0];
	const textsMap = Object.fromEntries(texts.map((t) => [t.key, t.value]));
	const en = (key: string) => textsMap[`${key}__en`] ?? "";
	const de = (key: string) => textsMap[`${key}__de`] ?? "";

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Контакты" description="Шапка, способы связи и блок AI-ассистента" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-8">

					{/* ── Block 1: Page header ── */}
					{h && (
						<>
							<section className="flex flex-col gap-4">
								<div className="flex items-center gap-3">
									<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">1</span>
									<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										Шапка страницы
									</h3>
								</div>
								<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">
									Верхний блок с названием страницы
								</p>
								<KVForm
									fields={[
										{ key: "label",    label: "Лейбл (мелкий текст сверху)", value: h.label,          enValue: hEn?.label ?? "",    deValue: hDe?.label ?? "" },
										{ key: "title",    label: "Заголовок",                    value: h.title,          enValue: hEn?.title ?? "",    deValue: hDe?.title ?? "" },
										{ key: "subtitle", label: "Подзаголовок (справа)",         value: h.subtitle ?? "", enValue: hEn?.subtitle ?? "", deValue: hDe?.subtitle ?? "" },
									]}
									action={saveHero}
								/>
							</section>
							<hr className="border-border/50" />
						</>
					)}

					{/* ── Common text (CTA) ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">★</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Общий текст (применяется ко всем блокам)
							</h3>
						</div>
						<KVForm
							fields={[
								{
									key: "cta_label",
									label: "CTA лейбл (мелкий текст на каждом блоке)",
									value: textsMap.cta_label ?? "",
									enValue: en("cta_label"), deValue: de("cta_label"),
								},
							]}
							action={saveContactsTexts}
						/>
					</section>
					<hr className="border-border/50" />

					{/* ── Contact blocks ── */}
					{methods.map((m, idx) => (
						<Fragment key={m.id}>
							<section className="flex flex-col gap-4">
								<div className="flex items-center gap-3">
									<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
										{idx + 2}
									</span>
									<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										Блок контакта — {m.platform || m.slug.toUpperCase()}
									</h3>
								</div>
								<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">
									Карточка контакта #{idx + 1} на странице
								</p>
								<KVForm
									fields={[
										{
											key: `method_${m.id}_platform`,
											label: "Платформа (крупный заголовок)",
											value: m.platform,
										},
										{
											key: `method_${m.id}_title`,
											label: "Подпись (мелкий текст справа)",
											value: m.title,
											enValue: m.title_en ?? "",
											deValue: m.title_de ?? "",
										},
										{
											key: `method_${m.id}_href`,
											label: "Ссылка / URL",
											value: m.href,
										},
									]}
									action={saveContactMethods}
								/>
							</section>
							<hr className="border-border/50" />
						</Fragment>
					))}

					{/* ── Last block: AI assistant ── */}
					<section className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
								{methods.length + 2}
							</span>
							<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Блок AI-ассистента
							</h3>
						</div>
						<p className="text-xs text-muted-foreground/70 -mt-2 ml-9">
							Последняя золотая карточка внизу страницы
						</p>
						<KVForm
							fields={[
								{
									key: "ai_assistant_label",
									label: "Заголовок (крупный текст)",
									value: textsMap.ai_assistant_label ?? "",
									enValue: en("ai_assistant_label"), deValue: de("ai_assistant_label"),
								},
								{
									key: "ai_assistant_description",
									label: "Подпись (мелкий текст справа)",
									value: textsMap.ai_assistant_description ?? "",
									enValue: en("ai_assistant_description"), deValue: de("ai_assistant_description"),
								},
							]}
							action={saveContactsTexts}
						/>
					</section>

				</div>
			</div>
		</div>
	);
}
