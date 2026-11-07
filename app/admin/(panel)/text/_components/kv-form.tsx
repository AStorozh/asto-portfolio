"use client";

import { useState, useTransition } from "react";

export interface KVField {
	key: string;
	label: string;
	value: string;
	enValue?: string;
	deValue?: string;
	multiline?: boolean;
	rows?: number;
}

interface KVFormProps {
	fields: KVField[];
	action: (fd: FormData) => Promise<void>;
}

const inputCls =
	"h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-foreground";
const textareaCls =
	"w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-foreground";
const langBadge =
	"mb-1 inline-block text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50";

export function KVForm({ fields, action }: KVFormProps) {
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);

	function onSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		startTransition(async () => {
			await action(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 2500);
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			{fields.map((f) => {
				const hasTr = f.enValue !== undefined || f.deValue !== undefined;
				// Render translation columns always when the field has at least one translation,
				// so that both EN and DE can be filled in.
				const langCols: { code: string; name: string; value: string }[] = hasTr
					? [
							{ code: "RU", name: f.key, value: f.value },
							{ code: "EN", name: `${f.key}__en`, value: f.enValue ?? "" },
							{ code: "DE", name: `${f.key}__de`, value: f.deValue ?? "" },
						]
					: [];
				return (
					<div key={f.key} className="flex flex-col gap-1.5">
						<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							{f.label}
						</span>
						{hasTr ? (
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
								{langCols.map((c) => (
									<div key={c.code} className="flex flex-col">
										<span className={langBadge}>{c.code}</span>
										{f.multiline ? (
											<textarea
												name={c.name}
												defaultValue={c.value}
												rows={f.rows ?? 3}
												className={textareaCls}
											/>
										) : (
											<input
												name={c.name}
												type="text"
												defaultValue={c.value}
												className={inputCls}
											/>
										)}
									</div>
								))}
							</div>
						) : f.multiline ? (
							<textarea
								name={f.key}
								defaultValue={f.value}
								rows={f.rows ?? 3}
								className={textareaCls}
							/>
						) : (
							<input
								name={f.key}
								type="text"
								defaultValue={f.value}
								className={inputCls}
							/>
						)}
					</div>
				);
			})}
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
	);
}
