// Shared by the "Works" section forms: data types and field classes. Used to live
// in a single file with three forms, 640 lines long.

export type CategoryData = { id: number; slug: string; label: string; label_en?: string | null; label_de?: string | null };

export type WorkData = {
	id: number;
	slug: string;
	title: string;
	title_en: string;
	title_de: string;
	category: string;
	categoryIds: number[];
	featured: boolean;
	description: string;
	description_en: string;
	description_de: string;
	overview: string;
	overview_en: string;
	overview_de: string;
	tools: string[];
	tools_en: string[];
	tools_de: string[];
	images: { url: string; storageKey: string }[];
	results: string[];
	results_en: string[];
	results_de: string[];
	links: { url: string; label: string }[];
};


export const inputClass =
	"h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-foreground outline-none focus:border-foreground transition-colors";
export const textareaClass =
	"w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground transition-colors";
export const labelClass = "flex flex-col gap-1.5";
export const labelTextClass = "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground";
export const langBadge = "mb-1 inline-block text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50";

// ─── Category Manager ─────────────────────────────────────────────────────────

