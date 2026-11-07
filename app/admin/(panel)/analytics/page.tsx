import Link from "next/link";
import { AnalyticsControls } from "./controls";
import { LinksManager } from "./links-manager";
import { SheetSync } from "./sheet-sync";
import { ClearAnalyticsButton } from "./clear-button";
import { TrendChart } from "./trend-chart";
import { DAY_NAMES } from "@/lib/analytics-insights";
import { fmtDuration } from "@/lib/analytics-visits";
import { loadDashboard } from "./dashboard-data";

export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0);

const card =
	"rounded-2xl border-2 border-foreground bg-background p-4 sm:p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]";
const sectionTitle = "text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; link?: string; from?: string; to?: string }> }) {
	const {
		scope,
		qs,
		linkGroups,
		sheetUrl,
		linkRows,
		labelByCode,
		scopeCards,
		chartDays,
		chartSeries,
		chartValues,
		chartLabels,
		secByPath,
		totalSecs,
		topPages,
		topWorks,
		sources,
		devices,
		geo,
		funnel,
		visits,
		behavior,
		returns,
		times,
		maxHour,
		maxDay,
		recent,
		scopeLabel,
		kpis,
		avgSecs,
		fmtTime,
	} = await loadDashboard(searchParams);

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
				<div>
					<h1 className="text-base font-bold">Аналитика</h1>
					<p className="mt-0.5 text-[12px] text-muted-foreground">Посещаемость и конверсии · по ссылкам</p>
				</div>
				<AnalyticsControls />
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-7">

					{/* ── Export to Google Sheets ── */}
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-foreground bg-background px-4 py-3 sm:px-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div>
							<p className="text-[13px] font-bold">Выгрузка в Google-таблицу</p>
							<p className="text-[11px] text-muted-foreground">
								Обновляется автоматически каждый час · или вручную кнопкой
							</p>
						</div>
						<SheetSync sheetUrl={sheetUrl} />
					</div>

					{/* ── 1. Sources: compact chips by section, scroll inside the box ── */}
					<section className="flex flex-col gap-2">
						<p className={sectionTitle}>Источники — выберите для детального анализа</p>
						<div className="max-h-56 overflow-y-auto overscroll-contain rounded-2xl border-2 border-foreground/15 p-2 sm:max-h-64">
							{(() => {
								const known = new Set(linkGroups.map((g) => g.id));
								const fixed = scopeCards.filter((c) => c.key === "all" || c.key === "direct");
								const blocks = [
									{ name: "", items: fixed },
									...linkGroups.map((g) => ({ name: g.name, items: scopeCards.filter((c) => c.group === g.id) })),
									{
										name: "Без раздела",
										items: scopeCards.filter((c) => c.key !== "all" && c.key !== "direct" && (!c.group || !known.has(c.group))),
									},
								].filter((b) => b.items.length > 0);
								return blocks.map((b) => (
									<div key={b.name || "_"} className="mb-2 last:mb-0">
										{b.name && <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80">{b.name}</p>}
										<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
											{b.items.map((c) => {
												const active = c.key === scope;
												return (
													<Link
														key={c.key}
														href={qs(c.key)}
														title={`резюме ${c.s.resume} · скачали ${c.s.downloads} · AI ${c.s.ai} · контакты ${c.s.contacts}`}
														className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-[12px] transition-colors ${
															active
																? "border-foreground bg-foreground text-background"
																: "border-foreground/15 bg-background hover:border-foreground"
														}`}
													>
														<span className="min-w-0 truncate font-semibold">
															{b.name && c.label.startsWith(`${b.name} · `) ? c.label.slice(b.name.length + 3) : c.label}
														</span>
														<span className={`shrink-0 font-black tabular-nums ${active ? "" : c.s.visitors ? "" : "text-muted-foreground/50"}`}>
															{c.s.visitors.toLocaleString("ru")}
														</span>
													</Link>
												);
											})}
										</div>
									</div>
								));
							})()}
						</div>
						<p className="text-[11px] text-muted-foreground/70">Число справа: посетители за период. Подробности выбранного источника ниже.</p>
					</section>

					{/* ── 2. Details for the selected source ── */}
					<section className="flex flex-col gap-3">
						<p className={sectionTitle}>Детально · {scopeLabel}</p>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
							{kpis.map((k) => (
								<div key={k.label} className={`rounded-2xl border-2 p-4 ${k.accent ? "border-amber-400/70 bg-amber-50/40" : "border-foreground bg-background"}`}>
									<div className="text-2xl font-black tracking-tight">{k.value.toLocaleString("ru")}</div>
									<div className="mt-0.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">{k.label}</div>
								</div>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{fmtTime(totalSecs)}</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Всего времени на страницах</div>
							</div>
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{fmtTime(avgSecs)}</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">В среднем на просмотр</div>
							</div>
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{fmtTime(secByPath.get("/ai-assistant") ?? 0)}</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Из них в AI-ассистенте</div>
							</div>
						</div>

						<div className={card}>
							<TrendChart
								days={chartDays}
								labels={chartLabels}
								series={chartSeries}
								values={chartValues}
								scopeKey={scope}
								scopeLabel={scopeLabel}
							/>
						</div>

						{/* Funnel */}
						<div className={card}>
							<p className={`${sectionTitle} mb-3`}>Воронка</p>
							<div className="grid grid-cols-3 gap-3">
								<Funnel label="Зашли" value={n(funnel?.v_all)} base={n(funnel?.v_all)} />
								<Funnel label="Смотрели резюме" value={n(funnel?.v_resume)} base={n(funnel?.v_all)} />
								<Funnel label="Целевое действие" value={n(funnel?.v_action)} base={n(funnel?.v_all)} accent />
							</div>
						</div>
					</section>

					{/* ── 3. Breakdown (collapsible, open by default) ── */}
					<details open className="group">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							<span className="transition-transform group-open:rotate-90">▸</span> Разбивка
						</summary>
						<div className="mt-3 grid gap-4 lg:grid-cols-2">
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Топ страниц <span className="normal-case tracking-normal text-muted-foreground/60">· просмотры и время</span></p>
								<List items={topPages.map((p) => ({ name: p.path || "—", value: n(p.views), hint: fmtTime(secByPath.get(p.path ?? "") ?? 0) }))} />
							</div>
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Топ работ <span className="normal-case tracking-normal text-muted-foreground/60">· просмотры и время</span></p>
								<List items={topWorks.map((p) => ({ name: p.path || "—", value: n(p.views), hint: fmtTime(secByPath.get(p.path ?? "") ?? 0) }))} />
							</div>
							<div className={card}><p className={`${sectionTitle} mb-3`}>Источники перехода</p><List items={sources.map((s) => ({ name: shortRef(s.src), value: n(s.visits) }))} /></div>
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Устройства и страны</p>
								<div className="grid grid-cols-2 gap-4">
									<List items={devices.map((d) => ({ name: d.device, value: n(d.visitors) }))} />
									<List items={geo.map((g) => ({ name: g.country, value: n(g.visitors) }))} />
								</div>
							</div>
						</div>
					</details>

					{/* ── 4. Link management ── */}
					<details open className="group">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							<span className="transition-transform group-open:rotate-90">▸</span> Ссылки с метками
						</summary>
						<div className={`mt-3 ${card}`}>
							<p className="mb-3 text-[12px] text-muted-foreground">
								Отдельная ссылка для каждой аудитории — статистику смотрите выше, выбрав карточку. У ссылки «Я»
								трекинг выключен: переходы по ней не записываются вообще.
							</p>
							<LinksManager links={linkRows} groups={linkGroups} />
						</div>
					</details>

					{/* ── 4.5 Behavior ── */}
					<details open className="group">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							<span className="transition-transform group-open:rotate-90">▸</span> Поведение
						</summary>

						<div className="mt-3 grid gap-3 sm:grid-cols-4">
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{behavior.bounceRate}%</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Отказы</div>
								<div className="mt-1 text-[11px] text-muted-foreground/70">{behavior.bounces} из {behavior.visits} · одна страница и меньше 10 с</div>
							</div>
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{behavior.avgPages}</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Страниц за визит</div>
								<div className="mt-1 text-[11px] text-muted-foreground/70">в среднем {fmtDuration(behavior.avgSecs)} на визит</div>
							</div>
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{behavior.actionRate}%</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Дошли до действия</div>
								<div className="mt-1 text-[11px] text-muted-foreground/70">{behavior.withAction} визитов · резюме, контакты или AI</div>
							</div>
							<div className={`${card} !p-3 sm:!p-4`}>
								<div className="text-2xl font-black tracking-tight">{behavior.pagesToAction || "—"}</div>
								<div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Страниц до действия</div>
								<div className="mt-1 text-[11px] text-muted-foreground/70">и {fmtDuration(behavior.secsToAction)} от входа</div>
							</div>
						</div>

						<div className="mt-3 grid gap-4 lg:grid-cols-2">
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Где уходят <span className="normal-case tracking-normal text-muted-foreground/60">· последняя страница визита</span></p>
								<List items={behavior.exits.slice(0, 8).map((e) => ({ name: e.path, value: e.count }))} />
							</div>
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Возвраты</p>
								<div className="grid grid-cols-3 gap-3">
									<div><div className="text-xl font-black">{returns.repeatRate}%</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">приходили снова</div></div>
									<div><div className="text-xl font-black">{returns.avgVisits}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">визитов на гостя</div></div>
									<div><div className="text-xl font-black">{returns.repeat}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">повторных гостей</div></div>
								</div>
								<p className="mt-3 text-[11px] text-muted-foreground/70">
									Гость определяется суточным анонимным хэшем, поэтому возврат на следующий день считается новым
									гостем. Цифра показывает возвраты в пределах суток и заведомо ниже реальной.
								</p>
							</div>
						</div>

						<div className="mt-3 grid gap-4 lg:grid-cols-2">
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Часы активности <span className="normal-case tracking-normal text-muted-foreground/60">· МСК</span></p>
								<div className="flex h-24 items-end gap-[3px]">
									{times.hours.map((v, h) => (
										<div key={h} className="flex flex-1 flex-col items-center gap-1">
											<div className="flex w-full flex-1 items-end">
												<div className="w-full rounded-t bg-foreground" style={{ height: `${Math.max(2, (v / maxHour) * 100)}%` }} title={`${h}:00 — ${v}`} />
											</div>
											{h % 3 === 0 && <span className="text-[8px] text-muted-foreground/60">{h}</span>}
										</div>
									))}
								</div>
							</div>
							<div className={card}>
								<p className={`${sectionTitle} mb-3`}>Дни недели</p>
								<div className="flex h-24 items-end gap-2">
									{times.days.map((v, i) => (
										<div key={i} className="flex flex-1 flex-col items-center gap-1">
											<div className="flex w-full flex-1 items-end">
												<div className="w-full rounded-t bg-foreground" style={{ height: `${Math.max(2, (v / maxDay) * 100)}%` }} title={`${DAY_NAMES[i]} — ${v}`} />
											</div>
											<span className="text-[9px] text-muted-foreground/60">{DAY_NAMES[i]}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</details>

					{/* ── 5. Visits (each entry separately) ── */}
					<details open className="group">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							<span className="transition-transform group-open:rotate-90">▸</span> Визиты · {visits.length}
							{visits.length > 60 && <span className="font-normal normal-case tracking-normal opacity-60">показаны последние 60</span>}
						</summary>
						<div className={`mt-3 ${card}`}>
							<p className="mb-3 text-[12px] text-muted-foreground">
								Каждый заход на сайт: когда пришли, по какой ссылке, что смотрели и сколько времени. Гость — анонимный
								суточный идентификатор (хэш), по нему видно повторные заходы, но не личность. Разверните строку, чтобы
								увидеть маршрут по страницам.
							</p>
							{visits.length === 0 ? (
								<p className="py-6 text-center text-sm text-muted-foreground">Визитов за период нет</p>
							) : (
								<div className="flex flex-col gap-1.5">
									{visits.slice(0, 60).map((v) => (
										<details key={v.session_id} className="rounded-xl border border-border/50 bg-muted/10 open:bg-muted/25">
											<summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12px]">
												<span className="whitespace-nowrap font-semibold tabular-nums">
													{new Date(v.started).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
												</span>
												<span className="rounded-full border border-foreground/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
													{v.link_code ? (labelByCode.get(v.link_code) ?? v.link_code) : "прямой"}
												</span>
												<span className="text-muted-foreground">
													гость {v.visitor}
													{v.returning && <span className="ml-1 text-amber-600" title="Приходил и раньше">↻</span>}
												</span>
												<span className="text-muted-foreground">{[v.device, v.country, v.lang].filter(Boolean).join(" · ") || "—"}</span>
												<span className="ml-auto whitespace-nowrap font-semibold">{v.pages.length} стр · {fmtDuration(v.secs)}</span>
												<span className="whitespace-nowrap text-[11px] text-muted-foreground">
													{[
														v.downloads ? `↓ резюме ${v.downloads}` : "",
														v.contacts ? `контакты ${v.contacts}` : "",
														v.ai_messages ? `AI ${v.ai_messages}` : "",
														v.ai_calls ? `звонок ${v.ai_calls}` : "",
													].filter(Boolean).join(" · ")}
												</span>
											</summary>
											<div className="border-t border-border/40 px-3 py-2">
												{v.referrer && (
													<p className="mb-2 text-[11px] text-muted-foreground">Пришёл с: {shortRef(v.referrer)}</p>
												)}
												{v.outbound.length > 0 && (
													<p className="mb-2 text-[11px] text-muted-foreground">Ушёл по ссылкам: {v.outbound.map((u) => u.replace(/^https?:\/\/(www\.)?/, "")).join(", ")}</p>
												)}
												<ol className="flex flex-col gap-1">
													{v.pages.map((p, i) => (
														<li key={p.path} className="flex items-center gap-2 text-[12px]">
															<span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground/60">{i + 1}.</span>
															<span className="min-w-0 flex-1 truncate">{p.path}</span>
															{p.views > 1 && <span className="shrink-0 text-[10px] text-muted-foreground">×{p.views}</span>}
															<span className="shrink-0 tabular-nums text-muted-foreground">{fmtDuration(p.secs)}</span>
														</li>
													))}
												</ol>
											</div>
										</details>
									))}
								</div>
							)}
						</div>
					</details>

					{/* ── 6. Latest events ── */}
					<details className="group">
						<summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
							<span className="transition-transform group-open:rotate-90">▸</span> Последние события
						</summary>
						<div className={`mt-3 ${card}`}>
							{recent.length === 0 ? (
								<p className="py-6 text-center text-sm text-muted-foreground">Событий пока нет</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-left text-[12px]">
										<thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
											<tr><th className="py-1.5 pr-3">Время</th><th className="py-1.5 pr-3">Событие</th><th className="py-1.5 pr-3">Страница</th><th className="py-1.5 pr-3">Метка</th><th className="py-1.5 pr-3">Устр.</th></tr>
										</thead>
										<tbody>
											{recent.map((e, i) => (
												<tr key={i} className="border-t border-border/40">
													<td className="whitespace-nowrap py-1.5 pr-3 text-muted-foreground">{new Date(e.created_at).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
													<td className="py-1.5 pr-3 font-medium">{eventLabel(e.type)}{e.meta ? ` · ${e.meta}` : ""}</td>
													<td className="max-w-[180px] truncate py-1.5 pr-3 text-muted-foreground">{e.path || "—"}</td>
													<td className="py-1.5 pr-3 text-muted-foreground">{e.link_code ? (labelByCode.get(e.link_code) ?? e.link_code) : "—"}</td>
													<td className="py-1.5 pr-3 text-muted-foreground">{e.device || "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</details>

					<ClearAnalyticsButton />

				</div>
			</div>
		</div>
	);
}

function Funnel({ label, value, base, accent }: { label: string; value: number; base: number; accent?: boolean }) {
	const pct = base > 0 ? Math.round((value / base) * 100) : 0;
	return (
		<div className={`rounded-xl border-2 p-3 ${accent ? "border-amber-400/70 bg-amber-50/40" : "border-foreground/15 bg-muted/20"}`}>
			<div className="text-xl font-black">{value.toLocaleString("ru")}</div>
			<div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="mt-1 text-[11px] font-bold text-amber-600">{pct}%</div>
		</div>
	);
}

function List({ items }: { items: { name: string; value: number; hint?: string }[] }) {
	const max = Math.max(1, ...items.map((i) => i.value));
	if (items.length === 0) return <p className="py-3 text-sm text-muted-foreground/60">Нет данных</p>;
	return (
		<div className="flex flex-col gap-1.5">
			{items.map((it, i) => (
				<div key={i} className="flex items-center gap-2">
					<div className="relative min-w-0 flex-1">
						<div className="absolute inset-y-0 left-0 rounded bg-muted" style={{ width: `${(it.value / max) * 100}%` }} />
						<span className="relative block truncate px-2 py-1 text-[12px]">{it.name}</span>
					</div>
					<span className="shrink-0 text-[12px] font-bold tabular-nums">{it.value.toLocaleString("ru")}</span>
					{it.hint && <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{it.hint}</span>}
				</div>
			))}
		</div>
	);
}

function shortRef(ref: string): string {
	if (ref === "—") return "Прямые заходы";
	try {
		return new URL(ref).hostname.replace(/^www\./, "");
	} catch {
		return ref.slice(0, 40);
	}
}

function eventLabel(type: string): string {
	const map: Record<string, string> = {
		pageview: "Просмотр",
		resume_download: "Скачал резюме",
		ai_message: "Сообщение AI",
		ai_call: "Звонок AI",
		contact_click: "Клик контакт",
		lang_switch: "Смена языка",
		outbound_click: "Ушёл по внешней ссылке",
	};
	return map[type] ?? type;
}
