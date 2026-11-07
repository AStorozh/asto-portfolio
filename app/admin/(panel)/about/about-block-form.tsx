"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { saveAboutBlockText } from "@/app/actions/about-actions";
import { translateTextToEn } from "@/app/actions/translate-action";
import { AboutContent, aboutContentIsEmpty } from "@/lib/about-content";

type EditLang = "ru" | "en" | "de";

export function AboutBlockTextForm({
	slug,
	title,
	content,
	contentEn,
	contentDe,
}: {
	slug: string;
	title: string;
	content: string;
	contentEn: string;
	contentDe: string;
}) {
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const [valueRu, setValueRu] = useState(content);
	const [valueEn, setValueEn] = useState(contentEn);
	const [valueDe, setValueDe] = useState(contentDe);
	const [lang, setLang] = useState<EditLang>("ru");
	const [translating, setTranslating] = useState(false);
	const [translateError, setTranslateError] = useState<string | null>(null);
	const [showHelp, setShowHelp] = useState(false);
	const taRef = useRef<HTMLTextAreaElement>(null);

	// The editor works with the text of the active language; all versions are saved on submit.
	const value = lang === "ru" ? valueRu : lang === "en" ? valueEn : valueDe;
	const setValue = lang === "ru" ? setValueRu : lang === "en" ? setValueEn : setValueDe;

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData();
		fd.set("slug", slug);
		fd.set("content", valueRu);
		fd.set("content_en", valueEn);
		fd.set("content_de", valueDe);
		startTransition(async () => {
			await saveAboutBlockText(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		});
	}

	// Auto-translate RU → EN: fills the English field and switches to it.
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

	// Adds a prefix to the start of each selected line (heading, list, callout).
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

	// Inserts a ready-made block on separate lines at the cursor position.
	function insertSnippet(snippet: string) {
		const ta = taRef.current;
		if (!ta) return;
		const start = ta.selectionStart;
		const before = value.slice(0, start);
		const after = value.slice(start);
		const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
		const trail = after.startsWith("\n") || after === "" ? "" : "\n";
		const insert = lead + snippet + trail;
		setValue(before + insert + after);
		queueMicrotask(() => {
			ta.focus();
			const pos = start + insert.length;
			ta.selectionStart = ta.selectionEnd = pos;
		});
	}

	// Wraps the selection in a pair of markers (bold / emphasis).
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

	const empty = aboutContentIsEmpty(value);

	return (
		<form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col gap-4">
			{/* Language switcher + auto-translate */}
			<div className="flex shrink-0 flex-wrap items-center gap-2">
				<div className="inline-flex rounded-xl border border-border/70 bg-background p-0.5">
					{(["ru", "en", "de"] as const).map((l) => (
						<button
							key={l}
							type="button"
							onClick={() => setLang(l)}
							className={`inline-flex h-8 items-center rounded-lg px-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors ${
								lang === l
									? "bg-foreground text-background"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{l === "ru" ? "Русский" : l === "en" ? "English" : "Deutsch"}
						</button>
					))}
				</div>

				<button
					type="button"
					onClick={handleTranslate}
					disabled={translating || !valueRu.trim()}
					title="Перевести русский текст и заполнить английское поле"
					className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted/40 disabled:opacity-40"
				>
					{translating ? (
						<>
							<span className="inline-block h-3 w-3 animate-spin rounded-full border border-foreground/30 border-t-foreground" />
							Перевожу…
						</>
					) : (
						<>🌐 Перевести RU → EN</>
					)}
				</button>

				{translateError && (
					<span className="text-[11px] font-medium text-red-600">{translateError}</span>
				)}
				{lang === "en" && !valueEn.trim() && (
					<span className="text-[11px] text-muted-foreground/70">
						EN пусто — на сайте покажется русский текст
					</span>
				)}
				{lang === "de" && !valueDe.trim() && (
					<span className="text-[11px] text-muted-foreground/70">
						DE пусто — на сайте покажется русский текст
					</span>
				)}
			</div>

			{/* Formatting toolbar */}
			<div className="flex shrink-0 flex-wrap items-center gap-1.5">
				<ToolbarButton onClick={() => prefixLines("## ")}>Заголовок</ToolbarButton>
				<ToolbarButton onClick={() => prefixLines("- ")}>Список</ToolbarButton>
				<ToolbarButton onClick={() => prefixLines("> ")}>Выноска</ToolbarButton>
				<ToolbarButton onClick={() => insertSnippet(":quote: Текст цитаты — Автор")}>
					Цитата
				</ToolbarButton>
				<ToolbarButton
					onClick={() => insertSnippet(":stat: ~1 год | официального опыта\n:stat: 100k+ | строк данных\n:stat: 10+ | проектов")}
				>
					Цифры
				</ToolbarButton>
				<ToolbarButton onClick={() => insertSnippet(":tags: Python, PostgreSQL, Excel")}>
					Теги
				</ToolbarButton>
				<ToolbarButton onClick={() => insertSnippet("---")}>Разделитель</ToolbarButton>
				<span className="mx-1 h-5 w-px bg-border" />
				<ToolbarButton onClick={() => wrap("**", "текст")}>
					<span className="font-bold">B</span>
				</ToolbarButton>
				<button
					type="button"
					onClick={() => setShowHelp((v) => !v)}
					className="ml-auto text-[11px] font-medium text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
				>
					{showHelp ? "Скрыть подсказку" : "Как форматировать?"}
				</button>
			</div>

			{showHelp && (
				<div className="shrink-0 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
					<p className="mb-1.5 font-semibold text-foreground/80">Шпаргалка по разметке</p>
					<ul className="grid gap-1 sm:grid-cols-2">
						<li><code className="font-mono">## Заголовок</code> — подзаголовок раздела</li>
						<li><code className="font-mono">- пункт</code> — элемент списка</li>
						<li><code className="font-mono">&gt; текст</code> — акцентная выноска</li>
						<li><code className="font-mono">:quote: текст — Автор</code> — цитата</li>
						<li><code className="font-mono">:stat: 100k+ | подпись</code> — карточка-цифра</li>
						<li><code className="font-mono">:tags: a, b, c</code> — ряд тегов</li>
						<li><code className="font-mono">---</code> — разделитель</li>
						<li><code className="font-mono">**жирный**</code> — выделение в строке</li>
						<li className="sm:col-span-2">Пустая строка разделяет абзацы. Первый абзац — крупный «лид» с акцентной полосой слева.</li>
					</ul>
				</div>
			)}

			{/* Editor + live preview */}
			<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="flex min-h-0 flex-col">
					<p className="mb-1.5 shrink-0 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
						ТЕКСТ · {lang === "ru" ? "РУССКИЙ" : lang === "en" ? "ENGLISH" : "DEUTSCH"}
					</p>
					<textarea
						ref={taRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder={lang === "ru" ? "Текст для этого раздела…" : lang === "en" ? "English text for this section…" : "Deutscher Text für diesen Abschnitt…"}
						className="min-h-[16rem] flex-1 resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-foreground"
					/>
				</div>

				<div className="flex min-h-0 flex-col">
					<p className="mb-1.5 shrink-0 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
						ПРЕДПРОСМОТР
					</p>
					<div className="min-h-[16rem] flex-1 overflow-auto rounded-2xl border-2 border-foreground/15 bg-background p-5">
						{empty ? (
							<p className="text-sm text-muted-foreground/60">
								Здесь появится предпросмотр того, как блок будет выглядеть на странице.
							</p>
						) : (
							<AboutContent text={value} />
						)}
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex shrink-0 items-center gap-4">
				<button
					type="submit"
					disabled={pending}
					className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
				>
					{pending ? "Сохранение…" : "Сохранить"}
				</button>
				{saved && <span className="text-sm font-medium text-green-600">Сохранено ✓</span>}
				<a
					href={`/about/${slug}`}
					target="_blank"
					rel="noreferrer"
					className="ml-auto font-mono text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
				>
					<ArrowUpRight className="inline-block size-[1em] align-[-0.15em]" /> /about/{slug}
				</a>
			</div>
			<span className="sr-only">{title}</span>
		</form>
	);
}

function ToolbarButton({
	onClick,
	children,
}: {
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted/40"
		>
			{children}
		</button>
	);
}
