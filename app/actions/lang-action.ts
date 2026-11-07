"use server";

import { cookies } from "next/headers";

export async function setLangCookie(lang: string) {
	const value = lang === "en" ? "en" : lang === "de" ? "de" : "ru";
	(await cookies()).set("lang", value, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: "lax",
	});
}
