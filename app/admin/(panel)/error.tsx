"use client";

import { useEffect } from "react";

export default function AdminPanelError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Visible in the browser console - for diagnostics.
		console.error("Admin panel error:", error);
	}, [error]);

	return (
		<div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
			<h2 className="text-lg font-bold text-foreground">Что-то пошло не так</h2>
			<p className="max-w-xl break-words text-sm text-muted-foreground">
				{error?.message || "Неизвестная ошибка"}
			</p>
			<button
				type="button"
				onClick={() => reset()}
				className="rounded-full border-2 border-foreground bg-foreground px-6 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
			>
				Повторить
			</button>
		</div>
	);
}
