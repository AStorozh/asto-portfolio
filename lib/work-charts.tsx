"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ChartKind } from "./work-chart-kinds";
import { useLang } from "./lang-context";

// Charts and diagrams for a work description. Inserted into the text as a block:
//
//   ```bars
//   # Title (optional)
//   Label | 36
//   Label | 95
//   ```
//
// List of kinds and their templates: work-chart-kinds.ts. A data row is usually
// "label | value"; for relationship diagrams "A -> B | label". The palette is only
// black-and-white (shades of the site's text color). Everything appears with an animation when
// it scrolls into view; with "reduce motion" set in the system, the final result is shown at once.

// hot - the row is marked with an asterisk ("Opus 5.5 * | 56"): it is highlighted, the others are lighter.
type Row = { label: string; value: string; hot?: boolean };
// note - the "> conclusion" row under the chart.
type ChartData = { title: string; note: string; rows: Row[] };

function parseChart(lines: string[]): ChartData {
	let title = "";
	let note = "";
	const rows: Row[] = [];
	for (const raw of lines) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith("#")) {
			title = line.replace(/^#+\s*/, "");
			continue;
		}
		if (line.startsWith(">")) {
			note = line.replace(/^>+\s*/, "");
			continue;
		}
		const bar = line.indexOf("|");
		const label = bar === -1 ? line : line.slice(0, bar).trim();
		const value = bar === -1 ? "" : line.slice(bar + 1).trim();
		const hot = /^\*\s+|\s+\*$/.test(label);
		rows.push({ label: label.replace(/^\*\s+|\s+\*$/g, ""), value, hot });
	}
	return { title, note, rows };
}

// ─── Numbers ────────────────────────────────────────────────────────────────

type NumParts = { prefix: string; num: number; suffix: string; decimals: number; group: string; point: string };

// Parses "3201", "3,201", "~74%", "136 k", "1,5 h" into prefix, number and tail,
// remembering the separators so the counter renders the number in the same form.
function parseNum(s: string): NumParts | null {
	const m = s.match(/^(.*?)(\d[\d\s., ]*\d|\d)(.*)$/);
	if (!m) return null;
	const [, prefix, body, suffix] = m;
	let group = "";
	let point = "";
	let decimals = 0;
	const lastSep = Math.max(body.lastIndexOf("."), body.lastIndexOf(","));
	if (lastSep !== -1 && body.length - lastSep - 1 !== 3) {
		point = body[lastSep];
		decimals = body.length - lastSep - 1;
	}
	const intPart = point ? body.slice(0, lastSep) : body;
	const g = intPart.match(/[\s., ]/);
	if (g) group = g[0];
	const clean = intPart.replace(/[\s., ]/g, "") + (point ? "." + body.slice(lastSep + 1) : "");
	const num = Number(clean);
	if (!Number.isFinite(num)) return null;
	return { prefix, num, suffix, decimals, group, point };
}

function formatNum(p: NumParts, v: number): string {
	const fixed = v.toFixed(p.decimals);
	const [int, frac] = fixed.split(".");
	const grouped = p.group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, p.group) : int;
	return p.prefix + grouped + (frac ? p.point + frac : "") + p.suffix;
}

function numOf(s: string): number {
	return parseNum(s)?.num ?? 0;
}

// A list of numbers from a string: "3 5 4 8", "3, 5, 4", "2.5; 4".
function numList(s: string): number[] {
	return s
		.split(/[;,]\s*|\s+/)
		.map((x) => Number(x.replace(",", ".")))
		.filter((x) => Number.isFinite(x));
}

// A share of a whole: "97%" or "47/50".
function share(value: string): number {
	const slash = value.match(/(\d[\d.,]*)\s*\/\s*(\d[\d.,]*)/);
	if (slash) {
		const a = Number(slash[1].replace(",", "."));
		const b = Number(slash[2].replace(",", "."));
		return b ? Math.min(1, a / b) : 0;
	}
	return Math.min(1, Math.max(0, numOf(value) / 100));
}

// ─── Appearing on screen ────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
	return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
	const ref = useRef<T>(null);
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
			setShown(true);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setShown(true);
					io.disconnect();
				}
			},
			{ threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return [ref, shown];
}

