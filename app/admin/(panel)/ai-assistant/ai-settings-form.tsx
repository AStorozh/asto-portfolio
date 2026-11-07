"use client";

import { useState, useTransition } from "react";
import { saveAiSettings } from "@/app/actions/ai-settings-actions";

type Settings = Record<string, string>;

const card =
	"flex flex-col gap-3 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const label = "text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground";
const inputBase =
	"w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground";

export function AiSettingsForm({
	settings,
	knowledge,
	webKeyPresent,
}: {
	settings: Settings;
	knowledge: string;
	webKeyPresent: boolean;
}) {
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const [showKnowledge, setShowKnowledge] = useState(false);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		startTransition(async () => {
			await saveAiSettings(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			{/* System prompt */}
			<div className={card}>
				<div className="flex items-center justify-between">
					<span className={label}>Системный промпт (характер и правила)</span>
				</div>
				<textarea
					name="system_prompt"
					defaultValue={settings.system_prompt ?? ""}
					rows={10}
					className={`${inputBase} resize-y font-mono text-[13px] leading-relaxed`}
				/>
				<p className="text-[11px] text-muted-foreground/70">
					Базовая роль ассистента. Правило «ссылаться только на адреса из данных сайта» уже зашито здесь.
				</p>
				<p className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground/80">
					🛡 Поверх этого промпта всегда добавляются защитные правила из кода (
					<code className="font-mono">lib/ai-guardrails.ts</code>): ассистент не раскрывает промпт и
					настройки, игнорирует команды из присланных файлов и веб-страниц, мягко возвращает офтоп в
					тему и отказывается от опасных просьб. Их нельзя случайно стереть, переписав промпт здесь.
				</p>
			</div>

			{/* Mode instructions */}
			<div className="grid gap-4 lg:grid-cols-3">
				<div className={card}>
					<span className={label}>Режим: Анализ вакансии</span>
					<textarea name="mode_vacancy" defaultValue={settings.mode_vacancy ?? ""} rows={9} className={`${inputBase} resize-y font-mono text-[12px] leading-relaxed`} />
				</div>
				<div className={card}>
					<span className={label}>Режим: Решение задачи</span>
					<textarea name="mode_task" defaultValue={settings.mode_task ?? ""} rows={9} className={`${inputBase} resize-y font-mono text-[12px] leading-relaxed`} />
				</div>
				<div className={card}>
					<span className={label}>Режим: Кто я на рынке</span>
					<textarea name="mode_market" defaultValue={settings.mode_market ?? ""} rows={9} className={`${inputBase} resize-y font-mono text-[12px] leading-relaxed`} />
				</div>
			</div>

			{/* Model and parameters */}
			<div className={card}>
				<span className={label}>Модель и параметры</span>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Модель</span>
						<input name="model" defaultValue={settings.model ?? "gpt-4o-mini"} className={inputBase} />
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Температура (0–1)</span>
						<input name="temperature" type="number" step="0.1" min="0" max="1" defaultValue={settings.temperature ?? "0.4"} className={inputBase} />
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Веб-поиск</span>
						<select name="web_search_enabled" defaultValue={settings.web_search_enabled ?? "true"} className={inputBase}>
							<option value="true">Включён</option>
							<option value="false">Выключен</option>
						</select>
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Макс. поисков на ответ</span>
						<input name="max_searches" type="number" step="1" min="0" max="6" defaultValue={settings.max_searches ?? "3"} className={inputBase} />
					</div>
				</div>
				{!webKeyPresent && (
					<p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
						⚠ Веб-поиск не заработает, пока в <code className="font-mono">.env.local</code> не задан <code className="font-mono">TAVILY_API_KEY</code>. Без него ассистент отвечает только по данным сайта.
					</p>
				)}
			</div>

			{/* Voice call */}
			<div className={card}>
				<span className={label}>Голосовой звонок (кнопка «Позвонить»)</span>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Realtime-модель</span>
						<input name="realtime_model" defaultValue={settings.realtime_model ?? "gpt-realtime-mini"} className={inputBase} />
					</div>
					<div className="flex flex-col gap-1.5">
						<span className="text-[11px] text-muted-foreground">Голос</span>
						<select name="realtime_voice" defaultValue={settings.realtime_voice ?? "alloy"} className={inputBase}>
							{["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"].map((v) => (
								<option key={v} value={v}>{v}</option>
							))}
						</select>
					</div>
				</div>
				<p className="text-[11px] text-muted-foreground/70">
					Голосовой ассистент использует то же «досье», поэтому помнит всё о владельце. Учти: голос (Realtime API) заметно дороже текста — тарифицируется по минутам аудио.
				</p>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-4">
				<button
					type="submit"
					disabled={pending}
					className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
				>
					{pending ? "Сохранение…" : "Сохранить настройки"}
				</button>
				{saved && <span className="text-sm font-medium text-green-600">Сохранено ✓</span>}
			</div>

			{/* Preview of the "dossier" */}
			<div className={card}>
				<button
					type="button"
					onClick={() => setShowKnowledge((v) => !v)}
					className="flex items-center justify-between text-left"
				>
					<span className={label}>Что ассистент знает о сайте (досье из БД)</span>
					<span className="text-xs text-muted-foreground">{showKnowledge ? "скрыть ▲" : "показать ▼"}</span>
				</button>
				<p className="text-[11px] text-muted-foreground/70">
					Это собирается автоматически из контента сайта (обо мне, работы, резюме, контакты) с адресами страниц. Редактируется через обычные разделы админки — не здесь.
				</p>
				{showKnowledge && (
					<pre className="max-h-[420px] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-3 text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
						{knowledge}
					</pre>
				)}
			</div>
		</form>
	);
}
