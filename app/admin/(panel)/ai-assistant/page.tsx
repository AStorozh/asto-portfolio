import { getAiSettings } from "@/lib/content";
import { getAiKnowledge } from "@/lib/ai-context";
import { AiSettingsForm } from "./ai-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminAiAssistantPage() {
	const [settings, knowledge] = await Promise.all([getAiSettings(), getAiKnowledge()]);
	const webKeyPresent = Boolean(process.env.TAVILY_API_KEY);
	const openAiKeyPresent = Boolean(process.env.OPENAI_API_KEY);

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-3 sm:px-6 sm:py-4">
				<h1 className="text-base font-bold">AI-ассистент — настройка</h1>
				<p className="mt-0.5 text-[12px] text-muted-foreground">
					Управление «мозгом»: характер, инструкции трёх режимов, модель и веб-поиск.
					Тексты интерфейса (приветствия, кнопки) — в разделе{" "}
					<span className="font-mono">Текст → AI-ассистент</span>.
				</p>
				{!openAiKeyPresent && (
					<p className="mt-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] text-red-700">
						⚠ Не задан <span className="font-mono">OPENAI_API_KEY</span> в .env.local — ассистент пока не сможет отвечать.
					</p>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<AiSettingsForm settings={settings} knowledge={knowledge} webKeyPresent={webKeyPresent} />
			</div>
		</div>
	);
}
