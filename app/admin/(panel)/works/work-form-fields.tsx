"use client";

import { WorkOverviewEditor } from "./work-overview-editor";
import { WorkLinksEditor } from "./work-links-editor";
import { inputClass, textareaClass, labelClass, labelTextClass, langBadge, type CategoryData, type WorkData } from "./form-shared";

export function FormFields({
	work,
	categories,
	images,
	uploading,
	onFileChange,
	onRemoveImage,
	fileInputRef,
	slug,
	onSlugChange,
	onTitleChange,
	overviewResetSignal = 0,
}: {
	work?: WorkData;
	categories: CategoryData[];
	images: { url: string; storageKey: string }[];
	uploading: boolean;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onRemoveImage: (url: string) => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	slug: string;
	onSlugChange: (v: string) => void;
	onTitleChange: (v: string) => void;
	overviewResetSignal?: number;
}) {
	return (
		<>
			<label className={labelClass}>
				<span className={labelTextClass}>Заголовок</span>
				<div className="grid gap-2 sm:grid-cols-3">
					<div className="flex flex-col">
						<span className={langBadge}>RU</span>
						<input
							name="title"
							type="text"
							required
							defaultValue={work?.title}
							onChange={(e) => onTitleChange(e.target.value)}
							placeholder="ETL-витрина для финансов"
							className={inputClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>EN</span>
						<input
							name="title_en"
							type="text"
							defaultValue={work?.title_en}
							placeholder="ETL dashboard for finance"
							className={inputClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>DE</span>
						<input
							name="title_de"
							type="text"
							defaultValue={work?.title_de}
							placeholder="ETL-Dashboard für Finanzen"
							className={inputClass}
						/>
					</div>
				</div>
			</label>

			<label className={labelClass}>
				<span className={labelTextClass}>URL-адрес страницы</span>
				<div className="flex items-center gap-2">
					<span className="shrink-0 font-mono text-[11px] text-muted-foreground/50">/works/</span>
					<input
						name="slug"
						type="text"
						value={slug}
						onChange={(e) => onSlugChange(e.target.value)}
						placeholder="generiruetsya-iz-zagolovka"
						className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 font-mono text-[13px] text-foreground outline-none focus:border-foreground"
					/>
				</div>
				<span className="text-[10px] text-muted-foreground/50">
					Предлагается автоматически по заголовку. Можно изменить вручную — только латиница, цифры и дефисы.
				</span>
			</label>

			<div className={labelClass}>
				<span className={labelTextClass}>Разделы / категории (можно несколько)</span>
				{categories.length === 0 ? (
					<span className="text-[12px] text-muted-foreground/70">Сначала добавьте категории в блоке «Категории» выше.</span>
				) : (
					<div className="flex flex-wrap gap-2">
						{categories.map((cat) => (
							<label
								key={cat.id}
								className="relative inline-flex cursor-pointer select-none items-center gap-2 overflow-hidden rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-foreground/40 has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background"
							>
								<input
									type="checkbox"
									name="category_id"
									value={cat.id}
									defaultChecked={work?.categoryIds?.includes(cat.id) ?? false}
									className="absolute inset-0 m-0 cursor-pointer appearance-none opacity-0"
								/>
								{cat.label}
							</label>
						))}
					</div>
				)}
				<span className="text-[10px] text-muted-foreground/50">
					Работа появится в фильтре каждой выбранной категории. Перевод названий (EN) задаётся в блоке «Категории» выше.
				</span>
			</div>

			<div className={labelClass}>
				<span className={labelTextClass}>Важность</span>
				<label className="flex max-w-full cursor-pointer items-center gap-2.5 rounded-2xl sm:w-max border border-border/70 bg-background px-4 py-2.5 transition-colors hover:border-foreground/40 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-400/10">
					<input
						type="checkbox"
						name="featured"
						value="true"
						defaultChecked={work?.featured ?? false}
						className="h-4 w-4 shrink-0 accent-amber-500"
					/>
					<span className="text-[13px] font-semibold text-foreground">★ Важная работа — выделить на сайте</span>
				</label>
				<span className="text-[10px] text-muted-foreground/50">
					Карточка получит золотой акцент и бейдж «Важное», чтобы привлечь внимание.
				</span>
			</div>

			<label className={labelClass}>
				<span className={labelTextClass}>Подзаголовок (краткое описание)</span>
				<div className="grid gap-2 sm:grid-cols-3">
					<div className="flex flex-col">
						<span className={langBadge}>RU</span>
						<textarea
							name="description"
							defaultValue={work?.description}
							rows={2}
							placeholder="Одна–две строки, которые видны в карточке и под заголовком на странице"
							className={textareaClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>EN</span>
						<textarea
							name="description_en"
							defaultValue={work?.description_en}
							rows={2}
							placeholder="One or two lines shown on the card and under the title"
							className={textareaClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>DE</span>
						<textarea
							name="description_de"
							defaultValue={work?.description_de}
							rows={2}
							placeholder="Ein bis zwei Zeilen für Karte und Titel"
							className={textareaClass}
						/>
					</div>
				</div>
			</label>

			<div className={labelClass}>
				<span className={labelTextClass}>Ссылки на работу (сайт, GitHub…)</span>
				<WorkLinksEditor initial={work?.links ?? []} resetSignal={overviewResetSignal} />
			</div>

			<div className={labelClass}>
				<span className={labelTextClass}>Описание работы (блок «О проекте»)</span>
				<WorkOverviewEditor
					initialRu={work?.overview ?? ""}
					initialEn={work?.overview_en ?? ""}
					initialDe={work?.overview_de ?? ""}
					resetSignal={overviewResetSignal}
				/>
			</div>

			{/* Image upload */}
			<div className={labelClass}>
				<span className={labelTextClass}>Фото работы</span>
				<div className="flex flex-col gap-3">
					{images.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{images.map(({ url }, i) => (
								<div key={url} className="group relative">
									<img
										src={url}
										alt={`Изображение ${i + 1}`}
										className="h-20 w-32 rounded-xl object-cover border border-border/70"
									/>
									<button
										type="button"
										onClick={() => onRemoveImage(url)}
										className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
										aria-label="Удалить фото"
									>
										✕
									</button>
								</div>
							))}
						</div>
					)}
					<label className="relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:border-foreground/40 hover:bg-muted/40 transition-colors">
						{uploading ? (
							<span>Загрузка…</span>
						) : (
							<span>{images.length > 0 ? "Добавить ещё фото" : "Выбрать фото"} — можно несколько</span>
						)}
						{/* input is transparent and fills the label (not sr-only) - otherwise, when
						    focus returns after choosing a file, the browser scrolls the page down to it. */}
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
							onChange={onFileChange}
							disabled={uploading}
						/>
					</label>
				</div>
			</div>

			<label className={labelClass}>
				<span className={labelTextClass}>Используемые инструменты (через запятую)</span>
				<div className="grid gap-2 sm:grid-cols-3">
					<div className="flex flex-col">
						<span className={langBadge}>RU</span>
						<input
							name="tools"
							type="text"
							defaultValue={work?.tools.join(", ")}
							placeholder="Python, Airflow, ClickHouse, S3"
							className={inputClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>EN</span>
						<input
							name="tools_en"
							type="text"
							defaultValue={work?.tools_en.join(", ")}
							placeholder="Same order; leave empty to keep as is"
							className={inputClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>DE</span>
						<input
							name="tools_de"
							type="text"
							defaultValue={work?.tools_de.join(", ")}
							placeholder="Gleiche Reihenfolge; leer = unverändert"
							className={inputClass}
						/>
					</div>
				</div>
				<span className="text-[10px] text-muted-foreground/50">
					Порядок и количество должны совпадать с RU. Технические названия (Python, S3) можно не переводить.
				</span>
			</label>

			<label className={labelClass}>
				<span className={labelTextClass}>Результат (каждый пункт с новой строки)</span>
				<div className="grid gap-2 sm:grid-cols-3">
					<div className="flex flex-col">
						<span className={langBadge}>RU</span>
						<textarea
							name="results"
							defaultValue={work?.results.join("\n")}
							rows={4}
							placeholder={"Пункт первый\nПункт второй\nПункт третий"}
							className={textareaClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>EN</span>
						<textarea
							name="results_en"
							defaultValue={work?.results_en.join("\n")}
							rows={4}
							placeholder={"Point one\nPoint two\nPoint three"}
							className={textareaClass}
						/>
					</div>
					<div className="flex flex-col">
						<span className={langBadge}>DE</span>
						<textarea
							name="results_de"
							defaultValue={work?.results_de.join("\n")}
							rows={4}
							placeholder={"Punkt eins\nPunkt zwei\nPunkt drei"}
							className={textareaClass}
						/>
					</div>
				</div>
				<span className="text-[10px] text-muted-foreground/50">
					Тот же порядок строк, что и в RU.
				</span>
			</label>
		</>
	);
}

