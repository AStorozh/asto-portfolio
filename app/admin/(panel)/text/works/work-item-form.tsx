"use client";

import { saveWorkItem } from "@/app/actions/text-actions";
import { useState, useTransition } from "react";

interface WorkItemFormProps {
	id: number;
	title: string;
	title_en: string | null;
	title_de: string | null;
	description: string;
	description_en: string | null;
	description_de: string | null;
	overview: string;
	overview_en: string | null;
	overview_de: string | null;
	tags: string[];
	whatIDid: string[];
	howDone: string[];
	results: string[];
}

const inputCls =
	"h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-foreground";
const textareaCls =
	"w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground";
const labelCls = "flex flex-col gap-1.5";
const labelTextCls = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";
const langBadge = "mb-1 inline-block text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50";

export function WorkItemForm({
	id,
	title,
	title_en,
	title_de,
	description,
	description_en,
	description_de,
	overview,
	overview_en,
	overview_de,
	tags,
	whatIDid,
	howDone,
	results,
}: WorkItemFormProps) {
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);

	function onSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		startTransition(async () => {
			await saveWorkItem(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		});
	}

	return (
		<details className="group rounded-2xl border border-border/70">
			<summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 hover:bg-muted/30 rounded-2xl transition-colors">
				<span className="text-sm font-semibold">{title}</span>
				<span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
					▼
				</span>
			</summary>
			<form
				onSubmit={onSubmit}
				className="flex flex-col gap-4 border-t border-border/70 px-4 pb-5 pt-4"
			>
				<input type="hidden" name="id" value={id} />

				<div className={labelCls}>
					<span className={labelTextCls}>Заголовок</span>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<div className="flex flex-col">
							<span className={langBadge}>RU</span>
							<input name="title" type="text" defaultValue={title} className={inputCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>EN</span>
							<input name="title_en" type="text" defaultValue={title_en ?? ""} className={inputCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>DE</span>
							<input name="title_de" type="text" defaultValue={title_de ?? ""} className={inputCls} />
						</div>
					</div>
				</div>

				<div className={labelCls}>
					<span className={labelTextCls}>Краткое описание (карточка)</span>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<div className="flex flex-col">
							<span className={langBadge}>RU</span>
							<textarea name="description" defaultValue={description} rows={2} className={textareaCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>EN</span>
							<textarea name="description_en" defaultValue={description_en ?? ""} rows={2} className={textareaCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>DE</span>
							<textarea name="description_de" defaultValue={description_de ?? ""} rows={2} className={textareaCls} />
						</div>
					</div>
				</div>

				<div className={labelCls}>
					<span className={labelTextCls}>Обзор</span>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<div className="flex flex-col">
							<span className={langBadge}>RU</span>
							<textarea name="overview" defaultValue={overview} rows={3} className={textareaCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>EN</span>
							<textarea name="overview_en" defaultValue={overview_en ?? ""} rows={3} className={textareaCls} />
						</div>
						<div className="flex flex-col">
							<span className={langBadge}>DE</span>
							<textarea name="overview_de" defaultValue={overview_de ?? ""} rows={3} className={textareaCls} />
						</div>
					</div>
				</div>

				<label className={labelCls}>
					<span className={labelTextCls}>Теги (через запятую)</span>
					<input
						name="tags"
						type="text"
						defaultValue={tags.join(", ")}
						className={inputCls}
					/>
				</label>

				<label className={labelCls}>
					<span className={labelTextCls}>Что сделано (каждый пункт с новой строки)</span>
					<textarea
						name="what_i_did"
						defaultValue={whatIDid.join("\n")}
						rows={4}
						className={textareaCls}
					/>
				</label>

				<label className={labelCls}>
					<span className={labelTextCls}>Как сделано (каждый пункт с новой строки)</span>
					<textarea
						name="how_done"
						defaultValue={howDone.join("\n")}
						rows={4}
						className={textareaCls}
					/>
				</label>

				<label className={labelCls}>
					<span className={labelTextCls}>Результат (каждый пункт с новой строки)</span>
					<textarea
						name="results"
						defaultValue={results.join("\n")}
						rows={4}
						className={textareaCls}
					/>
				</label>

				<div className="flex items-center gap-3 pt-1">
					<button
						type="submit"
						disabled={pending}
						className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						{pending ? "Сохранение…" : "Сохранить"}
					</button>
					{saved && (
						<span className="text-sm font-medium text-green-600">Сохранено ✓</span>
					)}
				</div>
			</form>
		</details>
	);
}
