"use client";

import { useEffect, useRef, useState } from "react";
import { translateTextToEn } from "@/app/actions/translate-action";
import { WorkContent, workContentIsEmpty } from "@/lib/work-content";
import { CHART_KINDS, CHART_TEMPLATES } from "@/lib/work-chart-kinds";

type EditLang = "ru" | "en" | "de";

// Editor for the "About the project" block of a work: light markup (headings, lists,
// **bold**) with a live preview and a language switcher. Values of all three
// languages always live in hidden inputs (overview/overview_en/overview_de),
// so the server actions createWork/updateWork stay unchanged.
export function WorkOverviewEditor({
	initialRu = "",
	initialEn = "",
	initialDe = "",
	resetSignal = 0,
}: {
	initialRu?: string;
	initialEn?: string;
	initialDe?: string;
	resetSignal?: number;
}) {
	const [valueRu, setValueRu] = useState(initialRu);
	const [valueEn, setValueEn] = useState(initialEn);
	const [valueDe, setValueDe] = useState(initialDe);
	const [lang, setLang] = useState<EditLang>("ru");
	const [showHelp, setShowHelp] = useState(false);
	const [translating, setTranslating] = useState(false);
	const [translateError, setTranslateError] = useState<string | null>(null);
	const taRef = useRef<HTMLTextAreaElement>(null);

	// Reset after a work is created (the parent increments resetSignal).
	useEffect(() => {
		if (resetSignal > 0) {
			setValueRu("");
			setValueEn("");
			setValueDe("");
			setLang("ru");
		}
	}, [resetSignal]);

	const value = lang === "ru" ? valueRu : lang === "en" ? valueEn : valueDe;
	const setValue = lang === "ru" ? setValueRu : lang === "en" ? setValueEn : setValueDe;

	function handleTranslate() {
		setTranslateError(null);
		setTranslating(true);
		(async () => {
			const res = await translateTextToEn(valueRu);
			if (res.ok) {
				setValueEn(res.text ?? "");
				setLang("en");
			} else {
				setTranslateError(res.error ?? "Не удалось перевести.");
			}
			setTranslating(false);
		})();
	}

	// Adds a prefix to the start of each selected line (heading / list).
	function prefixLines(prefix: string) {
		const ta = taRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const before = value.slice(0, start);
		const lineStart = before.lastIndexOf("\n") + 1;
		const head = value.slice(0, lineStart);
		const body = value.slice(lineStart, end);
		const rest = value.slice(end);
		const transformed = body
			.split("\n")
			.map((line) => (line.startsWith(prefix) ? line : prefix + line))
			.join("\n");
		setValue(head + transformed + rest);
		queueMicrotask(() => {
			ta.focus();
			ta.selectionStart = lineStart;
			ta.selectionEnd = lineStart + transformed.length;
		});
	}

	// Wraps the selection in a pair of markers (**bold**).
	function wrap(mark: string, placeholder: string) {
		const ta = taRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const selected = value.slice(start, end) || placeholder;
		const next = value.slice(0, start) + mark + selected + mark + value.slice(end);
		setValue(next);
		queueMicrotask(() => {
			ta.focus();
			ta.selectionStart = start + mark.length;
			ta.selectionEnd = start + mark.length + selected.length;
		});
	}

	// Inserts a chart template as a separate block at the cursor.
	function insertBlock(block: string) {
		const ta = taRef.current;
		const at = ta ? ta.selectionEnd : value.length;
		const before = value.slice(0, at).replace(/\s*$/, "");
		const after = value.slice(at).replace(/^\s*/, "");
		const head = before ? before + "\n\n" : "";
		const next = head + block + (after ? "\n\n" + after : "\n");
		setValue(next);
		queueMicrotask(() => {
			if (!ta) return;
			ta.focus();
			ta.selectionStart = head.length;
			ta.selectionEnd = head.length + block.length;
		});
	}

	const empty = workContentIsEmpty(value);

	return (
		<div className="flex flex-col gap-2.5">
			{/* Hidden fields - included in the work form's FormData */}
			<input type="hidden" name="overview" value={valueRu} readOnly />
			<input type="hidden" name="overview_en" value={valueEn} readOnly />
			<input type="hidden" name="overview_de" value={valueDe} readOnly />

			{/* Language switcher + auto-translate */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="inline-flex rounded-xl border border-border/70 bg-background p-0.5">
					{(["ru", "en", "de"] as const).map((l) => (
						<button
							key={l}
							type="button"
							onClick={() => setLang(l)}
							className={`inline-flex h-7 items-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
								lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
							}`}
						>
							{l}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={handleTranslate}
					disabled={translating || !valueRu.trim()}
					title="Перевести русский текст и заполнить английское поле"
					className="inline-flex h-7 items-center gap-1.5 rounded-xl border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted/40 disabled:opacity-40"
				>
					{translating ? (
						<>
							<span className="inline-block h-3 w-3 animate-spin rounded-full border border-foreground/30 border-t-foreground" />
							Перевожу…
						</>
					) : (
						<>🌐 RU → EN</>
					)}
				</button>

				{translateError && <span className="text-[11px] font-medium text-red-600">{translateError}</span>}
				{lang === "en" && !valueEn.trim() && (
					<span className="text-[11px] text-muted-foreground/70">EN пусто — покажется русский</span>
				)}
				{lang === "de" && !valueDe.trim() && (
					<span className="text-[11px] text-muted-foreground/70">DE пусто — покажется русский</span>
				)}
			</div>

			{/* Formatting toolbar */}
			<div className="flex flex-wrap items-center gap-1.5">
				<ToolbarButton onClick={() => prefixLines("## ")}>Заголовок</ToolbarButton>
				<ToolbarButton onClick={() => prefixLines("### ")}>Подзаголовок</ToolbarButton>
				<ToolbarButton onClick={() => prefixLines("- ")}>Список</ToolbarButton>
				<span className="mx-0.5 h-5 w-px bg-border" />
				<ToolbarButton onClick={() => wrap("**", "ключевое")}>
					<span className="font-bold">B</span>
				</ToolbarButton>
				<span className="mx-0.5 h-5 w-px bg-border" />
				<select
					value=""
					onChange={(e) => {
						const k = e.target.value as (typeof CHART_KINDS)[number];
						if (k) insertBlock(CHART_TEMPLATES[k].text);
					}}
					className="h-7 rounded-lg border border-border/70 bg-background px-2 text-[11px] font-medium text-foreground outline-none transition-colors hover:border-foreground"
				>
					<option value="">+ График или схема…</option>
					{CHART_KINDS.map((k) => (
						<option key={k} value={k}>
							{CHART_TEMPLATES[k].label}
						</option>
					))}
				</select>
				<button
					type="button"
					onClick={() => setShowHelp((v) => !v)}
					className="ml-auto text-[11px] font-medium text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
				>
					{showHelp ? "Скрыть подсказку" : "Как форматировать?"}
				</button>
			</div>

			{showHelp && (
				<div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
					<p className="mb-1.5 font-semibold text-foreground/80">Шпаргалка по разметке</p>
					<ul className="grid gap-1 sm:grid-cols-2">
						<li><code className="font-mono">## Заголовок</code> — заголовок раздела</li>
						<li><code className="font-mono">### Подзаголовок</code> — заголовок помельче</li>
						<li><code className="font-mono">- пункт</code> — элемент списка</li>
						<li><code className="font-mono">**жирным**</code> — выделить ключевое</li>
						<li className="sm:col-span-2">Пустая строка разделяет абзацы.</li>
						<li className="sm:col-span-2">
							<code className="font-mono">```bars</code> … <code className="font-mono">```</code> — график. Виды: stats (цифры),
							bars (столбцы), columns (колонки), donut (кольцо), progress (проценты), line (линия), flow (шаги),
							compare (было → стало), funnel (воронка), timeline (хронология), waffle (сетка 100), layers (слои),
							stacked (доли), radar (паутинка), gauge (спидометр), heatmap (тепловая карта), tree (дерево, вложенность через «-»),
							cycle (цикл), checklist (чек-лист, «-» = не сделано), scatter (точки «x, y»),
							sparklines (мини-графики «3 5 8»), network и sequence (связи «A -&gt; B | подпись»). Внутри: строка
							<code className="font-mono"> # заголовок</code> и строки <code className="font-mono">подпись | значение</code>.
							Для stats наоборот: <code className="font-mono">число | подпись</code>.
							<br />
							Звёздочка в конце подписи (<code className="font-mono">Opus *</code>) выделяет строку, строка
							<code className="font-mono"> &gt; вывод</code> даёт подпись под графиком.
							<br />
							Сбоку от текста: <code className="font-mono">```bars right</code> или <code className="font-mono">```bars left</code>. График встанет
							в пару с абзацами, которые идут сразу после него; на телефоне они окажутся друг под другом.
						</li>
					</ul>
				</div>
			)}

			{/* Editor + live preview */}
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<div className="flex flex-col">
					<span className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
						Текст · {lang}
					</span>
					<textarea
						ref={taRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						rows={10}
						placeholder={
							lang === "ru"
								? "## Заголовок раздела\nТекст с **ключевыми** моментами…"
								: lang === "en"
									? "## Section heading\nText with **key** points…"
									: "## Abschnittstitel\nText mit **wichtigen** Punkten…"
						}
						className="min-h-[12rem] flex-1 resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-foreground"
					/>
				</div>

				<div className="flex flex-col">
					<span className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
						Предпросмотр
					</span>
					<div className="min-h-[12rem] flex-1 overflow-auto rounded-2xl border border-foreground/10 bg-muted/30 p-4">
						{empty ? (
							<p className="text-sm text-muted-foreground/60">Здесь появится предпросмотр блока «О проекте».</p>
						) : (
							<WorkContent text={value} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex h-7 items-center rounded-lg border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted/40"
		>
			{children}
		</button>
	);
}
