// Auth helpers for server actions and route handlers (Node runtime).
// next/headers can be used here - unlike in lib/admin-session.

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";

export async function isAdmin(): Promise<boolean> {
	const store = await cookies();
	return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

// For server actions: throws if the session is invalid. Put it as the first line
// in every mutating action - this is the real backend protection.
export async function requireAdmin(): Promise<void> {
	if (!(await isAdmin())) {
		throw new Error("Unauthorized: требуется вход в админку");
	}
}
