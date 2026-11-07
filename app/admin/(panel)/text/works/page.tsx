import { savePageHero, saveWorksTexts } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { pageHeroes, workHowDone, workItems, workTags, workWhatIDid, worksTexts } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";
import { WorkItemForm } from "./work-item-form";

const card = "flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const badge = "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background";

const SIDEBAR_KEYS = ["sidebar_title", "search_label", "search_input_label", "search_placeholder", "all_works_label"] as const;
const SIDEBAR_LABELS: Record<string, string> = {
	sidebar_title: "Заголовок сайдбара",
	search_label: "Поиск — лейбл",
	search_input_label: "Поиск — лейбл инпута",
	search_placeholder: "Поиск — плейсхолдер",
	all_works_label: "Все работы",
};

const AI_KEYS = ["ai_block_label", "ai_block_text"] as const;
const AI_LABELS: Record<string, string> = {
	ai_block_label: "Лейбл (мелкий текст)",
	ai_block_text: "Основной текст",
};
const AI_DEFAULTS: Record<string, string> = {
	ai_block_label: "AI-АССИСТЕНТ",
	ai_block_text: "Задать вопрос по этой работе",
};

export default async function AdminTextWorksPage() {
	const [hero, texts, heroEnRows, heroDeRows, works, tags, whatIDids, howDones] = await Promise.all([
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "works")),
		db.select().from(worksTexts),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "works__en")),
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "works__de")),
		db.select().from(workItems).orderBy(asc(workItems.sort_order)),
		db.select().from(workTags),
		db.select().from(workWhatIDid),
		db.select().from(workHowDone),
	]);

	const saveHero = savePageHero.bind(null, "works");
	const h = hero[0];
	const hEn = heroEnRows[0];
	const hDe = heroDeRows[0];
	const t = Object.fromEntries(texts.map((r) => [r.key, r.value]));
	const en = (key: string) => t[`${key}__en`] ?? "";
	const de = (key: string) => t[`${key}__de`] ?? "";

	const sidebarFields = SIDEBAR_KEYS.map((key) => ({
		key,
		label: SIDEBAR_LABELS[key],
		value: t[key] ?? "",
		enValue: en(key),
		deValue: de(key),
	}));

	const aiFields = AI_KEYS.map((key) => ({
		key,
		label: AI_LABELS[key],
		value: t[key] ?? AI_DEFAULTS[key] ?? "",
		enValue: en(key),
		deValue: de(key),
	}));

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Работы" description="Шапка страницы и тексты интерфейса" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">

					{/* ── Header ── */}
					{h && (
						<div className={card}>
							<div className="flex items-center gap-3">
								<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">H</span>
								<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">/works</span>
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

					{/* ── Sidebar ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>≡</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">боковая панель</span>
						</div>
						<KVForm fields={sidebarFields} action={saveWorksTexts} />
					</div>

					{/* ── AI block on the work page ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>✦</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">→ /works/[id]</span>
						</div>
						<KVForm fields={aiFields} action={saveWorksTexts} />
					</div>

					{/* ── Work texts ── */}
					{works.length > 0 && (
						<div className="flex flex-col gap-3">
							<p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Тексты работ
							</p>
							{works.map((w) => (
								<WorkItemForm
									key={w.id}
									id={w.id}
									title={w.title}
									title_en={w.title_en}
									title_de={w.title_de}
									description={w.description}
									description_en={w.description_en}
									description_de={w.description_de}
									overview={w.overview}
									overview_en={w.overview_en}
									overview_de={w.overview_de}
									tags={tags.filter((t) => t.work_id === w.id).sort((a, b) => a.sort_order - b.sort_order).map((t) => t.tag)}
									whatIDid={whatIDids.filter((d) => d.work_id === w.id).sort((a, b) => a.sort_order - b.sort_order).map((d) => d.text)}
									howDone={howDones.filter((d) => d.work_id === w.id).sort((a, b) => a.sort_order - b.sort_order).map((d) => d.text)}
									results={[]}
								/>
							))}
						</div>
					)}

				</div>
			</div>
		</div>
	);
}
