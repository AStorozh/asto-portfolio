import "./globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getAllSiteImages, getNavigation, getUiTexts } from "@/lib/content";
import { buildTranslations, getLang, withLang } from "@/lib/lang";
import { LangProvider } from "@/lib/lang-context";
import { CallProvider } from "./ai-assistant/call-context";
import { CustomCursor } from "./custom-cursor";
import { SiteHeader } from "./site-header";
import { AnalyticsTracker } from "./analytics-tracker";

const inter = Inter({
	subsets: ["latin", "cyrillic"],
	display: "swap",
	variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
	const siteImgs = await getAllSiteImages();
	const favicon = siteImgs["favicon"];
	return {
		title: "Portfolio",
		description: "Personal portfolio",
		...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
	};
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const [navItems, lang, rawUiTexts, siteImgs] = await Promise.all([
		getNavigation(),
		getLang(),
		getUiTexts(),
		getAllSiteImages(),
	]);
	const t = buildTranslations(rawUiTexts, lang);
	const navLabels = withLang(
		Object.fromEntries(navItems.map((n) => [n.key, n.label])),
		lang,
	);

	return (
		<html lang={lang} className={inter.variable} suppressHydrationWarning>
			<body className="font-sans antialiased">
				<LangProvider lang={lang} t={t}>
					<CallProvider>
						<SiteHeader navLabels={navLabels} defaultLang={lang} logoUrl={siteImgs["logo"]} />
						{children}
						<CustomCursor />
						<AnalyticsTracker />
					</CallProvider>
				</LangProvider>
			</body>
		</html>
	);
}
