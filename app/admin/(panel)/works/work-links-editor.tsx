"use client";

import { useEffect, useState } from "react";

type LinkRow = { url: string; label: string };

// Editor for a work's external links (live site, GitHub, etc.). Values are put
// as a JSON string into a hidden input name="links" - the server action parses them itself.
export function WorkLinksEditor({
	initial = [],
	resetSignal = 0,
}: {
	initial?: LinkRow[];
	resetSignal?: number;
}) {
	const [rows, setRows] = useState<LinkRow[]>(initial);

	useEffect(() => {
		if (resetSignal > 0) setRows([]);
	}, [resetSignal]);

	const update = (i: number, patch: Partial<LinkRow>) =>
		setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
	const remove = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i));
	const add = () => setRows((prev) => [...prev, { url: "", label: "" }]);

	// Only rows with a non-empty URL are sent in the form.
	const payload = JSON.stringify(rows.filter((r) => r.url.trim()));

	return (
		<div className="flex flex-col gap-2">
			<input type="hidden" name="links" value={payload} readOnly />

			{rows.length > 0 && (
				<div className="flex flex-col gap-2">
					{rows.map((row, i) => (
						<div key={i} className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background p-2.5 sm:flex-row sm:items-center">
							<input
								type="text"
								value={row.label}
								onChange={(e) => update(i, { label: e.target.value })}
								placeholder="После слова «Ссылка» — напр. на сайт"
								className="h-9 w-full rounded-xl border border-border/60 bg-background px-3 text-[13px] text-foreground outline-none focus:border-foreground sm:w-48 sm:shrink-0"
							/>
							<input
								type="url"
								inputMode="url"
								value={row.url}
								onChange={(e) => update(i, { url: e.target.value })}
								placeholder="https://…"
								className="h-9 w-full rounded-xl border border-border/60 bg-background px-3 font-mono text-[12px] text-foreground outline-none focus:border-foreground"
							/>
							<button
								type="button"
								onClick={() => remove(i)}
								aria-label="Удалить ссылку"
								className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-red-400 hover:text-red-600 sm:self-auto"
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}

			<button
				type="button"
				onClick={add}
				className="inline-flex h-9 w-max items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
			>
				<span className="text-base leading-none">+</span>
				Добавить ссылку
			</button>

			<span className="text-[10px] text-muted-foreground/50">
				Ссылки покажутся кнопками на всю ширину над блоком «О проекте». В кнопке будет «Ссылка» + подпись (напр. «Ссылка на сайт»). GitHub-ссылки получат иконку автоматически.
			</span>
		</div>
	);
}
