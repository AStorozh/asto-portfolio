"use client";

import { createContext, useContext } from "react";
import type { Lang, Translations } from "./translations";

interface LangContextValue {
	lang: Lang;
	t: Translations;
}

// The default value is empty: the dictionary always arrives as a prop from layout.
// Otherwise all of translations.ts (all three languages) would end up in the client bundle.
const LangContext = createContext<LangContextValue>({
	lang: "ru",
	t: {} as Translations,
});

export function LangProvider({
	lang,
	t,
	children,
}: {
	lang: Lang;
	t: Translations;
	children: React.ReactNode;
}) {
	return <LangContext.Provider value={{ lang, t }}>{children}</LangContext.Provider>;
}

export function useT(): Translations {
	return useContext(LangContext).t;
}

export function useLang(): Lang {
	return useContext(LangContext).lang;
}
