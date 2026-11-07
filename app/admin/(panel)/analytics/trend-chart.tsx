"use client";

import { useMemo, useRef, useState } from "react";

// Trend chart: views / visits / time by day.
// Two views - total and broken down by link (each has its own fixed
// color), plus a table with the same numbers: three palette colors don't reach 3:1
// contrast against the light background, so the numbers must be readable without color too.

export type TrendSeries = { key: string; label: string; color: string };
export type TrendValues = Record<string, { views: number; visits: number; secs: number }[]>;

type Metric = "views" | "visits" | "secs";
type View = "total" | "links" | "table";

const METRICS: { key: Metric; label: string }[] = [
	{ key: "views", label: "Просмотры" },
	{ key: "visits", label: "Визиты" },
	{ key: "secs", label: "Время" },
];

const VIEWS: { key: View; label: string }[] = [
	{ key: "total", label: "Всего" },
	{ key: "links", label: "По ссылкам" },
	{ key: "table", label: "Таблица" },
];

function fmt(metric: Metric, v: number): string {
	if (metric !== "secs") return v.toLocaleString("ru");
	if (v <= 0) return "0";
	if (v < 60) return `${v} с`;
	const m = Math.round(v / 60);
	if (m < 60) return `${m} мин`;
	return `${Math.floor(m / 60)} ч ${m % 60} мин`;
}

// Round the top of the scale up to a "round" number, otherwise the axis labels look random.
function niceMax(v: number): number {
	if (v <= 0) return 1;
	const pow = 10 ** Math.floor(Math.log10(v));
	const step = [1, 2, 2.5, 5, 10].find((s) => v <= s * pow) ?? 10;
	return step * pow;
}

const W = 1000; // internal svg coordinates; the width stretches to the container
const H = 260;
const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

