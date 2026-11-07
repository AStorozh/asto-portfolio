import { getAllSiteImages } from "@/lib/content";
import { SiteImageUploader } from "./site-image-uploader";

export default async function AdminDesignPage() {
	const siteImgs = await getAllSiteImages();

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
				<h1 className="text-base font-bold">Дизайн</h1>
				<p className="mt-0.5 text-[12px] text-muted-foreground">Настройка внешнего вида сайта</p>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">

					{/* ── Logo ── */}
					<section className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">◈</span>
							<div>
								<p className="text-[13px] font-bold tracking-tight">Логотип в шапке сайта</p>
								<p className="text-[11px] text-muted-foreground">Отображается слева в навигации</p>
							</div>
						</div>

						<div className="flex items-start gap-5">
							{/* Preview on a dark background, as in the header */}
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Как в шапке</span>
								<div className="flex h-14 w-36 items-center gap-1.5 rounded-xl bg-foreground px-4">
									{siteImgs["logo"] && (
										<img
											src={siteImgs["logo"]}
											alt=""
											className="h-4 w-auto object-contain"
										/>
									)}
									<span className="text-xs font-medium text-white/90">.portfolio</span>
								</div>
							</div>
							<div className="flex-1">
								<SiteImageUploader
									slot="logo"
									currentUrl={siteImgs["logo"] ?? null}
									accept="image/png,image/svg+xml,.svg,image/webp,image/jpeg"
									hint="PNG или SVG с прозрачным фоном. Высота отображения — 16–20px."
								/>
							</div>
						</div>
					</section>

					{/* ── Favicon ── */}
					<section className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">★</span>
							<div>
								<p className="text-[13px] font-bold tracking-tight">Favicon (иконка вкладки)</p>
								<p className="text-[11px] text-muted-foreground">Маленькая иконка во вкладке браузера и закладках</p>
							</div>
						</div>

						<div className="flex items-start gap-5">
							{/* Preview as in the tab */}
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Превью</span>
								<div className="flex h-14 w-36 items-center gap-2 rounded-t-xl border border-border/60 bg-muted/40 px-3">
									{siteImgs["favicon"] && (
										<img
											src={siteImgs["favicon"]}
											alt=""
											className="h-4 w-4 shrink-0 rounded-sm object-contain"
										/>
									)}
									<span className="truncate text-[11px] text-muted-foreground">portfolio</span>
									<span className="ml-auto text-muted-foreground/40">✕</span>
								</div>
							</div>
							<div className="flex-1">
								<SiteImageUploader
									slot="favicon"
									currentUrl={siteImgs["favicon"] ?? null}
									accept="image/png,image/svg+xml,.svg,image/x-icon,.ico,image/webp"
									hint="Квадратное изображение (PNG/SVG/ICO), желательно 512×512. Применяется ко всем вкладкам сайта."
								/>
							</div>
						</div>
					</section>

					{/* ── Resume block (home) ── */}
					<section className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">2</span>
							<div>
								<p className="text-[13px] font-bold tracking-tight">Фон блока «Резюме» (главная)</p>
								<p className="text-[11px] text-muted-foreground">Полупрозрачная картинка поверх тёмного фона</p>
							</div>
						</div>

						<div className="flex items-start gap-5">
							{/* Thumbnail as in the block */}
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Превью</span>
								<div className="relative flex h-24 w-36 overflow-hidden rounded-xl bg-foreground">
									{siteImgs["home_resume_bg"] && (
										<img
											src={siteImgs["home_resume_bg"]}
											alt=""
											className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-auto max-w-[55%] select-none object-contain opacity-40"
										/>
									)}
									<div className="relative z-10 flex h-full flex-col justify-end p-3">
										<span className="text-[10px] font-extrabold text-white">РЕЗЮМЕ</span>
									</div>
								</div>
							</div>
							<div className="flex-1">
								<SiteImageUploader
									slot="home_resume_bg"
									currentUrl={siteImgs["home_resume_bg"] ?? null}
									accept="image/png,image/webp,image/jpeg"
									hint="Рекомендуется фото с чёткой композицией. Отображается с прозрачностью ~25% поверх тёмного фона блока."
								/>
							</div>
						</div>
					</section>

					{/* ── Resume background (bottom of the left block) ── */}
					<section className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">3</span>
							<div>
								<p className="text-[13px] font-bold tracking-tight">Фон резюме (низ левого блока)</p>
								<p className="text-[11px] text-muted-foreground">Картинка снизу тёмной колонки в резюме. Можно загрузить ту же, что для блока «Резюме» на главной</p>
							</div>
						</div>

						<div className="flex items-start gap-5">
							{/* Thumbnail as in the left resume block */}
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Превью</span>
								<div className="relative flex h-24 w-36 flex-col justify-start overflow-hidden rounded-xl bg-foreground p-3">
									<span className="relative z-10 text-[10px] font-extrabold text-white/70">КОНТАКТЫ</span>
									{siteImgs["resume_sidebar_bg"] && (
										<>
											<img
												src={siteImgs["resume_sidebar_bg"]}
												alt=""
												className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full select-none object-cover object-bottom opacity-30 grayscale"
											/>
											<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent to-foreground" />
										</>
									)}
								</div>
							</div>
							<div className="flex-1">
								<SiteImageUploader
									slot="resume_sidebar_bg"
									currentUrl={siteImgs["resume_sidebar_bg"] ?? null}
									accept="image/png,image/webp,image/jpeg"
									hint="Отображается снизу тёмной колонки резюме — с прозрачностью ~30%, в ч/б, с плавным затемнением кверху."
								/>
							</div>
						</div>
					</section>

				</div>
			</div>
		</div>
	);
}
