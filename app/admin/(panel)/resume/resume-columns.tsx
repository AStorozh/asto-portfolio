"use client";

import { useState, type ReactNode } from "react";

const collapsedBar =
	"flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-foreground/15 bg-muted/40 p-3 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground lg:w-12 lg:flex-col lg:py-5";
const heading = "text-sm font-extrabold uppercase tracking-[0.14em] text-foreground";
const toggleBtn =
	"inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground";

function CollapsedColumn({ title, onOpen }: { title: string; onOpen: () => void }) {
	return (
		<button type="button" onClick={onOpen} className={collapsedBar} aria-label={`Развернуть: ${title}`}>
			<span className="text-base leading-none">»</span>
			<span className="text-[11px] font-bold uppercase tracking-[0.18em] lg:hidden">{title} — развернуть</span>
			<span className="hidden rotate-180 text-[11px] font-bold uppercase tracking-[0.2em] [writing-mode:vertical-rl] lg:inline">
				{title}
			</span>
		</button>
	);
}

export function ResumeColumns({
	leftTitle,
	rightTitle,
	left,
	right,
}: {
	leftTitle: string;
	rightTitle: string;
	left: ReactNode;
	right: ReactNode;
}) {
	const [leftOpen, setLeftOpen] = useState(true);
	const [rightOpen, setRightOpen] = useState(true);

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:items-start">
			{leftOpen ? (
				<div className="min-w-0 flex-1">
					<div className="mb-4 flex items-center justify-between gap-2">
						<p className={heading}>{leftTitle}</p>
						<button type="button" onClick={() => setLeftOpen(false)} className={toggleBtn}>
							Свернуть «
						</button>
					</div>
					{left}
				</div>
			) : (
				<CollapsedColumn title={leftTitle} onOpen={() => setLeftOpen(true)} />
			)}

			{rightOpen ? (
				<div className="min-w-0 flex-1">
					<div className="mb-4 flex items-center justify-between gap-2">
						<p className={heading}>{rightTitle}</p>
						<button type="button" onClick={() => setRightOpen(false)} className={toggleBtn}>
							Свернуть »
						</button>
					</div>
					{right}
				</div>
			) : (
				<CollapsedColumn title={rightTitle} onOpen={() => setRightOpen(true)} />
			)}
		</div>
	);
}
