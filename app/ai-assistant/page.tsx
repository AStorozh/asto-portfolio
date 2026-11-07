import { getPageHeroForLang } from "@/lib/content";
import { getLang } from "@/lib/lang";
import { AssistantChat } from "./assistant-chat";

export default async function AiAssistantPage({
	searchParams,
}: {
	searchParams: Promise<{ work?: string; from?: string; mode?: string }>;
}) {
	const lang = await getLang();
	// In the DB this page's header is stored under the key "ai_assistant" (with an underscore),
	// so we request exactly that - otherwise the hero is not found and a hardcoded fallback is used.
	const [hero, sp] = await Promise.all([getPageHeroForLang("ai_assistant", lang), searchParams]);
	const fallbackTitle = lang === "en" ? "AI-ASSISTANT" : lang === "de" ? "KI-ASSISTENT" : "AI-АССИСТЕНТ";
	const ariaLabel = lang === "en" ? "AI-assistant" : lang === "de" ? "KI-Assistent" : "AI-ассистент";
	return (
		<main
			className="h-[calc(100dvh-4rem)] min-h-0 overflow-hidden px-5 py-5"
			aria-label={ariaLabel}
		>
			<section className="flex h-full min-h-0 flex-col">
				<div
					data-block="ai ассистент рабочая область"
					className="min-h-0 flex-1"
				>
					<AssistantChat heroTitle={hero?.title ?? fallbackTitle} initialWork={sp.work} initialWorkUrl={sp.from} initialMode={sp.mode} />
				</div>
			</section>
		</main>
	);
}
