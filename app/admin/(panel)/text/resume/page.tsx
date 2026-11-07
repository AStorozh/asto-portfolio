import { savePageHero, saveResumeTexts } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { pageHeroes, resumeTexts } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

const card = "flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const badge = "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background";

export default async function AdminTextResumePage() {
	const [hero, texts, heroEnRows, heroDeRows] = await Promise.all([
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "resume")),
		db.select().from(resumeTexts),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "resume__en")),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "resume__de")),
	]);

	const saveHero = savePageHero.bind(null, "resume");
	const h = hero[0];
	const hEn = heroEnRows[0];
	const hDe = heroDeRows[0];
	const t = Object.fromEntries(texts.map((r) => [r.key, r.value]));
	const en = (key: string) => t[`${key}__en`] ?? "";
	const de = (key: string) => t[`${key}__de`] ?? "";

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Резюме" description="Шапка и блоки страницы" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">

					{/* ── Header ── */}
					{h && (
						<div className={card}>
							<div className="flex items-center gap-3">
								<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">H</span>
								<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">/resume</span>
							</div>
							<KVForm
								fields={[
									{ key: "label",    label: "Лейбл (мелкий текст сверху)", value: h.label,          enValue: hEn?.label ?? "",    deValue: hDe?.label ?? "" },
									{ key: "title",    label: "Заголовок",                    value: h.title,          enValue: hEn?.title ?? "",    deValue: hDe?.title ?? "" },
									{ key: "subtitle", label: "Подзаголовок (справа)",         value: h.subtitle ?? "", enValue: hEn?.subtitle ?? "", deValue: hDe?.subtitle ?? "" },
								]}
								action={saveHero}
							/>
						</div>
					)}

					{/* ── Block 1: Open on the web ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>1</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">→ /resume-file</span>
						</div>
						<KVForm
							fields={[
								{ key: "open_web_label",       label: "Лейбл (мелкий текст сверху)", value: t.open_web_label ?? "",       enValue: en("open_web_label"), deValue: de("open_web_label") },
								{ key: "open_web_title",       label: "Заголовок",                    value: t.open_web_title ?? "",       enValue: en("open_web_title"), deValue: de("open_web_title") },
							]}
							action={saveResumeTexts}
						/>
					</div>

					{/* ── Block 2: Download the file ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>2</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">скачать PDF</span>
						</div>
						<KVForm
							fields={[
								{ key: "download_label",       label: "Лейбл (мелкий текст сверху)", value: t.download_label ?? "",       enValue: en("download_label"), deValue: de("download_label") },
								{ key: "download_title",       label: "Заголовок",                    value: t.download_title ?? "",       enValue: en("download_title"), deValue: de("download_title") },
							]}
							action={saveResumeTexts}
						/>
					</div>

					{/* ── Block 3: AI assistant ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">3</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">→ /ai-assistant</span>
						</div>
						<KVForm
							fields={[
								{ key: "ai_assistant_label",       label: "Лейбл (мелкий текст сверху)", value: t.ai_assistant_label ?? "",       enValue: en("ai_assistant_label"), deValue: de("ai_assistant_label") },
								{ key: "ai_assistant_title",       label: "Заголовок",                    value: t.ai_assistant_title ?? "",       enValue: en("ai_assistant_title"), deValue: de("ai_assistant_title") },
								{ key: "ai_assistant_description", label: "Описание",                     value: t.ai_assistant_description ?? "", enValue: en("ai_assistant_description"), deValue: de("ai_assistant_description"), multiline: true },
								{ key: "ai_assistant_feature_1",   label: "Чип 1",                        value: t.ai_assistant_feature_1 ?? "",   enValue: en("ai_assistant_feature_1"), deValue: de("ai_assistant_feature_1") },
								{ key: "ai_assistant_feature_2",   label: "Чип 2",                        value: t.ai_assistant_feature_2 ?? "",   enValue: en("ai_assistant_feature_2"), deValue: de("ai_assistant_feature_2") },
								{ key: "ai_assistant_feature_3",   label: "Чип 3",                        value: t.ai_assistant_feature_3 ?? "",   enValue: en("ai_assistant_feature_3"), deValue: de("ai_assistant_feature_3") },
								{ key: "ai_assistant_cta",         label: "Кнопка (CTA)",                 value: t.ai_assistant_cta ?? "",         enValue: en("ai_assistant_cta"), deValue: de("ai_assistant_cta") },
							]}
							action={saveResumeTexts}
						/>
					</div>

				</div>
			</div>
		</div>
	);
}
