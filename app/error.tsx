"use client";

import { useEffect } from "react";
import { useT } from "@/lib/lang-context";

export default function GlobalSegmentError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const t = useT();
	useEffect(() => {
		console.error("Page error:", error);
	}, [error]);

	return (
		<div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-4 p-6 text-center">
			<h2 className="text-lg font-bold text-foreground">{t.ui_error_title ?? "Что-то пошло не так"}</h2>
			<p className="max-w-xl break-words text-sm text-muted-foreground">
				{error?.message || (t.ui_error_unknown ?? "Неизвестная ошибка")}
			</p>
			<button
				type="button"
				onClick={() => reset()}
				className="rounded-full border-2 border-foreground bg-foreground px-6 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
			>
				{t.ui_error_retry ?? "Повторить"}
			</button>
		</div>
	);
}
