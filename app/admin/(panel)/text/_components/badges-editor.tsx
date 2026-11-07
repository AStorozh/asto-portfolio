import { addHomeBadge, deleteHomeBadge } from "@/app/actions/text-actions";

interface BadgesEditorProps {
	block: string;
	badges: string[];
	label?: string;
}

export function BadgesEditor({ block, badges, label = "Бейджи" }: BadgesEditorProps) {
	return (
		<div className="flex flex-col gap-3">
			<span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
				{label}
			</span>

			<div className="flex flex-wrap gap-2 min-h-[2.5rem]">
				{badges.length === 0 && (
					<span className="text-xs text-muted-foreground/50 italic">Нет бейджей</span>
				)}
				{badges.map((badge) => (
					<form key={badge} action={deleteHomeBadge}>
						<input type="hidden" name="block" value={block} />
						<input type="hidden" name="text" value={badge} />
						<button
							type="submit"
							className="group inline-flex items-center gap-1.5 rounded-md border border-foreground/20 bg-foreground/[0.06] px-3 py-1 text-xs font-semibold tracking-wide text-foreground transition-colors hover:border-red-400/50 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
						>
							{badge}
							<span className="text-[10px] opacity-40 group-hover:opacity-100" aria-hidden>×</span>
						</button>
					</form>
				))}
			</div>

			<form action={addHomeBadge} className="flex gap-2">
				<input type="hidden" name="block" value={block} />
				<input type="hidden" name="existing" value={badges.join("\n")} />
				<input
					type="text"
					name="text"
					required
					placeholder="Новый бейдж…"
					className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/40"
				/>
				<button
					type="submit"
					className="rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-muted/30"
				>
					+ Добавить
				</button>
			</form>
		</div>
	);
}
