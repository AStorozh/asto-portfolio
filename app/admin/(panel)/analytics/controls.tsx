"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const dateCls =
	"h-8 min-w-0 rounded-lg border border-border/70 bg-background px-2 text-[12px] font-semibold tabular-nums outline-none focus:border-foreground";

// Report period: "All time" or any dates "from" and "to" (either one may be empty).
function ControlsInner() {
	const router = useRouter();
	const sp = useSearchParams();
	const from = sp.get("from") ?? "";
	const to = sp.get("to") ?? "";
	const allTime = !from && !to && (!sp.get("range") || sp.get("range") === "all");
	const today = new Date().toISOString().slice(0, 10);

	function go(next: { from?: string; to?: string }) {
		const q = new URLSearchParams(sp.toString());
		q.delete("range"); // the old 7/30/90 presets
		for (const key of ["from", "to"] as const) {
			const v = next[key];
			if (v === undefined) continue;
			if (v && ISO_DAY.test(v)) q.set(key, v);
			else q.delete(key);
		}
		router.push(`/admin/analytics?${q.toString()}`);
	}

	return (
		<div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
			<button
				type="button"
				onClick={() => go({ from: "", to: "" })}
				className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition-colors ${
					allTime ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:text-foreground"
				}`}
			>
				Всё время
			</button>
			<label className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
				<span className="text-[11px] text-muted-foreground">с</span>
				<input type="date" value={from} max={to || today} onChange={(e) => go({ from: e.target.value })} className={`${dateCls} flex-1`} aria-label="Начало периода" />
			</label>
			<label className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
				<span className="text-[11px] text-muted-foreground">по</span>
				<input type="date" value={to} min={from || undefined} max={today} onChange={(e) => go({ to: e.target.value })} className={`${dateCls} flex-1`} aria-label="Конец периода" />
			</label>
		</div>
	);
}

export function AnalyticsControls() {
	return (
		<Suspense fallback={null}>
			<ControlsInner />
		</Suspense>
	);
}
