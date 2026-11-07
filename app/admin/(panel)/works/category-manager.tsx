"use client";

import { useRef, useTransition } from "react";
import { addWorkCategory, deleteWorkCategory } from "@/app/actions/works-actions";
import { type CategoryData } from "./form-shared";

export function CategoryManager({ categories }: { categories: CategoryData[] }) {
	const [pending, startTransition] = useTransition();
	const formRef = useRef<HTMLFormElement>(null);

	function handleAdd(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		startTransition(async () => {
			await addWorkCategory(fd);
			formRef.current?.reset();
		});
	}

	function handleDelete(id: number) {
		const fd = new FormData();
		fd.set("id", id.toString());
		startTransition(async () => {
			await deleteWorkCategory(fd);
		});
	}

	return (
		<div className="flex flex-col gap-3 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
			<div className="flex items-center gap-2">
				<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">#</span>
				<span className="text-sm font-bold">Категории</span>
				<span className="ml-auto text-[11px] text-muted-foreground">{categories.length} категорий</span>
			</div>

			{categories.length > 0 && (
				<ul className="flex flex-wrap gap-2">
					{categories.map((cat) => (
						<li key={cat.id} className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 pl-3 pr-1.5 py-1">
							<span className="text-[12px] font-medium">
								{cat.label}
								{cat.label_en ? <span className="text-muted-foreground/60"> · {cat.label_en}</span> : null}
								{cat.label_de ? <span className="text-muted-foreground/60"> · {cat.label_de}</span> : null}
							</span>
							<button
								type="button"
								disabled={pending}
								onClick={() => handleDelete(cat.id)}
								className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 text-[9px] text-foreground/60 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
								aria-label={`Удалить категорию ${cat.label}`}
							>
								✕
							</button>
						</li>
					))}
				</ul>
			)}

			<form ref={formRef} onSubmit={handleAdd} className="flex flex-col gap-2">
				<div className="flex flex-col gap-2 sm:flex-row">
					<input
						name="label"
						type="text"
						required
						placeholder="Категория (RU)"
						className="h-10 w-full min-w-0 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none sm:h-9 sm:w-auto sm:flex-1 focus:border-foreground transition-colors"
					/>
					<input
						name="label_en"
						type="text"
						placeholder="Category (EN)"
						className="h-10 w-full min-w-0 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none sm:h-9 sm:w-auto sm:flex-1 focus:border-foreground transition-colors"
					/>
					<input
						name="label_de"
						type="text"
						placeholder="Kategorie (DE)"
						className="h-10 w-full min-w-0 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none sm:h-9 sm:w-auto sm:flex-1 focus:border-foreground transition-colors"
					/>
					<button
						type="submit"
						disabled={pending}
						className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm sm:h-9 font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						{pending ? "…" : "Добавить"}
					</button>
				</div>
			</form>
		</div>
	);
}

// ─── Shared form fields ───────────────────────────────────────────────────────

