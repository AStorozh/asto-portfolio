import { Suspense } from "react";
import { getAllSiteImages } from "@/lib/content";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage() {
	const siteImgs = await getAllSiteImages();
	return (
		<Suspense fallback={null}>
			<AdminLoginForm logoUrl={siteImgs["logo"] ?? null} />
		</Suspense>
	);
}
