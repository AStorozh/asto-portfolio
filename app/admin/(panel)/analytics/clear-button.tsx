"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAnalyticsEvents } from "@/app/actions/analytics-actions";

const btnBase =
	"inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-all active:translate-y-0 disabled:opacity-40";

export function ClearAnalyticsButton() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [confirming, setConfirming] = useState(false);
	const [done, setDone] = useState(false);

	function clear() {
		setDone(false);
		startTransition(async () => {
			await clearAnalyticsEvents();
			setConfirming(false);
			setDone(true);
			router.refresh();
			setTimeout(() => setDone(false), 3000);
		});
	}

	return (
		<div className="rounded-3xl border-2 border-foreground bg-background p-6 shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]">
			<div className="flex flex-wrap items-center justify-between gap-5">
				<div className="max-w-md">
					<div className="flex items-center gap-2">
						<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-[13px] font-bold text-red-500">!</span>
						<p className="text-[12px] font-bold uppercase tracking-[0.18em] text-foreground">Опасная зона</p>
					</div>
					<p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
						Удалить всю собранную аналитику. Ссылки с метками останутся, статистика обнулится
						(в дашборде и в Google-таблице после обновления). Действие необратимо.
					</p>
				</div>

				{done ? (
					<span className={`${btnBase} bg-foreground text-background`}>Очищено ✓</span>
				) : confirming ? (
					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={clear}
							disabled={pending}
							className={`${btnBase} bg-red-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.1),0_14px_40px_rgba(220,38,38,0.35)] hover:-translate-y-0.5 hover:bg-red-700`}
						>
							{pending ? "Очищаю…" : "Да, удалить"}
						</button>
						<button
							type="button"
							onClick={() => setConfirming(false)}
							disabled={pending}
							className={`${btnBase} border-2 border-foreground bg-background text-foreground hover:-translate-y-0.5 hover:bg-muted/40`}
						>
							Отмена
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirming(true)}
						className={`${btnBase} shrink-0 border-2 border-foreground bg-background text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-red-500 hover:text-red-600`}
					>
						Очистить всю аналитику
					</button>
				)}
			</div>
		</div>
	);
}
