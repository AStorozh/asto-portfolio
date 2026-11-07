import { saveNavigation } from "@/app/actions/text-actions";
import { db } from "@/lib/db";
import { siteNavigation } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { KVForm } from "../_components/kv-form";
import { TextPageHeader } from "../_components/page-header";

const NAV_LABELS: Record<string, string> = {
	logo: "Логотип",
	home: "Ссылка: Главная",
	about: "Ссылка: Обо мне",
	works: "Ссылка: Работы",
	resume: "Ссылка: Резюме",
	products: "Ссылка: Продукты",
	contacts: "Ссылка: Контакты",
	ai_assistant: "Ссылка: AI-ассистент",
};

export default async function AdminTextNavigationPage() {
	const items = await db
		.select()
		.from(siteNavigation)
		.orderBy(asc(siteNavigation.sort_order));

	const ruItems = items.filter((item) => !/__(en|de)$/.test(item.key));
	const enByKey = Object.fromEntries(
		items
			.filter((item) => item.key.endsWith("__en"))
			.map((item) => [item.key.replace("__en", ""), item]),
	);
	const deByKey = Object.fromEntries(
		items
			.filter((item) => item.key.endsWith("__de"))
			.map((item) => [item.key.replace("__de", ""), item]),
	);

	const fields = ruItems.map((item) => ({
		key: item.key,
		label: NAV_LABELS[item.key] ?? item.key,
		value: item.label,
		enValue: enByKey[item.key]?.label ?? "",
		deValue: deByKey[item.key]?.label ?? "",
	}));

	return (
		<div className="flex h-full flex-col">
			<TextPageHeader title="Навигация" description="Подписи ссылок в шапке сайта" />
			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-4 rounded-2xl border-2 border-foreground bg-background p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
						<div className="flex items-center gap-3">
							<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground">≡</span>
							<span className="ml-auto font-mono text-[9px] text-muted-foreground/40">site-header</span>
						</div>
						<KVForm fields={fields} action={saveNavigation} />
					</div>
				</div>
			</div>
		</div>
	);
}