// Actual width of the block: diagrams are drawn in pixels 1:1 so labels
// don't balloon on a wide screen and don't shrink in a narrow column.
function useWidth(fallback = 560): [React.RefObject<HTMLDivElement | null>, number] {
	const ref = useRef<HTMLDivElement>(null);
	const [w, setW] = useState(fallback);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(([e]) => {
			const next = Math.round(e.contentRect.width);
			if (next > 0) setW(next);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return [ref, w];
}

function Counter({ value, run, delay = 0 }: { value: string; run: boolean; delay?: number }) {
	const parts = parseNum(value);
	const [shownValue, setShownValue] = useState(() => (parts ? formatNum(parts, 0) : value));
	useEffect(() => {
		if (!parts || !run) return;
		if (prefersReducedMotion()) {
			setShownValue(formatNum(parts, parts.num));
			return;
		}
		let raf = 0;
		const duration = 1600;
		const start = performance.now() + delay;
		const tick = (now: number) => {
			const t = Math.min(1, Math.max(0, (now - start) / duration));
			// "Exponential" ease-out: fast start and soft stop.
			const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
			setShownValue(formatNum(parts, parts.num * eased));
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [run, value]);
	return <span aria-label={value}>{shownValue}</span>;
}

// ─── Colors and motion ──────────────────────────────────────────────────────

// Only shades of the site's main color (black-and-white palette).
const shade = (pct: number) => `color-mix(in oklch, var(--foreground) ${pct}%, transparent)`;
const SERIES: string[] = ["var(--foreground)", shade(62), shade(38), shade(22), shade(12)];
const INK = "var(--foreground)";
const PAPER = "var(--background)";
const SOFT = shade(30);
const TRACK = shade(7);
const LINE = shade(14);

// A soft "spring" without overshoot and with a slight overshoot.
const SPRING = "cubic-bezier(0.16, 1, 0.3, 1)";
const BOUNCE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// Appearing from below out of a light blur.
function rise(shown: boolean, delay = 0, dist = 14): CSSProperties {
	return {
		opacity: shown ? 1 : 0,
		transform: shown ? "none" : `translateY(${dist}px) scale(0.98)`,
		filter: shown ? "none" : "blur(6px)",
		transition: `opacity 700ms ${SPRING} ${delay}ms, transform 1000ms ${SPRING} ${delay}ms, filter 700ms ${SPRING} ${delay}ms`,
	};
}

// "Pop-in" of a dot or icon with overshoot (class .chart-pop in globals.css).
function pop(shown: boolean, delay = 0): CSSProperties {
	return shown
		? { animation: `chart-pop 650ms ${BOUNCE} ${delay}ms both`, transformBox: "fill-box", transformOrigin: "center" }
		: { opacity: 0 };
}

// Line drawing: the element must have pathLength={1}.
function draw(shown: boolean, delay = 0, duration = 1200): CSSProperties {
	return {
		strokeDasharray: 1,
		strokeDashoffset: shown ? 0 : 1,
		transition: `stroke-dashoffset ${duration}ms ${SPRING} ${delay}ms`,
	};
}

// A glint running across the bar after it has grown.
function sheen(shown: boolean, delay: number): { className: string; style: CSSProperties } {
	return { className: shown ? "chart-sheen" : "", style: { ["--sheen-delay" as string]: `${delay}ms` } };
}

function Frame({ title, note, shown, children, innerRef }: { title: string; note?: string; shown: boolean; children: ReactNode; innerRef: React.Ref<HTMLElement> }) {
	return (
		<figure
			ref={innerRef}
			className="rounded-2xl border border-foreground/10 bg-background p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-shadow duration-500 hover:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.18)]"
			style={rise(shown, 0, 18)}
		>
			{title && (
				<figcaption className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
					<span
						aria-hidden
						className="h-px bg-foreground/40"
						style={{ width: shown ? 18 : 0, transition: `width 700ms ${SPRING} 200ms` }}
					/>
					{title}
				</figcaption>
			)}
			{children}
			{note && (
				<p className="mt-3 border-t border-foreground/10 pt-2.5 text-[11.5px] leading-snug text-muted-foreground" style={rise(shown, 900, 4)}>
					{note}
				</p>
			)}
		</figure>
	);
}

// Bar color: the one marked with an asterisk is dark; if there are no marks, the largest is dark.
function tone(data: ChartData, r: Row, max: number): string {
	const marked = data.rows.some((x) => x.hot);
	return (marked ? r.hot : numOf(r.value) === max) ? INK : SOFT;
}

// Highlight on hover: the other elements of the group are dimmed.
const dimOthers = "transition-opacity duration-300 group-hover/c:[&:not(:hover)]:opacity-35";

// ─── 1. Big numbers ─────────────────────────────────────────────────────────

function Stats({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const cols = data.rows.length >= 4 ? "@2xl:grid-cols-4" : data.rows.length === 3 ? "@xl:grid-cols-3" : "";
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className={`group/c grid grid-cols-2 gap-2 ${cols}`}>
				{data.rows.map((r, i) => (
					<div
						key={i}
						className={`relative overflow-hidden rounded-xl border-2 border-foreground bg-background px-3 pb-2.5 pt-2.5 ${dimOthers}`}
						style={rise(shown, 120 + i * 110)}
					>
						<div className="text-[22px] font-black leading-none tracking-tight">
							<Counter value={r.label} run={shown} delay={120 + i * 110} />
						</div>
						<div className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{r.value}</div>
						<span
							aria-hidden
							className="absolute bottom-0 left-0 h-1 w-full origin-left bg-foreground"
							style={{ transform: shown ? "scaleX(1)" : "scaleX(0)", transition: `transform 1200ms ${SPRING} ${400 + i * 110}ms` }}
						/>
					</div>
				))}
			</div>
		</Frame>
	);
}

// ─── 2. Horizontal bars ─────────────────────────────────────────────────────

function Bars({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const max = Math.max(1, ...data.rows.map((r) => numOf(r.value)));
	// A long list - compact: label, bar and number on one line.
	if (data.rows.length >= 6) {
		return (
			<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
				<div className="group/c grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5">
					{data.rows.map((r, i) => {
						const w = (numOf(r.value) / max) * 100;
						const d = 150 + i * 90;
						const s = sheen(shown, d + 900);
						return (
							<div key={i} className={`contents ${dimOthers}`}>
								<span className={`truncate text-[12px] ${r.hot ? "font-bold text-foreground" : "text-foreground/80"}`} style={rise(shown, d, 4)}>
									{r.label}
								</span>
								<span className="h-2 overflow-hidden rounded-full" style={{ background: TRACK }}>
									<span
										className={`block h-full rounded-full ${s.className}`}
										style={{ ...s.style, width: shown ? `${w}%` : "0%", background: tone(data, r, max), transition: `width 1300ms ${SPRING} ${d}ms` }}
									/>
								</span>
								<span className={`text-right text-[12px] tabular-nums ${r.hot ? "font-black" : "font-semibold text-foreground/80"}`}>
									<Counter value={r.value} run={shown} delay={d} />
								</span>
							</div>
						);
					})}
				</div>
			</Frame>
		);
	}
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="group/c flex flex-col gap-2.5">
				{data.rows.map((r, i) => {
					const w = (numOf(r.value) / max) * 100;
					const d = 150 + i * 120;
					const s = sheen(shown, d + 900);
					return (
						<div key={i} className={dimOthers}>
							<div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]" style={rise(shown, d, 6)}>
								<span className={r.hot ? "font-bold text-foreground" : "text-foreground/85"}>{r.label}</span>
								<span className="font-bold tabular-nums">
									<Counter value={r.value} run={shown} delay={d} />
								</span>
							</div>
							<div className="h-2.5 overflow-hidden rounded-full" style={{ background: TRACK }}>
								<div
									className={`h-full rounded-full ${s.className}`}
									style={{
										...s.style,
										width: shown ? `${w}%` : "0%",
										background: tone(data, r, max),
										transition: `width 1300ms ${SPRING} ${d}ms`,
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 3. Vertical columns ────────────────────────────────────────────────────

function Columns({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const max = Math.max(1, ...data.rows.map((r) => numOf(r.value)));
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="group/c relative flex h-32 items-end gap-2 @md:gap-3">
				{[0.25, 0.5, 0.75].map((f) => (
					<span key={f} aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${f * 82}%`, borderColor: LINE }} />
				))}
				{data.rows.map((r, i) => {
					const h = (numOf(r.value) / max) * 82;
					const d = 150 + i * 90;
					const s = sheen(shown, d + 900);
					return (
						<div key={i} className={`relative flex h-full min-w-0 flex-1 flex-col items-center justify-end ${dimOthers}`}>
							<span className="mb-1 text-[11.5px] font-bold tabular-nums" style={rise(shown, d + 300, 8)}>
								<Counter value={r.value} run={shown} delay={d} />
							</span>
							<div
								className={`w-full max-w-14 rounded-t-lg ${s.className}`}
								style={{
									...s.style,
									height: shown ? `${h}%` : "0%",
									background: tone(data, r, max),
									transition: `height 1200ms ${SPRING} ${d}ms`,
								}}
							/>
						</div>
					);
				})}
			</div>
			<div className="border-t-2 border-foreground" />
			<div className="mt-1.5 flex gap-2 @md:gap-3">
				{data.rows.map((r, i) => (
					<span key={i} className="min-w-0 flex-1 text-center text-[11px] leading-tight text-muted-foreground" style={rise(shown, 200 + i * 90, 4)}>
						{r.label}
					</span>
				))}
			</div>
		</Frame>
	);
}

// ─── 4. Ring ────────────────────────────────────────────────────────────────

// The total in the center of the ring is written in the same form as the numbers in the rows:
// "36 347" gives "62 473", not "62473".
function totalLabel(rows: Row[], total: number): string {
	const p = rows.map((r) => parseNum(r.value)).find((x) => x && x.group);
	const n = Math.round(total);
	return p ? formatNum({ ...p, prefix: "", suffix: "", decimals: 0 }, n) : String(n);
}

function Donut({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const [hover, setHover] = useState<number | null>(null);
	const values = data.rows.map((r) => numOf(r.value));
	const total = values.reduce((a, b) => a + b, 0) || 1;
	const r = 42;
	const c = 2 * Math.PI * r;
	const starts = values.map((_, i) => values.slice(0, i).reduce((s, v) => s + (v / total) * c, 0));
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="flex flex-col items-center gap-4 @md:flex-row @md:gap-6">
				<div className="relative h-28 w-28 shrink-0">
					<svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible">
						<circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" style={{ stroke: TRACK }} />
						{values.map((v, i) => {
							const len = (v / total) * c;
							const delay = 200 + (starts[i] / c) * 1100;
							return (
								<circle
									key={i}
									cx="50"
									cy="50"
									r={r}
									fill="none"
									strokeWidth={hover === i ? 15 : 12}
									strokeDasharray={`${shown ? Math.max(0, len - 1) : 0} ${c}`}
									strokeDashoffset={-starts[i]}
									onMouseEnter={() => setHover(i)}
									onMouseLeave={() => setHover(null)}
									style={{
										stroke: SERIES[i % SERIES.length],
										opacity: hover === null || hover === i ? 1 : 0.3,
										transition: `stroke-dasharray ${(len / c) * 1100 + 300}ms ${SPRING} ${delay}ms, opacity 300ms, stroke-width 300ms ${SPRING}`,
									}}
								/>
							);
						})}
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center" style={pop(shown, 500)}>
						<span className="text-[19px] font-black leading-none tabular-nums">
							{hover === null ? <Counter value={totalLabel(data.rows, total)} run={shown} /> : data.rows[hover].value}
						</span>
						{hover !== null && <span className="mt-1 max-w-[6rem] truncate text-[11px] text-muted-foreground">{data.rows[hover].label}</span>}
					</div>
				</div>
				<ul className="flex w-full flex-col gap-2">
					{data.rows.map((row, i) => (
						<li
							key={i}
							onMouseEnter={() => setHover(i)}
							onMouseLeave={() => setHover(null)}
							className="flex cursor-default items-center gap-2 rounded-lg px-1.5 py-0.5 text-[12.5px] transition-colors hover:bg-foreground/[0.04]"
							style={rise(shown, 400 + i * 120, 6)}
						>
							<span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: SERIES[i % SERIES.length] }} />
							<span className="flex-1 text-foreground/85">{row.label}</span>
							<span className="font-bold tabular-nums">{row.value}</span>
							<span className="w-10 text-right text-[12px] tabular-nums text-muted-foreground">{Math.round((values[i] / total) * 100)}%</span>
						</li>
					))}
				</ul>
			</div>
		</Frame>
	);
}

// ─── 5. Percent rings ───────────────────────────────────────────────────────

function Progress({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const r = 40;
	const c = 2 * Math.PI * r;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="group/c grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(data.rows.length, 3)}, minmax(0, 1fr))` }}>
				{data.rows.map((row, i) => {
					const d = 150 + i * 150;
					return (
						<div key={i} className={`flex flex-col items-center text-center ${dimOthers}`} style={rise(shown, d)}>
							<div className="relative h-[4.5rem] w-[4.5rem]">
								<svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
									<circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" style={{ stroke: TRACK }} />
									<circle
										cx="50"
										cy="50"
										r={r}
										fill="none"
										strokeWidth="8"
										strokeLinecap="round"
										strokeDasharray={`${shown ? share(row.value) * c : 0} ${c}`}
										style={{ stroke: INK, transition: `stroke-dasharray 1500ms ${SPRING} ${d + 150}ms` }}
									/>
								</svg>
								<span className="absolute inset-0 flex items-center justify-center text-[13px] font-black tabular-nums">
									<Counter value={row.value} run={shown} delay={d + 150} />
								</span>
							</div>
							<span className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{row.label}</span>
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 6. Line ────────────────────────────────────────────────────────────────

function Line({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const clip = useId().replace(/:/g, "");
	const [box, W] = useWidth();
	const values = data.rows.map((r) => numOf(r.value));
	const n = values.length;
	const H = Math.round(Math.min(190, Math.max(130, W * 0.34)));
	const pad = 20;
	const max = Math.max(...values, 0);
	const min = Math.min(...values, 0);
	const span = max - min || 1;
	const x = (i: number) => (n <= 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1));
	const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2.4);
	const pts = values.map((v, i) => `${x(i)},${y(v)}`);
	const line = `M${pts.join(" L")}`;
	const area = `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`;
	const DRAW = 1600;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div ref={box}>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible">
				<defs>
					<clipPath id={clip}>
						<rect
							x="0"
							y="0"
							width={W}
							height={H}
							style={{ transformOrigin: "0 0", transform: shown ? "scaleX(1)" : "scaleX(0)", transition: `transform ${DRAW}ms ${SPRING} 150ms` }}
						/>
					</clipPath>
				</defs>
				{[0.25, 0.5, 0.75].map((f) => (
					<line key={f} x1={pad} x2={W - pad} y1={pad + f * (H - pad * 2)} y2={pad + f * (H - pad * 2)} strokeWidth="1" strokeDasharray="3 5" style={{ stroke: LINE }} />
				))}
				<line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} strokeWidth="2" style={{ stroke: INK }} />
				<g clipPath={`url(#${clip})`}>
					<path d={area} style={{ fill: shade(8) }} />
					<path d={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: INK }} />
				</g>
				{values.map((v, i) => {
					const d = 150 + (n <= 1 ? 0 : (i / (n - 1)) * DRAW * 0.8);
					return (
						<g key={i}>
							<circle cx={x(i)} cy={y(v)} r="4.5" strokeWidth="2.5" style={{ fill: PAPER, stroke: INK, ...pop(shown, d) }} />
							<text x={x(i)} y={y(v) - 11} textAnchor="middle" fontSize="12" fontWeight="800" style={{ fill: INK, ...pop(shown, d + 80) }}>
								{data.rows[i].value}
							</text>
						</g>
					);
				})}
			</svg>
			</div>
			<div className="relative mt-1 h-4 text-[11px] text-muted-foreground">
				{data.rows.map((r, i) => (
					<span key={i} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${(x(i) / W) * 100}%` }}>
						{r.label}
					</span>
				))}
			</div>
		</Frame>
	);
}

// ─── 7. Steps ───────────────────────────────────────────────────────────────

function Flow({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const last = data.rows.length - 1;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<ol className="group/c flex flex-col items-stretch gap-1 @2xl:flex-row @2xl:items-stretch @2xl:gap-2">
				{data.rows.map((r, i) => {
					const d = 150 + i * 220;
					return (
						<li key={i} className="contents">
							{i > 0 && (
								<span aria-hidden className="flex shrink-0 items-center justify-center">
									<svg width="22" height="14" viewBox="0 0 22 14" fill="none" className="rotate-90 @2xl:rotate-0">
										<path d="M1 7h18" strokeWidth="2" strokeLinecap="round" pathLength={1} style={{ stroke: shade(45), ...draw(shown, d - 120, 500) }} />
										<path d="M14 2l6 5-6 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: shade(45), ...pop(shown, d + 200) }} />
									</svg>
								</span>
							)}
							<div
								className={`flex min-w-0 items-start gap-2 rounded-xl border-2 border-foreground px-2.5 py-1.5 transition-transform duration-300 hover:-translate-y-0.5 @2xl:flex-1 @2xl:flex-col @2xl:gap-1 ${dimOthers} ${
									i === last ? "bg-foreground text-background" : "bg-background"
								}`}
								style={rise(shown, d)}
							>
								<span
									className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
										i === last ? "bg-background text-foreground" : "bg-foreground text-background"
									}`}
									style={pop(shown, d + 150)}
								>
									{i + 1}
								</span>
								<span className="min-w-0">
									<span className="block text-[12.5px] font-bold leading-tight">{r.label}</span>
									{r.value && <span className={`mt-0.5 block text-[11px] leading-snug ${i === last ? "text-background/70" : "text-muted-foreground"}`}>{r.value}</span>}
								</span>
							</div>
						</li>
					);
				})}
			</ol>
		</Frame>
	);
}

// ─── 8. Before / after ──────────────────────────────────────────────────────

function Compare({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const [a, b] = data.rows;
	if (!a || !b) return <Bars data={data} />;
	const va = numOf(a.value);
	const vb = numOf(b.value);
	const max = Math.max(va, vb, 1);
	const delta = va ? Math.round(((vb - va) / va) * 100) : 0;
	const rows = [
		{ row: a, v: va, color: SOFT },
		{ row: b, v: vb, color: INK },
	];
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="flex flex-col gap-3 @md:flex-row @md:items-center @md:gap-5">
				<div className="flex flex-1 flex-col gap-2.5">
					{rows.map(({ row, v, color }, i) => {
						const d = 150 + i * 350;
						const s = sheen(shown, d + 1000);
						return (
							<div key={i}>
								<div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]" style={rise(shown, d, 6)}>
									<span className="text-foreground/85">{row.label}</span>
									<span className="font-bold tabular-nums">
										<Counter value={row.value} run={shown} delay={d} />
									</span>
								</div>
								<div className="h-3 overflow-hidden rounded-full" style={{ background: TRACK }}>
									<div className={`h-full rounded-full ${s.className}`} style={{ ...s.style, width: shown ? `${(v / max) * 100}%` : "0%", background: color, transition: `width 1300ms ${SPRING} ${d}ms` }} />
								</div>
							</div>
						);
					})}
				</div>
				{va > 0 && (
					<div className="flex shrink-0 items-center justify-center self-start rounded-xl bg-foreground px-3.5 py-2 text-background @md:self-center" style={pop(shown, 1300)}>
						<span className="text-[19px] font-black leading-none tabular-nums">
							{delta > 0 ? "+" : delta < 0 ? "−" : ""}
							{Math.abs(delta)}%
						</span>
					</div>
				)}
			</div>
		</Frame>
	);
}

// ─── 9. Funnel ──────────────────────────────────────────────────────────────

function Funnel({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const max = Math.max(1, ...data.rows.map((r) => numOf(r.value)));
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="group/c flex flex-col items-center gap-1.5">
				{data.rows.map((r, i) => {
					const w = Math.max(52, (numOf(r.value) / max) * 100);
					const d = 150 + i * 160;
					const dark = i < 2;
					return (
						<div
							key={i}
							className={`flex items-center justify-between gap-3 overflow-hidden rounded-lg px-3 py-1.5 text-[12.5px] ${dimOthers}`}
							style={{
								width: shown ? `${w}%` : "12%",
								opacity: shown ? 1 : 0,
								background: SERIES[Math.min(i, SERIES.length - 1)],
								color: dark ? PAPER : INK,
								transition: `width 1200ms ${SPRING} ${d}ms, opacity 500ms ease ${d}ms`,
							}}
						>
							<span className="min-w-0 truncate font-semibold" style={rise(shown, d + 400, 4)}>
								{r.label}
							</span>
							<span className="shrink-0 font-black tabular-nums">
								<Counter value={r.value} run={shown} delay={d} />
							</span>
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 10. Timeline ───────────────────────────────────────────────────────────

function Timeline({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const n = data.rows.length;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			{/* In a narrow column - top to bottom; at full width - left to right, so no emptiness is left on the right. */}
			<ol className="group/c relative ml-1.5 @3xl:ml-0 @3xl:grid @3xl:auto-cols-[minmax(0,1fr)] @3xl:grid-flow-col @3xl:gap-3">
				<span
					aria-hidden
					className="absolute left-[5px] top-1.5 w-0.5 origin-top bg-foreground/20 @3xl:hidden"
					style={{ bottom: "0.75rem", transform: shown ? "scaleY(1)" : "scaleY(0)", transition: `transform ${400 + n * 200}ms ${SPRING} 150ms` }}
				/>
				<span
					aria-hidden
					className="absolute left-1.5 right-6 top-[9px] hidden h-0.5 origin-left bg-foreground/20 @3xl:block"
					style={{ transform: shown ? "scaleX(1)" : "scaleX(0)", transition: `transform ${400 + n * 200}ms ${SPRING} 150ms` }}
				/>
				{data.rows.map((r, i) => {
					const d = 200 + i * 200;
					return (
						<li key={i} className={`relative flex gap-3 pb-3 last:pb-0 @3xl:flex-col @3xl:gap-2 @3xl:pb-0 ${dimOthers}`}>
							<span className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-foreground ${i === n - 1 ? "bg-foreground" : "bg-background"}`} style={pop(shown, d)} />
							<div className="min-w-0" style={rise(shown, d + 60, 0)}>
								<div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{r.label}</div>
								<div className="mt-0.5 text-[12.5px] leading-snug text-foreground/90 hyphens-auto [overflow-wrap:anywhere]">{r.value}</div>
							</div>
						</li>
					);
				})}
			</ol>
		</Frame>
	);
}

// ─── 11. Grid of 100 cells ──────────────────────────────────────────────────

function Waffle({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const values = data.rows.map((r) => numOf(r.value));
	const total = values.reduce((a, b) => a + b, 0) || 1;
	const counts = values.map((v) => Math.round((v / total) * 100));
	if (counts.length) counts[0] += 100 - counts.reduce((a, b) => a + b, 0);
	const cells: number[] = counts.flatMap((n, i) => Array.from({ length: Math.max(0, n) }, () => i));
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="flex flex-col gap-4 @md:flex-row @md:items-center @md:gap-6">
				<div className="grid w-full max-w-[8.5rem] shrink-0 grid-cols-10 gap-[2px] self-center">
					{cells.map((s, k) => (
						<span key={k} className="aspect-square rounded-[3px]" style={{ background: SERIES[s % SERIES.length], ...pop(shown, 150 + (Math.floor(k / 10) + (k % 10)) * 32) }} />
					))}
				</div>
				<ul className="flex w-full flex-col gap-2">
					{data.rows.map((row, i) => (
						<li key={i} className="flex items-center gap-2 text-[12.5px]" style={rise(shown, 500 + i * 120, 6)}>
							<span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: SERIES[i % SERIES.length] }} />
							<span className="flex-1 text-foreground/85">{row.label}</span>
							<span className="font-bold tabular-nums">{row.value}</span>
							<span className="w-10 text-right text-[12px] tabular-nums text-muted-foreground">{counts[i]}%</span>
						</li>
					))}
				</ul>
			</div>
		</Frame>
	);
}

// ─── 12. Layers ─────────────────────────────────────────────────────────────

function Layers({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const n = data.rows.length;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="group/c flex flex-col gap-1.5">
				{data.rows.map((r, i) => {
					const dark = i === n - 1;
					return (
						<div
							key={i}
							className={`flex flex-col gap-0.5 rounded-xl border-2 border-foreground px-3 py-1.5 transition-transform duration-300 hover:scale-[1.01] @md:flex-row @md:items-center @md:justify-between @md:gap-4 ${dimOthers} ${dark ? "bg-foreground text-background" : "bg-background"}`}
							style={{ marginInline: `${(n - 1 - i) * 2.5}%`, ...rise(shown, 150 + (n - 1 - i) * 140, -14) }}
						>
							<span className="text-[12.5px] font-bold">{r.label}</span>
							{r.value && <span className={`text-[11.5px] ${dark ? "text-background/70" : "text-muted-foreground"}`}>{r.value}</span>}
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 13. Share bar ──────────────────────────────────────────────────────────

function Stacked({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const values = data.rows.map((r) => numOf(r.value));
	const total = values.reduce((a, b) => a + b, 0) || 1;
	const s = sheen(shown, 1500);
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className={`group/c flex h-8 overflow-hidden rounded-xl border-2 border-foreground bg-background ${s.className}`} style={s.style}>
				{values.map((v, i) => {
					const pct = (v / total) * 100;
					return (
						<div
							key={i}
							className={`flex h-full items-center justify-center overflow-hidden text-[11px] font-bold tabular-nums ${dimOthers}`}
							style={{
								width: shown ? `${pct}%` : "0%",
								background: SERIES[i % SERIES.length],
								color: i < 2 ? PAPER : INK,
								borderLeft: i > 0 ? `2px solid ${PAPER}` : undefined,
								transition: `width 1300ms ${SPRING} ${150 + i * 180}ms, opacity 300ms`,
							}}
						>
							<span style={rise(shown, 900 + i * 120, 4)}>{pct >= 9 ? `${Math.round(pct)}%` : ""}</span>
						</div>
					);
				})}
			</div>
			<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
				{data.rows.map((row, i) => (
					<li key={i} className="flex items-center gap-2 text-[12.5px]" style={rise(shown, 600 + i * 120, 6)}>
						<span className="h-3 w-3 shrink-0 rounded-[3px] border border-foreground/20" style={{ background: SERIES[i % SERIES.length] }} />
						<span className="text-foreground/85">{row.label}</span>
						<span className="font-bold tabular-nums">{row.value}</span>
					</li>
				))}
			</ul>
		</Frame>
	);
}

// ─── 14. Radar ──────────────────────────────────────────────────────────────

function Radar({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const values = data.rows.map((r) => numOf(r.value));
	const max = data.rows.some((r) => r.value.includes("%")) ? 100 : Math.max(...values, 1);
	const n = Math.max(3, values.length);
	const cx = 130;
	const cy = 120;
	const R = 84;
	const pt = (i: number, k: number) => {
		const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
		return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k];
	};
	const poly = values.map((v, i) => pt(i, v / max).join(",")).join(" ");
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<svg viewBox="0 0 260 245" className="mx-auto h-auto w-full max-w-[230px] overflow-visible">
				{[0.25, 0.5, 0.75, 1].map((k, j) => (
					<polygon
						key={k}
						points={Array.from({ length: n }, (_, i) => pt(i, k).join(",")).join(" ")}
						fill="none"
						strokeWidth="1"
						style={{ stroke: LINE, opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${100 + j * 90}ms` }}
					/>
				))}
				{Array.from({ length: n }, (_, i) => {
					const [x2, y2] = pt(i, 1);
					return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} strokeWidth="1" pathLength={1} style={{ stroke: LINE, ...draw(shown, 150 + i * 60, 600) }} />;
				})}
				<g style={{ transformOrigin: `${cx}px ${cy}px`, transform: shown ? "scale(1)" : "scale(0.2)", opacity: shown ? 1 : 0, transition: `transform 1300ms ${BOUNCE} 450ms, opacity 400ms ease 450ms` }}>
					<polygon points={poly} strokeWidth="2.5" strokeLinejoin="round" style={{ fill: shade(10), stroke: INK }} />
				</g>
				{values.map((v, i) => {
					const [x, y] = pt(i, v / max);
					return <circle key={i} cx={x} cy={y} r="4" style={{ fill: INK, ...pop(shown, 1100 + i * 80) }} />;
				})}
				{data.rows.map((r, i) => {
					const [x, y] = pt(i, 1.2);
					const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
					return (
						<text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize="10.5" fontWeight="600" style={{ fill: INK, opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${600 + i * 80}ms` }}>
							{r.label} · {r.value}
						</text>
					);
				})}
			</svg>
		</Frame>
	);
}

// ─── 15. Gauge ──────────────────────────────────────────────────────────────

function Gauge({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const arc = "M 15 70 A 55 55 0 0 1 125 70";
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className={`group/c grid gap-3 ${data.rows.length >= 3 ? "grid-cols-2 @xl:grid-cols-3" : data.rows.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
				{data.rows.map((row, i) => {
					const k = share(row.value);
					const d = 150 + i * 200;
					return (
						<div key={i} className={`flex flex-col items-center ${dimOthers}`} style={rise(shown, d)}>
							<svg viewBox="0 0 140 82" className={`w-full overflow-visible ${data.rows.length === 1 ? "max-w-[11rem]" : "max-w-[8.5rem]"}`}>
								<path d={arc} fill="none" strokeWidth="12" strokeLinecap="round" style={{ stroke: TRACK }} />
								{Array.from({ length: 11 }, (_, t) => {
									const a = Math.PI - (t / 10) * Math.PI;
									const r1 = t % 5 === 0 ? 38 : 42;
									return <line key={t} x1={70 + Math.cos(a) * r1} y1={70 - Math.sin(a) * r1} x2={70 + Math.cos(a) * 45} y2={70 - Math.sin(a) * 45} strokeWidth={t % 5 === 0 ? 1.6 : 1} style={{ stroke: shade(35) }} />;
								})}
								<path d={arc} fill="none" strokeWidth="12" strokeLinecap="round" pathLength={1} style={{ stroke: INK, strokeDasharray: `${shown ? k : 0} 1`, transition: `stroke-dasharray 1500ms ${SPRING} ${d + 150}ms` }} />
								<g style={{ transformOrigin: "70px 70px", transform: `rotate(${shown ? -90 + k * 180 : -90}deg)`, transition: `transform 1700ms ${BOUNCE} ${d + 150}ms` }}>
									<path d="M70 70 L67 66 L70 30 L73 66 Z" style={{ fill: INK }} />
								</g>
								<circle cx="70" cy="70" r="6" strokeWidth="3" style={{ fill: PAPER, stroke: INK }} />
							</svg>
							<span className="-mt-0.5 text-[16px] font-black leading-none tabular-nums">
								<Counter value={row.value} run={shown} delay={d + 150} />
							</span>
							<span className="mt-1 text-center text-[11.5px] leading-snug text-muted-foreground">{row.label}</span>
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 16. Heatmap ────────────────────────────────────────────────────────────

function Heatmap({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const lang = useLang();
	const [less, more] = lang === "en" ? ["less", "more"] : lang === "de" ? ["weniger", "mehr"] : ["меньше", "больше"];
	const grid = data.rows.map((r) => numList(r.value));
	const max = Math.max(1, ...grid.flat());
	const cols = Math.max(1, ...grid.map((g) => g.length));
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className="flex flex-col gap-1 overflow-x-auto">
				{data.rows.map((r, ri) => (
					<div key={ri} className="flex items-center gap-2">
						<span className="w-10 shrink-0 truncate text-[11px] text-muted-foreground @md:w-14">{r.label}</span>
						<div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1.1rem)` }}>
							{Array.from({ length: cols }, (_, ci) => {
								const v = grid[ri][ci] ?? 0;
								const k = v / max;
								return (
									<span
										key={ci}
										title={`${r.label}: ${v}`}
										className="aspect-square rounded-[4px] transition-transform duration-200 hover:scale-125"
										style={{ background: v === 0 ? TRACK : shade(15 + k * 85), ...pop(shown, 150 + (ri + ci) * 35) }}
									/>
								);
							})}
						</div>
					</div>
				))}
			</div>
			<div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground" style={rise(shown, 700, 4)}>
				<span>{less}</span>
				{[7, 30, 55, 80, 100].map((p) => (
					<span key={p} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: shade(p) }} />
				))}
				<span>{more}</span>
			</div>
		</Frame>
	);
}

// ─── 17. Tree ───────────────────────────────────────────────────────────────

const INDENT = 28;
// Axis of the level-k branch (under the left edge of the parent node).
const branchX = (k: number) => (k - 1) * INDENT + 14;

function Tree({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const nodes = data.rows.map((r) => {
		const m = r.label.match(/^([-–>]+)\s*/);
		return { depth: m ? m[1].length : 0, label: m ? r.label.slice(m[0].length) : r.label, value: r.value };
	});
	// Whether there is another level-k node below, before a shallower node is met.
	const continues = (i: number, k: number) => {
		for (let j = i + 1; j < nodes.length; j++) {
			if (nodes[j].depth < k) return false;
			if (nodes[j].depth === k) return true;
		}
		return false;
	};
	const lineColor = shade(30);
	const W = 1.6;
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<ul className="group/c flex flex-col">
				{nodes.map((nd, i) => {
					const d = 150 + i * 110;
					const fade: CSSProperties = { opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${d - 40}ms` };
					const hasChild = nodes[i + 1]?.depth === nd.depth + 1;
					return (
						<li key={i} className={`relative py-[3px] ${dimOthers}`} style={{ paddingLeft: nd.depth * INDENT }}>
							{/* Through-branches of the higher levels. */}
							{Array.from({ length: Math.max(0, nd.depth - 1) }, (_, t) => t + 1)
								.filter((k) => continues(i, k))
								.map((k) => (
									<span key={k} aria-hidden className="absolute bottom-0 top-0" style={{ left: branchX(k), width: W, background: lineColor, ...fade }} />
								))}
							{/* Own branch: an elbow to the node and, if there is a sibling below, a continuation downward. */}
							{nd.depth > 0 && (
								<>
									<span
										aria-hidden
										className="absolute top-0 rounded-bl-[7px]"
										style={{
											left: branchX(nd.depth),
											width: nd.depth * INDENT - branchX(nd.depth),
											height: "50%",
											borderLeft: `${W}px solid ${lineColor}`,
											borderBottom: `${W}px solid ${lineColor}`,
											...fade,
										}}
									/>
									{continues(i, nd.depth) && (
										<span aria-hidden className="absolute bottom-0" style={{ left: branchX(nd.depth), top: "50%", width: W, background: lineColor, ...fade }} />
									)}
								</>
							)}
							{/* Start of the branch to the first child, under the node itself. */}
							{hasChild && <span aria-hidden className="absolute bottom-0" style={{ left: branchX(nd.depth + 1), top: "50%", width: W, background: lineColor, ...fade }} />}
							<span
								className={`relative z-10 inline-flex max-w-full flex-wrap items-baseline gap-x-2 rounded-lg border-2 border-foreground px-2.5 py-1 text-[12.5px] ${nd.depth === 0 ? "bg-foreground text-background" : "bg-background"}`}
								style={rise(shown, d, 0)}
							>
								<span className="font-bold">{nd.label}</span>
								{nd.value && <span className={`text-[11.5px] ${nd.depth === 0 ? "text-background/70" : "text-muted-foreground"}`}>{nd.value}</span>}
							</span>
						</li>
					);
				})}
			</ul>
		</Frame>
	);
}

// ─── 18. Cycle ──────────────────────────────────────────────────────────────

function Cycle({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const n = Math.max(2, data.rows.length);
	const cx = 180;
	const cy = 150;
	const R = 100;
	const node = 24;
	const pos = (i: number) => {
		const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
		return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, a };
	};
	// Arc between adjacent nodes, inset from the circles.
	const arcPath = (i: number) => {
		const gap = (node + 8) / R;
		const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / n + gap;
		const a2 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - gap;
		const p1 = [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R];
		const p2 = [cx + Math.cos(a2) * R, cy + Math.sin(a2) * R];
		return `M${p1[0]},${p1[1]} A${R},${R} 0 0 1 ${p2[0]},${p2[1]}`;
	};
	const marker = useId().replace(/:/g, "");
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<svg viewBox="0 0 360 300" className="mx-auto h-auto w-full max-w-[340px] overflow-visible">
				<defs>
					<marker id={marker} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M1 1 L8 5 L1 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
					</marker>
				</defs>
				<circle cx={cx} cy={cy} r={R} fill="none" strokeWidth="1" strokeDasharray="2 5" style={{ stroke: LINE, opacity: shown ? 1 : 0, transition: "opacity 600ms ease 100ms" }} />
				{data.rows.map((_, i) => (
					<path key={i} d={arcPath(i)} fill="none" strokeWidth="2" pathLength={1} markerEnd={shown ? `url(#${marker})` : undefined} style={{ stroke: INK, ...draw(shown, 350 + i * 260, 600) }} />
				))}
				{/* A dot running around the circle after the appearance. */}
				{shown && (
					<g className="chart-orbit" style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${600 + n * 260}ms` }}>
						<circle cx={cx} cy={cy - R} r="4" style={{ fill: INK }} />
					</g>
				)}
				{data.rows.map((r, i) => {
					const p = pos(i);
					const d = 150 + i * 260;
					const lx = cx + Math.cos(p.a) * (R + node + 14);
					const ly = cy + Math.sin(p.a) * (R + node + 14);
					const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
					return (
						<g key={i}>
							<circle cx={p.x} cy={p.y} r={node} strokeWidth="2.5" style={{ fill: i === 0 ? INK : PAPER, stroke: INK, ...pop(shown, d) }} />
							<text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="800" style={{ fill: i === 0 ? PAPER : INK, ...pop(shown, d + 80) }}>
								{i + 1}
							</text>
							<text x={lx} y={ly - (r.value ? 6 : 0)} textAnchor={anchor} dominantBaseline="middle" fontSize="12.5" fontWeight="700" style={{ fill: INK, opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${d + 150}ms` }}>
								{r.label}
							</text>
							{r.value && (
								<text x={lx} y={ly + 9} textAnchor={anchor} dominantBaseline="middle" fontSize="10.5" style={{ fill: shade(55), opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${d + 220}ms` }}>
									{r.value}
								</text>
							)}
						</g>
					);
				})}
			</svg>
		</Frame>
	);
}

// ─── 20. Checklist ──────────────────────────────────────────────────────────

function isDone(v: string): boolean {
	const s = v.trim().toLowerCase();
	return !(s === "-" || s === "нет" || s === "no" || s === "nein" || s === "✗" || s === "x" || s === "0");
}

function Checklist({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<ul className="group/c grid gap-1.5 @xl:grid-cols-2">
				{data.rows.map((r, i) => {
					const done = isDone(r.value);
					const note = r.value && !["+", "-", "да", "нет", "yes", "no", "ja", "nein", "✓", "✗", "x", "0", "1"].includes(r.value.trim().toLowerCase()) ? r.value : "";
					const d = 150 + i * 130;
					return (
						<li key={i} className={`flex items-start gap-2.5 rounded-xl border border-foreground/10 px-2.5 py-1.5 ${dimOthers}`} style={rise(shown, d, 8)}>
							<span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-foreground ${done ? "bg-foreground" : "bg-background"}`} style={pop(shown, d + 100)}>
								{done && (
									<svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
										<path d="M3 8.5 L6.5 12 L13 4.5" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} style={{ stroke: PAPER, ...draw(shown, d + 300, 450) }} />
									</svg>
								)}
							</span>
							<span className="min-w-0">
								<span className={`block text-[12.5px] leading-snug ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{r.label}</span>
								{note && <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{note}</span>}
							</span>
						</li>
					);
				})}
			</ul>
		</Frame>
	);
}

// ─── 21. Scatter plot ───────────────────────────────────────────────────────

function Scatter({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const axisX = data.rows.find((r) => r.label.toLowerCase() === "x")?.value ?? "";
	const axisY = data.rows.find((r) => r.label.toLowerCase() === "y")?.value ?? "";
	const pts = data.rows
		.filter((r) => !["x", "y"].includes(r.label.toLowerCase()))
		.map((r) => {
			const [a, b] = numList(r.value);
			return { label: r.label, hot: r.hot, x: a ?? 0, y: b ?? 0 };
		});
	const [box, W] = useWidth();
	const H = Math.round(Math.min(240, Math.max(170, W * 0.5)));
	const pad = 30;
	// The axis starts not at zero but slightly below the smallest point: otherwise close
	// values (e.g. 49 and 56 out of 57) stick together at the top edge.
	const lowOf = (vs: number[]) => {
		const lo = Math.min(...vs);
		const hi = Math.max(...vs);
		return Math.max(0, lo - (hi - lo) * 0.25);
	};
	const minX = pts.length ? lowOf(pts.map((p) => p.x)) : 0;
	const minY = pts.length ? lowOf(pts.map((p) => p.y)) : 0;
	const maxX = Math.max(minX + 1e-9, ...pts.map((p) => p.x));
	const maxY = Math.max(minY + 1e-9, ...pts.map((p) => p.y));
	const sx = (v: number) => pad + ((v - minX) / (maxX - minX)) * (W - pad * 2);
	const sy = (v: number) => H - pad - ((v - minY) / (maxY - minY)) * (H - pad * 2);
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div ref={box}>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible">
				{[0.25, 0.5, 0.75, 1].map((f) => (
					<g key={f} style={{ opacity: shown ? 1 : 0, transition: `opacity 500ms ease ${f * 300}ms` }}>
						<line x1={pad} x2={W - pad} y1={sy(minY + (maxY - minY) * f)} y2={sy(minY + (maxY - minY) * f)} strokeDasharray="3 5" style={{ stroke: LINE }} />
						<line y1={pad} y2={H - pad} x1={sx(minX + (maxX - minX) * f)} x2={sx(minX + (maxX - minX) * f)} strokeDasharray="3 5" style={{ stroke: LINE }} />
					</g>
				))}
				<path d={`M${pad},${pad - 6} V${H - pad} H${W - pad + 6}`} fill="none" strokeWidth="2" pathLength={1} style={{ stroke: INK, ...draw(shown, 100, 900) }} />
				{axisX && <text x={W - pad} y={H - pad + 22} textAnchor="end" fontSize="11" style={{ fill: shade(55) }}>{axisX}</text>}
				{axisY && <text x={pad - 6} y={pad - 14} fontSize="11" style={{ fill: shade(55) }}>{axisY}</text>}
				{pts.map((p, i) => {
					const d = 500 + i * 120;
					return (
						<g key={i} className="[&:hover_circle]:scale-125">
							<circle cx={sx(p.x)} cy={sy(p.y)} r="5" style={{ fill: pts.some((q) => q.hot) ? (p.hot ? INK : SOFT) : i % 2 ? SOFT : INK, transition: "transform 200ms", ...pop(shown, d) }} />
							<text x={sx(p.x) + (sx(p.x) > W * 0.7 ? -11 : 11)} y={sy(p.y)} textAnchor={sx(p.x) > W * 0.7 ? "end" : "start"} dominantBaseline="middle" fontSize="11.5" fontWeight="600" style={{ fill: INK, opacity: shown ? 1 : 0, transition: `opacity 400ms ease ${d + 150}ms` }}>
								{p.label}
							</text>
						</g>
					);
				})}
			</svg>
			</div>
		</Frame>
	);
}

// ─── 22. Cards with a mini chart ────────────────────────────────────────────

function Sparklines({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div className={`group/c grid gap-2 ${data.rows.length >= 3 ? "@xl:grid-cols-3" : "@md:grid-cols-2"}`}>
				{data.rows.map((r, i) => {
					const vals = numList(r.value);
					const first = vals[0] ?? 0;
					const last = vals[vals.length - 1] ?? 0;
					const delta = first ? Math.round(((last - first) / first) * 100) : 0;
					const max = Math.max(...vals, 1);
					const min = Math.min(...vals, 0);
					const span = max - min || 1;
					const W = 160;
					const H = 44;
					const path = vals.map((v, k) => `${k ? "L" : "M"}${(k / Math.max(1, vals.length - 1)) * W},${H - 4 - ((v - min) / span) * (H - 8)}`).join(" ");
					const d = 150 + i * 150;
					return (
						<div key={i} className={`rounded-xl border-2 border-foreground px-3 py-2 ${dimOthers}`} style={rise(shown, d)}>
							<div className="flex items-start justify-between gap-2">
								<span className="text-[11.5px] leading-snug text-muted-foreground">{r.label}</span>
								{first !== 0 && (
									<span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background" style={pop(shown, d + 1100)}>
										{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
									</span>
								)}
							</div>
							<div className="mt-1 text-[18px] font-black leading-none tabular-nums">
								<Counter value={String(last)} run={shown} delay={d} />
							</div>
							<svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 h-9 w-full overflow-visible" preserveAspectRatio="none">
								<path d={`${path} L${W},${H} L0,${H} Z`} style={{ fill: shade(7), opacity: shown ? 1 : 0, transition: `opacity 700ms ease ${d + 800}ms` }} />
								<path d={path} fill="none" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" pathLength={1} style={{ stroke: INK, ...draw(shown, d + 200, 1300) }} />
							</svg>
						</div>
					);
				})}
			</div>
		</Frame>
	);
}

// ─── 23. Network of links ───────────────────────────────────────────────────

function splitEdge(label: string): [string, string] | null {
	const m = label.split(/\s*(?:->|→)\s*/);
	return m.length >= 2 && m[0] && m[1] ? [m[0], m[1]] : null;
}

function Network({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const edges = data.rows.map((r) => ({ e: splitEdge(r.label), label: r.value })).filter((x): x is { e: [string, string]; label: string } => !!x.e);
	const names: string[] = [];
	for (const { e } of edges) for (const v of e) if (!names.includes(v)) names.push(v);
	const degree = names.map((nm) => edges.filter(({ e }) => e.includes(nm)).length);
	const hubIdx = degree.indexOf(Math.max(...degree));
	const useHub = names.length > 3 && degree[hubIdx] >= names.length - 1;
	const [box, W] = useWidth();
	const H = Math.round(Math.min(270, Math.max(200, W * 0.58)));
	const ring = names.filter((_, i) => !(useHub && i === hubIdx));
	const posOf = (nm: string) => {
		if (useHub && nm === names[hubIdx]) return { x: W / 2, y: H / 2 };
		const k = ring.indexOf(nm);
		const a = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(1, ring.length);
		return { x: W / 2 + Math.cos(a) * (W / 2 - 62), y: H / 2 + Math.sin(a) * (H / 2 - 24) };
	};
	const order = (nm: string) => (useHub && nm === names[hubIdx] ? 0 : ring.indexOf(nm) + 1);
	const marker = useId().replace(/:/g, "");
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div ref={box}>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible">
				<defs>
					<marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M1 1 L9 5 L1 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: shade(60) }} />
					</marker>
				</defs>
				{edges.map(({ e: [a, b], label }, i) => {
					const p = posOf(a);
					const q = posOf(b);
					const wq = 14 + b.length * 6.6;
					// The arrow end at the edge of the node, not at the center.
					const dx = q.x - p.x;
					const dy = q.y - p.y;
					const len = Math.hypot(dx, dy) || 1;
					const cut = Math.min(len / 2, Math.abs(dx / len) * (wq / 2) + Math.abs(dy / len) * 14 + 6);
					const ex = q.x - (dx / len) * cut;
					const ey = q.y - (dy / len) * cut;
					const d = 500 + i * 160;
					return (
						<g key={i}>
							<path d={`M${p.x},${p.y} L${ex},${ey}`} strokeWidth="1.8" pathLength={1} markerEnd={shown ? `url(#${marker})` : undefined} style={{ stroke: shade(45), ...draw(shown, d, 700) }} />
							{label && (
								<text x={(p.x + ex) / 2} y={(p.y + ey) / 2 - 6} textAnchor="middle" fontSize="10.5" style={{ fill: shade(60), paintOrder: "stroke", stroke: PAPER, strokeWidth: 4, opacity: shown ? 1 : 0, transition: `opacity 400ms ease ${d + 500}ms` }}>
									{label}
								</text>
							)}
						</g>
					);
				})}
				{names.map((nm, i) => {
					const p = posOf(nm);
					const w = 14 + nm.length * 6.6;
					const hub = useHub && i === hubIdx;
					const d = 150 + order(nm) * 90;
					return (
						<g key={nm} style={pop(shown, d)}>
							<rect x={p.x - w / 2} y={p.y - 14} width={w} height="28" rx="14" strokeWidth="2" style={{ fill: hub ? INK : PAPER, stroke: INK }} />
							<text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" style={{ fill: hub ? PAPER : INK }}>
								{nm}
							</text>
						</g>
					);
				})}
			</svg>
			</div>
		</Frame>
	);
}

// ─── 24. Sequence diagram ───────────────────────────────────────────────────

function Sequence({ data }: { data: ChartData }) {
	const [ref, shown] = useInView<HTMLElement>();
	const msgs = data.rows.map((r) => ({ e: splitEdge(r.label), text: r.value })).filter((x): x is { e: [string, string]; text: string } => !!x.e);
	const actors: string[] = [];
	for (const { e } of msgs) for (const v of e) if (!actors.includes(v)) actors.push(v);
	const [box, W] = useWidth();
	const top = 40;
	const step = 38;
	const H = top + msgs.length * step + 18;
	const pad = Math.min(64, W * 0.14);
	const x = (nm: string) => (actors.length <= 1 ? W / 2 : pad + (actors.indexOf(nm) * (W - pad * 2)) / (actors.length - 1));
	const marker = useId().replace(/:/g, "");
	return (
		<Frame title={data.title} note={data.note} shown={shown} innerRef={ref}>
			<div ref={box}>
			<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full overflow-visible">
				<defs>
					<marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
						<path d="M1 1 L9 5 L1 9" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: INK }} />
					</marker>
				</defs>
				{actors.map((a, i) => {
					const w = Math.max(70, 18 + a.length * 7);
					return (
						<g key={a}>
							<line x1={x(a)} x2={x(a)} y1={top - 4} y2={H - 8} strokeDasharray="3 5" pathLength={1} style={{ stroke: LINE, strokeDashoffset: 0, opacity: shown ? 1 : 0, transition: `opacity 600ms ease ${300 + i * 100}ms` }} />
							<g style={pop(shown, 100 + i * 110)}>
								<rect x={x(a) - w / 2} y="6" width={w} height="30" rx="9" strokeWidth="2" style={{ fill: i === 0 ? INK : PAPER, stroke: INK }} />
								<text x={x(a)} y="21" textAnchor="middle" dominantBaseline="central" fontSize="12.5" fontWeight="700" style={{ fill: i === 0 ? PAPER : INK }}>
									{a}
								</text>
							</g>
						</g>
					);
				})}
				{msgs.map(({ e: [a, b], text }, i) => {
					const y = top + 26 + i * step;
					const x1 = x(a);
					const x2 = x(b);
					const d = 600 + i * 380;
					const self = a === b;
					const path = self ? `M${x1},${y - 8} h34 v16 h-30` : `M${x1},${y} L${x2 + (x2 > x1 ? -4 : 4)},${y}`;
					return (
						<g key={i}>
							<path d={path} fill="none" strokeWidth="2" strokeDasharray={undefined} pathLength={1} markerEnd={shown ? `url(#${marker})` : undefined} style={{ stroke: INK, ...draw(shown, d, 600) }} />
							<text x={self ? x1 + 42 : (x1 + x2) / 2} y={self ? y : y - 9} textAnchor={self ? "start" : "middle"} dominantBaseline={self ? "middle" : "auto"} fontSize="11.5" fontWeight="600" style={{ fill: INK, opacity: shown ? 1 : 0, transition: `opacity 400ms ease ${d + 300}ms` }}>
								{text}
							</text>
						</g>
					);
				})}
			</svg>
			</div>
		</Frame>
	);
}

export function WorkChart({ kind, lines }: { kind: ChartKind; lines: string[] }) {
	const data = parseChart(lines);
	if (!data.rows.length) return null;
	switch (kind) {
		case "stats":
			return <Stats data={data} />;
		case "bars":
			return <Bars data={data} />;
		case "columns":
			return <Columns data={data} />;
		case "donut":
			return <Donut data={data} />;
		case "progress":
			return <Progress data={data} />;
		case "line":
			return <Line data={data} />;
		case "flow":
			return <Flow data={data} />;
		case "compare":
			return <Compare data={data} />;
		case "funnel":
			return <Funnel data={data} />;
		case "timeline":
			return <Timeline data={data} />;
		case "waffle":
			return <Waffle data={data} />;
		case "layers":
			return <Layers data={data} />;
		case "stacked":
			return <Stacked data={data} />;
		case "radar":
			return <Radar data={data} />;
		case "gauge":
			return <Gauge data={data} />;
		case "heatmap":
			return <Heatmap data={data} />;
		case "tree":
			return <Tree data={data} />;
		case "cycle":
			return <Cycle data={data} />;
		case "checklist":
			return <Checklist data={data} />;
		case "scatter":
			return <Scatter data={data} />;
		case "sparklines":
			return <Sparklines data={data} />;
		case "network":
			return <Network data={data} />;
		case "sequence":
			return <Sequence data={data} />;
	}
}
