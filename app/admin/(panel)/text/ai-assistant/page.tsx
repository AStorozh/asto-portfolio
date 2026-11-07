import { saveAiAssistantTexts, saveAiCapabilities, savePageHero } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { aiAssistantTexts, aiCapabilities, pageHeroes } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

const card = "flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const badge = "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background";

export default async function AdminTextAiAssistantPage() {
	const [hero, texts, caps] = await Promise.all([
		db.select().from(pageHeroes).where(eq(pageHeroes.page, "ai_assistant")),
		db.select().from(aiAssistantTexts),
		db.select().from(aiCapabilities).orderBy(asc(aiCapabilities.sort_order)),
	]);

	const saveHero = savePageHero.bind(null, "ai_assistant");
	const h = hero[0];
	const t = Object.fromEntries(texts.map((r) => [r.key, r.value]));

	const f = (key: string, label: string, multiline = false) => ({
		key,
		label,
		value: t[key] ?? "",
		...(multiline ? { multiline } : {}),
	});

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="AI-ассистент" description="Шапка, чат и возможности" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">

					{/* ── Header ── */}
					{h && (
						<div className={card}>
							<div className="flex items-center gap-3">
								<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">H</span>
								<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">/ai-assistant</span>
							</div>
							<KVForm
								fields={[
									{ key: "title", label: "Заголовок", value: h.title },
								]}
								action={saveHero}
							/>
						</div>
					)}

					{/* ── Chat ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>✉</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">сообщения</span>
						</div>
						<KVForm
							fields={[
								f("chat_title",       "Заголовок чата"),
								f("initial_message_1", "Приветственное сообщение 1", true),
								f("initial_message_2", "Приветственное сообщение 2", true),
							]}
							action={saveAiAssistantTexts}
						/>
					</div>

					{/* ── Interface ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>UI</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">кнопки и статусы</span>
						</div>
						<KVForm
							fields={[
								f("send_button",       "Кнопка: отправить"),
								f("thinking_label",    "Статус: думаю"),
								f("call_button",       "Кнопка: позвонить"),
								f("call_active_label", "Статус: звонок активен"),
							]}
							action={saveAiAssistantTexts}
						/>
					</div>

					{/* ── Placeholders ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>_</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">плейсхолдеры инпута</span>
						</div>
						<KVForm
							fields={[
								f("default_placeholder",  "По умолчанию"),
								f("vacancy_placeholder",   "Вакансия"),
								f("task_placeholder",      "Задача"),
								f("market_placeholder",    "Рынок"),
							]}
							action={saveAiAssistantTexts}
						/>
					</div>

					{/* ── Errors ── */}
					<div className={card}>
						<div className="flex items-center gap-3">
							<span className={badge}>!</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">сообщения об ошибках</span>
						</div>
						<KVForm
							fields={[
								f("error_no_response",       "Нет ответа"),
								f("error_no_response_retry", "Нет ответа (повтор)"),
								f("error_no_mic",            "Нет микрофона"),
								f("error_mic_permission",    "Нет доступа к микрофону"),
							]}
							action={saveAiAssistantTexts}
						/>
					</div>

					{/* ── Capabilities ── */}
					{caps.map((c, i) => (
						<div key={c.id} className={card}>
							<div className="flex items-center gap-3">
								<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">{i + 1}</span>
								<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">{c.slug}</span>
							</div>
							<KVForm
								fields={[
									{ key: `cap_${c.id}_title`,       label: "Заголовок",  value: c.title },
									{ key: `cap_${c.id}_description`, label: "Описание",    value: c.description, multiline: true },
								]}
								action={saveAiCapabilities}
							/>
						</div>
					))}

				</div>
			</div>
		</div>
	);
}
