import Link from "next/link";
import { Fragment, type ReactNode } from "react";

// Lightweight markdown renderer for assistant replies: links, bold, lists, paragraphs.
// Internal links (starting with "/") → next/link, external → new tab.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
	// Split into links [text](url) and bold **text**
	const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
	return tokens.map((tok, i) => {
		const key = `${keyPrefix}-${i}`;
		const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
		if (link) {
			const [, label, href] = link;
			if (href.startsWith("/")) {
				return (
					<Link key={key} href={href} className="font-medium text-yellow-700 underline underline-offset-2 hover:text-yellow-800">
						{label}
					</Link>
				);
			}
			return (
				<a key={key} href={href} target="_blank" rel="noreferrer" className="font-medium text-yellow-700 underline underline-offset-2 hover:text-yellow-800">
					{label}
				</a>
			);
		}
		if (tok.startsWith("**") && tok.endsWith("**")) {
			return (
				<strong key={key} className="font-semibold">
					{tok.slice(2, -2)}
				</strong>
			);
		}
		return <Fragment key={key}>{tok}</Fragment>;
	});
}

export function MessageContent({ text }: { text: string }) {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const blocks: ReactNode[] = [];
	let list: string[] = [];
	let para: string[] = [];

	const flushList = () => {
		if (!list.length) return;
		const items = [...list];
		blocks.push(
			<ul key={`ul-${blocks.length}`} className="my-1 flex flex-col gap-1 pl-1">
				{items.map((item, j) => (
					<li key={j} className="flex gap-1.5">
						<span aria-hidden className="text-yellow-700">•</span>
						<span>{renderInline(item, `li-${blocks.length}-${j}`)}</span>
					</li>
				))}
			</ul>,
		);
		list = [];
	};
	const flushPara = () => {
		if (!para.length) return;
		const joined = para.join(" ");
		blocks.push(
			<p key={`p-${blocks.length}`} className="break-words">
				{renderInline(joined, `p-${blocks.length}`)}
			</p>,
		);
		para = [];
	};

	for (const raw of lines) {
		const line = raw.trim();
		if (line === "") {
			flushPara();
			flushList();
			continue;
		}
		const bullet = line.match(/^[-*•]\s+(.*)$/);
		if (bullet) {
			flushPara();
			list.push(bullet[1]);
			continue;
		}
		flushList();
		// Reduce markdown headings to a bold paragraph
		const heading = line.match(/^#{1,6}\s+(.*)$/);
		para.push(heading ? `**${heading[1]}**` : line);
	}
	flushPara();
	flushList();

	return <div className="flex flex-col gap-1.5">{blocks}</div>;
}
