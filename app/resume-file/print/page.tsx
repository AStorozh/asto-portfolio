import { ResumeFileDocument } from "../page";
import { AutoPrint } from "./auto-print";

export default async function ResumePrintPage({
	searchParams,
}: {
	searchParams: Promise<{ lang?: string }>;
}) {
	const { lang } = await searchParams;
	const langOverride = lang === "en" ? "en" : lang === "de" ? "de" : lang === "ru" ? "ru" : undefined;
	return (
		<>
			<AutoPrint />
			<ResumeFileDocument embedded lang={langOverride} />
		</>
	);
}
