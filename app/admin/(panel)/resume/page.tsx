import {
	addResumeSection,
	deleteResumeSection,
	saveResumeSections,
	saveResumeTexts,
} from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { resumeSections, resumeTexts } from "@/lib/schema";
import { getTranslations } from "@/lib/lang";
import { asc } from "drizzle-orm";
import { KVForm } from "../text/_components/kv-form";
import { ResumeColumns } from "./resume-columns";

const card =
	"flex flex-col gap-3 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const groupTitle = "text-[11px] font-bold uppercase tracking-[0.22em] text-foreground";
const delBtn =
	"rounded-lg border border-border/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors hover:border-red-400/60 hover:bg-red-50 hover:text-red-500";
const addBtn =
	"w-full rounded-xl border-2 border-foreground bg-foreground px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-background transition-all hover:bg-foreground/90 active:scale-[0.98]";

type Sec = typeof resumeSections.$inferSelect;

function BlocksColumn({ part, sections }: { part: "sidebar" | "main"; sections: Sec[] }) {
	return (
		<div className="flex flex-col gap-4">
			{sections.length === 0 && (
				<p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
					Пока нет блоков. Добавьте первый ↓
				</p>
			)}

			{sections.map((s, idx) => (
				<div key={s.id} className={card}>
					<div className="flex items-center justify-between">
						<span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">#{idx + 1}</span>
						<form action={deleteResumeSection}>
							<input type="hidden" name="id" value={s.id} />
							<button type="submit" className={delBtn}>Удалить</button>
						</form>
					</div>
					<KVForm
						fields={[
							{ key: `rsec_${s.id}_title`, label: "Заголовок", value: s.title, enValue: s.title_en ?? "", deValue: s.title_de ?? "" },
							{
								key: `rsec_${s.id}_body`,
								label: "Текст. Строка с # — подзаголовок · одна строка — абзац · несколько строк — список",
								value: s.body,
								enValue: s.body_en ?? "",
								deValue: s.body_de ?? "",
								multiline: true,
								rows: 9,
							},
						]}
						action={saveResumeSections}
					/>
				</div>
			))}

			<form action={addResumeSection}>
				<input type="hidden" name="part" value={part} />
				<button type="submit" className={addBtn}>+ Добавить блок</button>
			</form>
		</div>
	);
}

export default async function AdminResumePage() {
	const [rows, textRows, tRu, tEn, tDe] = await Promise.all([
		db.select().from(resumeSections).orderBy(asc(resumeSections.sort_order), asc(resumeSections.id)),
		db.select().from(resumeTexts),
		getTranslations("ru"),
		getTranslations("en"),
		getTranslations("de"),
	]);

	const texts = Object.fromEntries(textRows.map((r) => [r.key, r.value]));
	const val = (key: string, fbRu: string, fbEn: string, fbDe: string) => ({
		value: texts[key] ?? fbRu ?? "",
		enValue: texts[`${key}__en`] ?? fbEn ?? "",
		deValue: texts[`${key}__de`] ?? fbDe ?? "",
	});

	const sidebar = rows.filter((r) => r.part === "sidebar");
	const main = rows.filter((r) => r.part === "main");

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5">
				<p className={groupTitle}>Резюме</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Резюме собирается из блоков: заголовок + текст. Внутри текста можно делать подзаголовки —
					начни строку с <span className="font-mono font-semibold text-foreground">#</span>. Одна строка — абзац,
					несколько подряд — список. Слева тёмная колонка, справа светлая, язык RU/EN в каждом поле.
				</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="mb-8 flex flex-col gap-3">
					<p className={groupTitle}>Шапка (имя и должность)</p>
					<div className={card}>
						<KVForm
							fields={[
								{ key: "resume_name", label: "Имя и фамилия", ...val("resume_name", tRu.resume_name, tEn.resume_name, tDe.resume_name) },
								{ key: "resume_role", label: "Должность (под именем)", ...val("resume_role", tRu.resume_role, tEn.resume_role, tDe.resume_role) },
								{ key: "resume_more_info", label: "Сноска внизу справа (перед ссылкой на сайт)", ...val("resume_more_info", tRu.resume_more_info, tEn.resume_more_info, tDe.resume_more_info) },
							]}
							action={saveResumeTexts}
						/>
					</div>
				</div>

				<ResumeColumns
					leftTitle="Левый блок (тёмный)"
					rightTitle="Правый блок (светлый)"
					left={<BlocksColumn part="sidebar" sections={sidebar} />}
					right={<BlocksColumn part="main" sections={main} />}
				/>
			</div>
		</div>
	);
}
