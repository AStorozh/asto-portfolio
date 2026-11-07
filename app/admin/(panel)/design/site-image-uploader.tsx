"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SiteImageUploaderProps {
	slot: string;
	currentUrl: string | null;
	accept?: string;
	hint?: string;
}

export function SiteImageUploader({
	slot,
	currentUrl,
	accept = "image/png,image/svg+xml,image/webp,image/jpeg",
	hint,
}: SiteImageUploaderProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	async function handleFile(file: File) {
		setError(null);
		setSaved(false);
		setPreview(URL.createObjectURL(file));
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append("file", file);
			fd.append("slot", slot);
			const res = await fetch("/api/site-images/upload", { method: "POST", body: fd });
			const data = await res.json() as { url?: string; error?: string };
			if (!res.ok || data.error) {
				setError(data.error ?? "Ошибка загрузки");
				setPreview(null);
				return;
			}
			setSaved(true);
			router.refresh();
		} catch {
			setError("Ошибка сети");
			setPreview(null);
		} finally {
			setUploading(false);
		}
	}

	const displayUrl = preview ?? currentUrl;

	return (
		<div className="flex flex-col gap-3">
			<label
				className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-5 transition-colors hover:border-foreground/40 hover:bg-muted/40"
				onDragOver={(e) => e.preventDefault()}
				onDrop={(e) => {
					e.preventDefault();
					const file = e.dataTransfer.files[0];
					if (file) handleFile(file);
				}}
			>
				{uploading ? (
					<>
						<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
						<span className="text-[12px] text-muted-foreground">Загрузка…</span>
					</>
				) : displayUrl ? (
					<>
						<img src={displayUrl} alt="" className="h-10 w-auto max-w-[10rem] rounded object-contain" />
						<span className="text-[11px] text-muted-foreground">{preview ? "Загружен ✓" : "Заменить"}</span>
					</>
				) : (
					<>
						<span className="text-2xl text-muted-foreground/40">↑</span>
						<span className="text-center text-[12px] text-muted-foreground">
							Перетащите файл сюда<br />или нажмите для выбора
						</span>
					</>
				)}
				<input
					type="file"
					accept={accept}
					className="sr-only"
					disabled={uploading}
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) handleFile(file);
					}}
				/>
			</label>

			{saved && <p className="text-[12px] font-medium text-green-600">Сохранено и применено на сайте ✓</p>}
			{error && <p className="text-[12px] font-medium text-red-500">{error}</p>}
			{hint && <p className="text-[11px] leading-relaxed text-muted-foreground/60">{hint}</p>}
		</div>
	);
}
