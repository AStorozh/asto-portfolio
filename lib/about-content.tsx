import Link from "next/link";
import { Fragment, type ReactNode } from "react";

// Rich formatter for blocks of the "About me" page.
// Markup that can be managed in the admin panel:
//
//   ## Subheading            - section heading
//   ### Small heading
//   > callout                - accent block (inverted card)
//   :quote: Text — Author    - large quote
//   :stat: 100k+ | rows of data - card with a number (consecutive ones are grouped)
//   :tags: Python, SQL, Excel  - row of tag chips
//   :button: Text | /works/sena - link button (consecutive ones go in a row)
//   - item   /   — item      - list (arrow marker)
//   ---                        - divider
//   **bold**                 - emphasis within a line
//   blank line               - separates paragraphs (the first paragraph is a lead with a drop cap)

type Stat = { value: string; label: string };
type Button = { label: string; href: string };
type Block =
	| { type: "heading"; level: number; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; items: string[] }
	| { type: "callout"; text: string }
	| { type: "quote"; text: string; author?: string }
	| { type: "stats"; items: Stat[] }
	| { type: "tags"; items: string[] }
	| { type: "buttons"; items: Button[] }
	| { type: "divider" };

function parseBlocks(src: string): Block[] {
	const lines = src.replace(/\r\n/g, "\n").split("\n");
	const blocks: Block[] = [];
	let paragraph: string[] = [];
	let list: string[] = [];
	let callout: string[] = [];
	let stats: Stat[] = [];
	let buttons: Button[] = [];

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
	const flushCallout = () => {
		if (callout.length) {
			blocks.push({ type: "callout", text: callout.join(" ").trim() });
			callout = [];
		}
	};
	const flushStats = () => {
		if (stats.length) {
			blocks.push({ type: "stats", items: stats });
			stats = [];
		}
	};
	const flushButtons = () => {
		if (buttons.length) {
			blocks.push({ type: "buttons", items: buttons });
			buttons = [];
		}
	};
	const flushAll = () => {
		flushButtons();
		flushParagraph();
		flushList();
		flushCallout();
		flushStats();
	};

	for (const raw of lines) {
		const line = raw.trim();

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

		if (/^---+$/.test(line)) {
			flushAll();
			blocks.push({ type: "divider" });
			continue;
		}

		const stat = line.match(/^:stat:\s*(.*)$/);
		if (stat) {
			flushParagraph();
			flushList();
			flushCallout();
			const [value, ...rest] = stat[1].split("|");
			stats.push({ value: value.trim(), label: rest.join("|").trim() });
			continue;
		}

		const quote = line.match(/^:quote:\s*(.*)$/);
		if (quote) {
			flushAll();
			const body = quote[1].trim();
			const sep = body.lastIndexOf(" — ");
			if (sep !== -1) {
				blocks.push({ type: "quote", text: body.slice(0, sep).trim(), author: body.slice(sep + 3).trim() });
			} else {
				blocks.push({ type: "quote", text: body });
			}
			continue;
		}

		const button = line.match(/^:button:\s*(.*)$/);
		if (button) {
			flushParagraph();
			flushList();
			flushCallout();
			flushStats();
			const [label, ...rest] = button[1].split("|");
			const href = rest.join("|").trim();
			if (label.trim() && href) buttons.push({ label: label.trim(), href });
			continue;
		}
		flushButtons();

		const tags = line.match(/^:tags:\s*(.*)$/);
		if (tags) {
			flushAll();
			const items = tags[1].split(",").map((t) => t.trim()).filter(Boolean);
			if (items.length) blocks.push({ type: "tags", items });
			continue;
		}

		const calloutLine = line.match(/^>\s*(.*)$/);
		if (calloutLine) {
			flushParagraph();
			flushList();
			flushStats();
			callout.push(calloutLine[1]);
			continue;
		}

		const bullet = line.match(/^([-—•*])\s+(.*)$/);
		if (bullet) {
			flushParagraph();
			flushCallout();
			flushStats();
			list.push(bullet[2].trim());
			continue;
		}

		flushList();
		flushCallout();
		flushStats();
		paragraph.push(line);
	}

	flushAll();
	return blocks;
}

function renderInline(text: string): ReactNode[] {
	return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				<strong key={i} className="font-bold">
					{part.slice(2, -2)}
				</strong>
			);
		}
		return <Fragment key={i}>{part}</Fragment>;
	});
}

