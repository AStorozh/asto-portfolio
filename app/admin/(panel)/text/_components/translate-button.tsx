"use client";

import { useState, useTransition } from "react";
import { translateAllToEn } from "@/app/actions/translate-action";

export function TranslateButton() {
	const [pending, startTransition] = useTransition();
	const [result, setResult] = useState<{ ok: boolean; count: number; error?: string } | null>(null);

	function handleClick() {
		setResult(null);
		startTransition(async () => {
			const res = await translateAllToEn();
			setResult(res);
		});
	}

	return (
		<div className="flex flex-col gap-3 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-0.5">
					<p className="text-[13px] font-bold tracking-tight">Автоперевод на английский</p>
					<p className="text-[11px] leading-relaxed text-muted-foreground">
						Google Cloud Translation переведёт весь контент из RU → EN и сохранит в базу данных
					</p>
				</div>
				<button
					type="button"
					disabled={pending}
					onClick={handleClick}
					className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[12px] font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
				>
					{pending ? (
						<>
							<span className="inline-block h-3 w-3 animate-spin rounded-full border border-background/30 border-t-background" />
							Перевожу…
						</>
					) : (
						<>
							<span>🌐</span>
							Перевести всё
						</>
					)}
				</button>
			</div>

			{result && (
				<div
					className={`rounded-xl px-3 py-2 text-[11px] font-medium ${
						result.ok
							? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
							: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
					}`}
				>
					{result.ok
						? `Готово — переведено ${result.count} строк`
						: `Ошибка: ${result.error}`}
				</div>
			)}
		</div>
	);
}
