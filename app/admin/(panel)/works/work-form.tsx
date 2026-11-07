"use client";

import { useRef, useState, useTransition } from "react";
import { createWork, deleteWork, updateWork } from "@/app/actions/works-actions";
import { slugify } from "@/lib/slug";
import { FormFields } from "./work-form-fields";
import { type CategoryData, type WorkData } from "./form-shared";

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFiles(
	files: File[],
	onDone: (items: { url: string; storageKey: string }[]) => void,
	fileInput: HTMLInputElement | null,
) {
	const uploaded: { url: string; storageKey: string }[] = [];
	for (const file of files) {
		const fd = new FormData();
		fd.append("file", file);
		const res = await fetch("/api/works/upload", { method: "POST", body: fd });
		const data = (await res.json()) as { url?: string; storageKey?: string };
		if (data.url) uploaded.push({ url: data.url, storageKey: data.storageKey ?? "" });
	}
	onDone(uploaded);
	if (fileInput) fileInput.value = "";
}

// ─── Create form ──────────────────────────────────────────────────────────────

export function WorkCreateForm({ categories }: { categories: CategoryData[] }) {
	const [images, setImages] = useState<{ url: string; storageKey: string }[]>([]);
	const [uploading, setUploading] = useState(false);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const [slug, setSlug] = useState("");
	const slugEdited = useRef(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const [overviewReset, setOverviewReset] = useState(0);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? []);
		if (!files.length) return;
		setUploading(true);
		await uploadFiles(files, (items) => setImages((p) => [...p, ...items]), fileInputRef.current);
		setUploading(false);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		fd.set("image_urls", images.map((i) => i.url).join(","));
		fd.set("storage_keys", images.map((i) => i.storageKey).join(","));
		startTransition(async () => {
			await createWork(fd);
			setSaved(true);
			setImages([]);
			setSlug("");
			slugEdited.current = false;
			setOverviewReset((n) => n + 1);
			formRef.current?.reset();
			setTimeout(() => setSaved(false), 3000);
		});
	}

	return (
		<details className="group rounded-2xl border-2 border-dashed border-foreground/25">
			<summary className="flex cursor-pointer select-none items-center gap-3 rounded-2xl px-4 py-3 hover:bg-muted/30 transition-colors">
				<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">+</span>
				<span className="text-sm font-bold">Создать работу</span>
			</summary>
			<form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border/70 px-3 pb-5 pt-4 sm:px-4">
				<FormFields
					categories={categories}
					images={images}
					uploading={uploading}
					onFileChange={handleFileChange}
					onRemoveImage={(url) => setImages((p) => p.filter((i) => i.url !== url))}
					fileInputRef={fileInputRef}
					slug={slug}
					onSlugChange={(v) => { slugEdited.current = true; setSlug(v); }}
					onTitleChange={(v) => { if (!slugEdited.current) setSlug(slugify(v)); }}
					overviewResetSignal={overviewReset}
				/>
				<div className="flex items-center gap-3 pt-1">
					<button
						type="submit"
						disabled={pending || uploading}
						className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						{pending ? "Создание…" : "Создать работу"}
					</button>
					{saved && <span className="text-sm font-medium text-green-600">Создано ✓</span>}
				</div>
			</form>
		</details>
	);
}

// ─── Edit form ────────────────────────────────────────────────────────────────

export function WorkEditForm({ work, categories }: { work: WorkData; categories: CategoryData[] }) {
	const [images, setImages] = useState<{ url: string; storageKey: string }[]>(work.images);
	const [uploading, setUploading] = useState(false);
	const [pending, startTransition] = useTransition();
	const [saved, setSaved] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [slug, setSlug] = useState(work.slug === "-" ? "" : work.slug);
	const slugEdited = useRef(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? []);
		if (!files.length) return;
		setUploading(true);
		await uploadFiles(files, (items) => setImages((p) => [...p, ...items]), fileInputRef.current);
		setUploading(false);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		fd.set("image_urls", images.map((i) => i.url).join(","));
		fd.set("storage_keys", images.map((i) => i.storageKey).join(","));
		startTransition(async () => {
			await updateWork(fd);
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		});
	}

	function handleDelete() {
		if (!confirmDelete) {
			setConfirmDelete(true);
			setTimeout(() => setConfirmDelete(false), 4000);
			return;
		}
		const fd = new FormData();
		fd.set("id", work.id.toString());
		fd.set("slug", work.slug);
		startTransition(async () => {
			await deleteWork(fd);
		});
	}

	return (
		<details className="group rounded-2xl border border-border/70">
			<summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-2xl px-3 py-3 sm:gap-3 sm:px-4 hover:bg-muted/30 transition-colors">
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-sm font-semibold leading-snug">{work.title}</span>
					<span className="text-[11px] text-muted-foreground">{work.category}</span>
				</div>
				<div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
					<span className="hidden text-[11px] text-muted-foreground sm:inline">{work.images.length} фото</span>
					<button
						type="button"
						onClick={(e) => { e.preventDefault(); handleDelete(); }}
						disabled={pending}
						className={`inline-flex h-8 items-center justify-center rounded-xl border px-3 text-[11px] sm:h-7 font-medium transition-colors disabled:opacity-40 ${
							confirmDelete
								? "border-red-400 bg-red-50 text-red-600"
								: "border-border/70 text-muted-foreground hover:border-red-300 hover:text-red-500"
						}`}
					>
						{confirmDelete ? "Подтвердить" : "Удалить"}
					</button>
					<span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▼</span>
				</div>
			</summary>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border/70 px-3 pb-5 pt-4 sm:px-4">
				<input type="hidden" name="id" value={work.id} />

				<FormFields
					work={work}
					categories={categories}
					images={images}
					uploading={uploading}
					onFileChange={handleFileChange}
					onRemoveImage={(url) => setImages((p) => p.filter((i) => i.url !== url))}
					fileInputRef={fileInputRef}
					slug={slug}
					onSlugChange={(v) => { slugEdited.current = true; setSlug(v); }}
					onTitleChange={(v) => { if (!slugEdited.current) setSlug(slugify(v)); }}
				/>

				<div className="flex items-center gap-3 pt-1">
					<button
						type="submit"
						disabled={pending || uploading}
						className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						{pending ? "Сохранение…" : "Сохранить"}
					</button>
					{saved && <span className="text-sm font-medium text-green-600">Сохранено ✓</span>}
				</div>
			</form>
		</details>
	);
}
