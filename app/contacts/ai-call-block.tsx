"use client";

import { useCall } from "../ai-assistant/call-context";

function formatDuration(seconds: number) {
	const m = Math.floor(seconds / 60).toString().padStart(2, "0");
	const s = (seconds % 60).toString().padStart(2, "0");
	return `${m}:${s}`;
}

type Lang = "ru" | "en" | "de";

const CALL_T: Record<Lang, { end: string; connecting: string; start: string; call: string }> = {
	ru: { end: "НАЖМИТЕ, ЧТОБЫ ЗАВЕРШИТЬ", connecting: "СОЕДИНЕНИЕ…", start: "НАЖМИТЕ, ЧТОБЫ ПОЗВОНИТЬ", call: "ЗВОНОК" },
	en: { end: "CLICK TO END", connecting: "CONNECTING…", start: "CLICK TO CALL", call: "CALL" },
	de: { end: "KLICKEN ZUM BEENDEN", connecting: "VERBINDUNG…", start: "KLICKEN ZUM ANRUFEN", call: "ANRUF" },
};

export function AiCallBlock({
	label,
	description,
	zIndex,
	lang = "ru",
}: {
	label: string;
	description: string;
	zIndex: number;
	lang?: Lang;
}) {
	const call = useCall();
	const ct = CALL_T[lang] ?? CALL_T.ru;

	const topLabel =
		call.status === "active"
			? ct.end
			: call.status === "connecting"
			? ct.connecting
			: ct.start;

	const rightText =
		call.status === "active"
			? `${ct.call} ${formatDuration(call.seconds)}`
			: call.status === "connecting"
			? ct.connecting
			: description;

	return (
		<button
			type="button"
			data-block="контакты ai ассистент"
			onClick={call.toggle}
			aria-label={lang === "en" ? "Call the AI-assistant" : lang === "de" ? "Den KI-Assistenten anrufen" : "Позвонить AI-ассистенту"}
			style={{ zIndex }}
			className="ai-surface group relative h-[17.7dvh] min-h-[6rem] shrink-0 rounded-3xl border border-yellow-100/30 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_18px_55px_rgba(217,160,78,0.25)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 lg:h-auto lg:flex-1 lg:min-h-0 lg:shrink lg:-mt-16"
		>
			<div className="flex h-full flex-col p-5">
				<div className="hidden items-center gap-2 sm:flex">
					{call.status !== "idle" && (
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
						</span>
					)}
					<span className="text-[11px] font-semibold tracking-[0.18em] text-white/60">{topLabel}</span>
				</div>
				<div className="mt-auto flex items-baseline justify-between gap-4 pr-14">
					<h2 className="text-4xl font-extrabold tracking-[0.01em] sm:text-5xl md:text-6xl">{label}</h2>
					<span className="hidden text-right text-xs font-medium uppercase leading-relaxed tracking-[0.12em] text-white/65 tabular-nums sm:inline">
						{rightText}
					</span>
				</div>
				<span className="absolute bottom-5 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-transform group-hover:translate-x-0.5">
					{call.status === "active" ? (
						<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white" aria-hidden>
							<rect x="6" y="6" width="12" height="12" rx="2" />
						</svg>
					) : (
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white" aria-hidden>
							<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
						</svg>
					)}
				</span>
			</div>
		</button>
	);
}