export function AboutContent({ text }: { text: string }) {
	const blocks = parseBlocks(text);
	if (!blocks.length) return null;

	let firstParagraphSeen = false;

	return (
		<div className="mx-auto flex max-w-[68ch] flex-col gap-4">
			{blocks.map((block, i) => {
				switch (block.type) {
					case "heading": {
						const big = block.level <= 2;
						return (
							<h2
								key={i}
								className={`flex items-center gap-2.5 font-bold tracking-tight text-foreground ${
									big ? "mt-6 text-xl sm:text-[22px]" : "mt-3 text-[17px] sm:text-lg"
								} ${i === 0 ? "!mt-0" : ""}`}
							>
								{big && <span aria-hidden className="h-[1.1em] w-1 shrink-0 rounded-full bg-foreground" />}
								{renderInline(block.text)}
							</h2>
						);
					}

					case "divider":
						return (
							<div key={i} className="flex items-center gap-3 py-1" aria-hidden>
								<span className="h-px flex-1 bg-foreground/15" />
								<span className="h-1.5 w-1.5 rounded-full bg-foreground/25" />
								<span className="h-px flex-1 bg-foreground/15" />
							</div>
						);

					case "callout":
						return (
							<div
								key={i}
								className="rounded-2xl border border-foreground/10 bg-foreground/[0.045] px-5 py-4 text-foreground"
							>
								<p className="text-justify hyphens-auto text-[15px] leading-[1.65] sm:text-base">
									{renderInline(block.text)}
								</p>
							</div>
						);

					case "quote":
						return (
							<figure
								key={i}
								className="my-2 border-l-[3px] border-foreground py-1 pl-5 sm:pl-6"
							>
								<blockquote className="text-pretty text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-[21px]">
									{renderInline(block.text)}
								</blockquote>
								{block.author && (
									<figcaption className="mt-3 text-sm font-semibold tracking-wide text-muted-foreground">
										— {block.author}
									</figcaption>
								)}
							</figure>
						);

					case "stats":
						return (
							<div
								key={i}
								className={`my-1 grid gap-3 ${block.items.length === 1 ? "grid-cols-1" : block.items.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
							>
								{block.items.map((s, j) => (
									<div
										key={j}
										className="rounded-2xl border border-foreground/15 bg-foreground/[0.03] px-4 py-3.5"
									>
										<div className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
											{s.value}
										</div>
										{s.label && (
											<div className="mt-1 text-[12px] font-medium leading-snug text-muted-foreground">
												{s.label}
											</div>
										)}
									</div>
								))}
							</div>
						);

					case "tags":
						return (
							<div key={i} className="flex flex-wrap gap-2">
								{block.items.map((tag, j) => (
									<span
										key={j}
										className="inline-flex items-center rounded-full border border-foreground/25 bg-muted/40 px-3 py-1 text-[12px] font-semibold tracking-wide text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground"
									>
										{tag}
									</span>
								))}
							</div>
						);

					case "buttons":
						return (
							<div key={i} className="flex flex-wrap gap-2.5">
								{block.items.map((b, j) => {
									const external = /^https?:\/\//.test(b.href);
									const cls =
										"group inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2";
									const inner = (
										<>
											{b.label}
											<span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
										</>
									);
									return external ? (
										<a key={j} href={b.href} target="_blank" rel="noopener noreferrer" className={cls}>
											{inner}
										</a>
									) : (
										<Link key={j} href={b.href} className={cls}>
											{inner}
										</Link>
									);
								})}
							</div>
						);

					case "list":
						return (
							<ul key={i} className="flex flex-col gap-2">
								{block.items.map((item, j) => (
									<li
										key={j}
										className="flex gap-3 text-[15px] leading-[1.65] text-foreground/85 sm:text-base"
									>
										<span aria-hidden className="mt-[0.62em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" />
										<span className="min-w-0 flex-1 text-justify hyphens-auto">{renderInline(item)}</span>
									</li>
								))}
							</ul>
						);

					case "paragraph": {
						// Large lead only if the paragraph opens the text, rather than following headings and skills.
						const isLead = !firstParagraphSeen && i === 0;
						firstParagraphSeen = true;
						if (isLead) {
							return (
								<p
									key={i}
									className="text-justify hyphens-auto text-[17px] font-medium leading-[1.6] text-foreground sm:text-lg"
								>
									{renderInline(block.text)}
								</p>
							);
						}
						return (
							<p
								key={i}
								className="text-justify hyphens-auto text-[15px] leading-[1.65] text-foreground/85 sm:text-base"
							>
								{renderInline(block.text)}
							</p>
						);
					}
				}
			})}
		</div>
	);
}

export function aboutContentIsEmpty(text: string): boolean {
	return parseBlocks(text).length === 0;
}
