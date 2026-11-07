import { Fragment, type ReactNode } from "react";
import { WorkChart } from "./work-charts";
import { isChartKind, type ChartKind } from "./work-chart-kinds";

// Lightweight formatter for a work description (the "About the project" block on a work page).
// Intentionally supports only a subset of the "About me" page markup - just
// headings, lists and emphasis - so the work description stays compact
// and does not turn into a separate "rich" page.
//
//   ## Heading      - section heading (with an accent bar)
//   ### Subheading  - smaller heading
//   - item          - list (arrow marker)
//   **bold**        - emphasis of a key point within a line
//   blank line      - separates paragraphs
//   ```bars … ```   - full-width chart; ```bars right / ```bars left - on the side
//                     with text wrapping (kinds and presets: work-chart-kinds.ts)

type Block =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; items: string[] }
	| { type: "chart"; kind: ChartKind; side: ChartSide; lines: string[] };

// Where the chart sits: full width or on the side, with text wrapping around it.
type ChartSide = "full" | "left" | "right";

function sideOf(word: string | undefined): ChartSide {
	const w = (word ?? "").toLowerCase();
	if (["right", "справа", "rechts"].includes(w)) return "right";
	if (["left", "слева", "links"].includes(w)) return "left";
	return "full";
}

function parseBlocks(src: string): Block[] {
	const lines = src.replace(/\r\n/g, "\n").split("\n");
	const blocks: Block[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length) {
			blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
			paragraph = [];
		}
	};
	const flushList = () => {
		if (list.length) {
			blocks.push({ type: "list", items: list });
			list = [];
		}
	};
	const flushAll = () => {
		flushParagraph();
		flushList();
	};

	let chart: { kind: ChartKind; side: ChartSide; lines: string[] } | null = null;

	for (const raw of lines) {
		const line = raw.trim();

		// Inside the chart block, collect lines up to the closing ```.
		if (chart) {
			if (/^```\s*$/.test(line)) {
				blocks.push({ type: "chart", kind: chart.kind, side: chart.side, lines: chart.lines });
				chart = null;
			} else chart.lines.push(line);
			continue;
		}
		const fence = line.match(/^```\s*([a-z]+)(?:\s+([a-zа-яё]+))?\s*$/i);
		if (fence && isChartKind(fence[1].toLowerCase())) {
			flushAll();
			chart = { kind: fence[1].toLowerCase() as ChartKind, side: sideOf(fence[2]), lines: [] };
			continue;
		}

		if (line === "") {
			flushAll();
			continue;
		}

		const heading = line.match(/^(#{1,3})\s+(.*)$/);
		if (heading) {
			flushAll();
			blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
			continue;
		}

		const bullet = line.match(/^([-—•*])\s+(.*)$/);
		if (bullet) {
			flushParagraph();
			list.push(bullet[2].trim());
			continue;
		}

		flushList();
		paragraph.push(line);
	}

	// An unclosed chart block is still shown.
	if (chart) blocks.push({ type: "chart", kind: chart.kind, side: chart.side, lines: chart.lines });
	flushAll();
	return blocks;
}

function renderInline(text: string): ReactNode[] {
	return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				<strong key={i} className="font-semibold text-foreground">
					{part.slice(2, -2)}
				</strong>
			);
		}
		return <Fragment key={i}>{part}</Fragment>;
	});
}

function renderBlock(block: Block, i: number | string): ReactNode {
			switch (block.type) {
				case "heading": {
					const big = block.level <= 2;
					return (
						<h3
							key={i}
							className={`flex items-center gap-2 ${i !== 0 ? "pt-1" : ""} font-bold tracking-tight text-foreground ${
								big ? "text-[13px] sm:text-sm" : "text-[12px] sm:text-[13px] text-foreground/90"
							}`}
						>
							{big && <span aria-hidden className="h-3.5 w-1 shrink-0 rounded-full bg-foreground/70" />}
							{renderInline(block.text)}
						</h3>
					);
				}

				case "list":
					return (
						<ul key={i} className="flex flex-col gap-1.5">
							{block.items.map((item, j) => (
								<li key={j} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
									<span aria-hidden className="mt-[0.15em] shrink-0 font-bold text-foreground/50">
										→
									</span>
									<span className="min-w-0 flex-1 text-justify hyphens-auto">{renderInline(item)}</span>
								</li>
							))}
						</ul>
					);

				case "chart":
					return (
						<div key={i} className="@container">
							<WorkChart kind={block.kind} lines={block.lines} />
						</div>
					);

				case "paragraph":
					return (
						<p key={i} className="text-justify hyphens-auto text-sm leading-relaxed text-muted-foreground">
							{renderInline(block.text)}
						</p>
					);
			}
}

// A side chart is paired with the text that follows it immediately
// (up to the next heading or chart): two columns, chart on the left or right.
type Item = { kind: "block"; block: Block } | { kind: "pair"; chart: Extract<Block, { type: "chart" }>; text: Block[] };

function groupBlocks(blocks: Block[]): Item[] {
	const items: Item[] = [];
	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i];
		if (b.type === "chart" && b.side !== "full") {
			const text: Block[] = [];
			while (i + 1 < blocks.length && (blocks[i + 1].type === "paragraph" || blocks[i + 1].type === "list")) {
				text.push(blocks[++i]);
			}
			if (text.length) items.push({ kind: "pair", chart: b, text });
			else items.push({ kind: "block", block: b });
		} else items.push({ kind: "block", block: b });
	}
	return items;
}

export function WorkContent({ text }: { text: string }) {
	const blocks = parseBlocks(text);
	if (!blocks.length) return null;

	return (
		<div className="flex flex-col gap-3">
			{groupBlocks(blocks).map((item, i) => {
				if (item.kind === "block") return renderBlock(item.block, i);
				// The chart floats to the side and the text wraps around it: the text indent applies only
				// next to the chart, below it the text goes full width again.
				const float =
					item.chart.side === "left" ? "sm:float-left sm:mr-5" : "sm:float-right sm:ml-5";
				return (
					<div key={i} className="flow-root">
						<div className={`mb-3 sm:mb-2 sm:w-1/2 ${float}`}>{renderBlock(item.chart, "c")}</div>
						{item.text.map((b, k) => (
							<div key={k} className="mb-3 last:mb-0">
								{renderBlock(b, k)}
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

export function workContentIsEmpty(text: string): boolean {
	return parseBlocks(text).length === 0;
}
