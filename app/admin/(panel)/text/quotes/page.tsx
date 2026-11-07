import { addQuote, deleteQuote, saveQuotes } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { quotes } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

export default async function AdminTextQuotesPage() {
	const allQuotes = await db.select().from(quotes).orderBy(asc(quotes.id));

	const ruQuotes = allQuotes.filter((q) => !/__(en|de)$/.test(q.slug));
	const enBySlug = Object.fromEntries(
		allQuotes
			.filter((q) => q.slug.endsWith("__en"))
			.map((q) => [q.slug.replace("__en", ""), q]),
	);
	const deBySlug = Object.fromEntries(
		allQuotes
			.filter((q) => q.slug.endsWith("__de"))
			.map((q) => [q.slug.replace("__de", ""), q]),
	);

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader
				title="Цитаты"
				description={`${ruQuotes.length} ${ruQuotes.length === 1 ? "цитата" : ruQuotes.length < 5 ? "цитаты" : "цитат"} · смена каждые 10 сек`}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-4">

					{ruQuotes.length === 0 && (
						<p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
							Нет ни одной цитаты. Добавьте первую ↓
						</p>
					)}

					{ruQuotes.map((q, idx) => {
						const qEn = enBySlug[q.slug];
						const qDe = deBySlug[q.slug];
						return (
							<div
								key={q.id}
								className="flex flex-col gap-3 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
							>
								<div className="flex items-center justify-between">
									<span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										#{idx + 1}
									</span>
									<form action={deleteQuote}>
										<input type="hidden" name="id" value={q.id} />
										<button
											type="submit"
											className="rounded-lg border border-border/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground transition-colors hover:border-red-400/60 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
										>
											Удалить
										</button>
									</form>
								</div>
								<KVForm
									fields={[
										{ key: `quote_${q.id}_text`,   label: "Текст цитаты", value: q.text,   enValue: qEn?.text   ?? "", deValue: qDe?.text   ?? "", multiline: true },
										{ key: `quote_${q.id}_author`, label: "Автор",         value: q.author, enValue: qEn?.author ?? "", deValue: qDe?.author ?? "" },
									]}
									action={saveQuotes}
								/>
							</div>
						);
					})}

					{/* ── Add a quote ── */}
					<div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-foreground/30 bg-transparent p-4 transition-colors hover:border-foreground/50">
						<span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
							Новая цитата
						</span>
						<form action={addQuote} className="flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-semibold tracking-wide text-muted-foreground">
									Текст цитаты
								</label>
								<textarea
									name="text"
									rows={2}
									required
									placeholder="Лучший способ предсказать будущее — создать его."
									className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/40 focus:ring-0"
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label className="text-[11px] font-semibold tracking-wide text-muted-foreground">
									Автор
								</label>
								<input
									type="text"
									name="author"
									required
									placeholder="Alan Kay"
									className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/40 focus:ring-0"
								/>
							</div>
							<button
								type="submit"
								className="self-end rounded-xl border-2 border-foreground bg-foreground px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
							>
								+ Добавить
							</button>
						</form>
					</div>

				</div>
			</div>
		</div>
	);
}
