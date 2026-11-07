"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight } from "@/app/arrow-up-right";
import { refreshAnalyticsSheet } from "@/app/actions/analytics-actions";

export function SheetSync({ sheetUrl }: { sheetUrl: string }) {
	const [pending, startTransition] = useTransition();
	const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

	function onClick() {
		setResult(null);
		startTransition(async () => {
			const res = await refreshAnalyticsSheet();
			setResult(res);
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<button
				type="button"
				onClick={onClick}
				disabled={pending}
				className="inline-flex h-9 items-center gap-2 rounded-xl bg-foreground px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-80 disabled:opacity-40"
			>
				{pending ? (
					<>
						<span className="inline-block h-3 w-3 animate-spin rounded-full border border-background/30 border-t-background" />
						Обновляю…
					</>
				) : (
					<>↻ Обновить таблицу</>
				)}
			</button>
			{sheetUrl && (
				<a
					href={sheetUrl}
					target="_blank"
					rel="noreferrer"
					className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
				>
					Открыть Google-таблицу <ArrowUpRight className="inline-block size-[1em] align-[-0.15em]" />
				</a>
			)}
			{result && (
				<span className={`text-[12px] font-medium ${result.ok ? "text-green-600" : "text-red-500"}`}>
					{result.ok ? "Обновлено ✓" : `Ошибка: ${result.error}`}
				</span>
			)}
		</div>
	);
}
