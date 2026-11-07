import Link from "next/link";

interface TextPageHeaderProps {
	title: string;
	description?: string;
}

export function TextPageHeader({ title, description }: TextPageHeaderProps) {
	return (
		<div className="flex shrink-0 items-center gap-4 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
			<div className="flex flex-col gap-0.5">
				<div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
					<Link
						href="/admin/text"
						className="text-muted-foreground transition-colors hover:text-foreground"
					>
						Текст
					</Link>
					<span className="text-muted-foreground/40">/</span>
					<span>{title}</span>
				</div>
				{description && (
					<p className="text-xs text-muted-foreground">{description}</p>
				)}
			</div>
		</div>
	);
}
