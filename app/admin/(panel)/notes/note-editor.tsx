"use client";

import { saveNote } from "@/app/actions/text-actions";
import { useTransition, useState } from "react";

export function NoteEditor({ initialValue }: { initialValue: string }) {
	const [value, setValue] = useState(initialValue);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);

	function handleSave() {
		const fd = new FormData();
		fd.set("content", value);
		startTransition(async () => {
			await saveNote(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 2000);
		});
	}

	return (
		<div className="flex h-full flex-col gap-4">
			<textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="Напишите что-нибудь…"
				className="min-h-0 flex-1 w-full resize-none rounded-2xl border-2 border-foreground/15 bg-background px-5 py-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-foreground"
			/>
			<div className="flex shrink-0 items-center gap-3">
				<button
					onClick={handleSave}
					disabled={pending}
					className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-6 text-[13px] font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
				>
					{pending ? "Сохранение…" : "Сохранить"}
				</button>
				{saved && (
					<span className="text-[13px] font-medium text-green-600">Сохранено ✓</span>
				)}
			</div>
		</div>
	);
}