export function TrendChart({
	days,
	labels,
	series,
	values,
	scopeKey,
	scopeLabel,
}: {
	days: string[]; // YYYY-MM-DD
	labels: string[]; // DD.MM
	series: TrendSeries[]; // sources (tags + direct), color is fixed per source
	values: TrendValues; // source key → values by day
	scopeKey: string; // selected source: all | direct | code
	scopeLabel: string;
}) {
	const [metric, setMetric] = useState<Metric>("views");
	const [view, setView] = useState<View>("total");
	const [hidden, setHidden] = useState<Set<string>>(new Set());
	const [hover, setHover] = useState<number | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);

	// The total line is computed for the selected source: "All" is the sum of all.
	const totalAt = (i: number) =>
		scopeKey === "all"
			? series.reduce((a, s) => a + (values[s.key]?.[i]?.[metric] ?? 0), 0)
			: values[scopeKey]?.[i]?.[metric] ?? 0;

	const shown = useMemo(
		() => (view === "links" ? series.filter((s) => !hidden.has(s.key)) : []),
		[view, series, hidden],
	);

	const lines = useMemo(() => {
		if (view === "links") return shown.map((s) => ({ ...s, data: days.map((_, i) => values[s.key]?.[i]?.[metric] ?? 0) }));
		return [{ key: "__total", label: scopeLabel, color: "var(--color-foreground)", data: days.map((_, i) => totalAt(i)) }];
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [view, shown, days, values, metric, scopeKey, scopeLabel]);

	const max = niceMax(Math.max(1, ...lines.flatMap((l) => l.data)));
	const plotW = W - PAD.left - PAD.right;
	const plotH = H - PAD.top - PAD.bottom;
	const x = (i: number) => PAD.left + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
	const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

	// Date labels: show as many as fit without overlapping.
	const labelStep = Math.max(1, Math.ceil(days.length / 12));

	function onMove(e: React.PointerEvent<HTMLDivElement>) {
		const el = wrapRef.current;
		if (!el || days.length === 0) return;
		const r = el.getBoundingClientRect();
		const rel = (e.clientX - r.left) / r.width; // 0..1 across the container width
		const inner = (rel * W - PAD.left) / plotW;
		setHover(Math.max(0, Math.min(days.length - 1, Math.round(inner * (days.length - 1)))));
	}

	const tooltipRows =
		hover === null
			? []
			: view === "links"
				? shown.map((s) => ({ label: s.label, color: s.color, value: values[s.key]?.[hover]?.[metric] ?? 0 }))
						.filter((r) => r.value > 0)
						.sort((a, b) => b.value - a.value)
				: [{ label: scopeLabel, color: "var(--color-foreground)", value: totalAt(hover) }];

	const btn = (active: boolean) =>
		`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
			active ? "border-foreground bg-foreground text-background" : "border-foreground/20 text-muted-foreground hover:border-foreground"
		}`;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					Динамика по дням{view !== "links" && scopeKey !== "all" ? ` · ${scopeLabel}` : ""}
				</p>
				<div className="flex flex-wrap items-center gap-1.5">
					{METRICS.map((m) => (
						<button key={m.key} type="button" onClick={() => setMetric(m.key)} className={btn(metric === m.key)}>
							{m.label}
						</button>
					))}
					<span className="mx-1 h-4 w-px bg-border" />
					{VIEWS.map((v) => (
						<button key={v.key} type="button" onClick={() => setView(v.key)} className={btn(view === v.key)}>
							{v.label}
						</button>
					))}
				</div>
			</div>

			{days.length === 0 ? (
				<p className="py-10 text-center text-sm text-muted-foreground">Нет данных за период</p>
			) : view === "table" ? (
				<div className="max-h-72 overflow-auto">
					<table className="w-full text-left text-[12px]">
						<thead className="sticky top-0 bg-background text-[10px] uppercase tracking-wide text-muted-foreground">
							<tr>
								<th className="py-1.5 pr-3">День</th>
								{series.map((s) => (
									<th key={s.key} className="py-1.5 pr-3 text-right">{s.label}</th>
								))}
								<th className="py-1.5 text-right">Всего</th>
							</tr>
						</thead>
						<tbody>
							{days.map((d, i) => {
								const sum = series.reduce((a, s) => a + (values[s.key]?.[i]?.[metric] ?? 0), 0);
								if (sum === 0) return null;
								return (
									<tr key={d} className="border-t border-border/40">
										<td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{labels[i]}</td>
										{series.map((s) => (
											<td key={s.key} className="py-1.5 pr-3 text-right tabular-nums">
												{fmt(metric, values[s.key]?.[i]?.[metric] ?? 0)}
											</td>
										))}
										<td className="py-1.5 text-right font-bold tabular-nums">{fmt(metric, sum)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div
					ref={wrapRef}
					className="relative"
					onPointerMove={onMove}
					onPointerLeave={() => setHover(null)}
				>
					<svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: H }} role="img" aria-label="График динамики по дням">
						{/* grid and scale */}
						{[0, 0.25, 0.5, 0.75, 1].map((t) => (
							<g key={t}>
								<line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.35 : 0.12} strokeWidth={1} />
								<text x={PAD.left - 8} y={y(max * t) + 4} textAnchor="end" fontSize={11} fill="currentColor" fillOpacity={0.5}>
									{metric === "secs" ? fmt("secs", Math.round(max * t)) : Math.round(max * t).toLocaleString("ru")}
								</text>
							</g>
						))}

						{/* dates */}
						{labels.map((l, i) =>
							i % labelStep === 0 ? (
								<text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" fillOpacity={0.5}>
									{l}
								</text>
							) : null,
						)}

						{/* lines */}
						{lines.map((l) => {
							const d = l.data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
							return (
								<g key={l.key}>
									{view === "total" && (
										<path
											d={`${d} L${x(l.data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`}
											fill="currentColor"
											fillOpacity={0.07}
										/>
									)}
									<path d={d} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
								</g>
							);
						})}

						{/* cursor */}
						{hover !== null && (
							<g>
								<line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />
								{lines.map((l) => (
									<circle key={l.key} cx={x(hover)} cy={y(l.data[hover] ?? 0)} r={4.5} fill={l.color} stroke="var(--color-background)" strokeWidth={2} />
								))}
							</g>
						)}
					</svg>

					{hover !== null && (
						<div
							className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl border-2 border-foreground bg-background p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
							style={{
								left: `${(x(hover) / W) * 100}%`,
								transform: x(hover) > W / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
							}}
						>
							<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{labels[hover]}</p>
							{tooltipRows.length === 0 ? (
								<p className="text-[12px] text-muted-foreground">Нет данных</p>
							) : (
								<ul className="flex flex-col gap-1">
									{tooltipRows.map((r) => (
										<li key={r.label} className="flex items-center gap-2 text-[12px]">
											<span className="h-0.5 w-3 shrink-0 rounded" style={{ background: r.color }} />
											<span className="font-bold tabular-nums">{fmt(metric, r.value)}</span>
											<span className="truncate text-muted-foreground">{r.label}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					)}
				</div>
			)}

			{view === "links" && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
					{series.map((s) => {
						const off = hidden.has(s.key);
						return (
							<button
								key={s.key}
								type="button"
								onClick={() =>
									setHidden((prev) => {
										const next = new Set(prev);
										if (next.has(s.key)) next.delete(s.key);
										else next.add(s.key);
										return next;
									})
								}
								className={`flex items-center gap-1.5 text-[11px] transition-opacity ${off ? "opacity-35" : ""}`}
								title={off ? "Показать" : "Скрыть"}
							>
								<span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
								<span className={off ? "line-through" : ""}>{s.label}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
