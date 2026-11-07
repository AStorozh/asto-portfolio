"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	createAnalyticsLink,
	deleteAnalyticsLink,
	updateAnalyticsLink,
	toggleAnalyticsLinkTracking,
	createLinkGroup,
	renameLinkGroup,
	deleteLinkGroup,
	moveLinkGroup,
	setLinkGroup,
} from "@/app/actions/analytics-actions";

export type AnalyticsLinkRow = {
	id: number;
	code: string;
	label: string;
	audience: string | null;
	tracking: boolean;
	target: string;
	group_id: number | null;
	visitors: number;
};

export type LinkGroupRow = { id: number; name: string };

// Hints for the "Opens page" field.
const TARGETS = ["/", "/resume-file", "/works", "/about", "/contacts", "/ai-assistant"];

const inputCls =
	"h-9 w-full rounded-lg border border-border/70 bg-background px-2.5 text-[13px] outline-none focus:border-foreground";
const smallBtn =
	"rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40";
const fieldLabel = "text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground";

// Key of the "No section" block (links with group_id = null).
const NONE = 0;

function formData(entries: Record<string, string | number | null>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(entries)) fd.set(k, v == null ? "" : String(v));
	return fd;
}

export function LinksManager({ links, groups }: { links: AnalyticsLinkRow[]; groups: LinkGroupRow[] }) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [label, setLabel] = useState("");
	const [code, setCode] = useState("");
	const [target, setTarget] = useState("/resume-file");
	const [groupId, setGroupId] = useState<number>(NONE);
	const [newGroup, setNewGroup] = useState("");
	const [query, setQuery] = useState("");
	const [copied, setCopied] = useState<string | null>(null);
	const [dragId, setDragId] = useState<number | null>(null);
	const [dropOn, setDropOn] = useState<number | null>(null);

	// take origin only after mount - otherwise the server and client renders
	// differ and a hydration error occurs.
	const [origin, setOrigin] = useState("");
	useEffect(() => setOrigin(window.location.origin), []);
	const linkUrl = (c: string) => `${origin}/${c}`;

	const run = (action: (fd: FormData) => Promise<unknown>, fd: FormData, after?: () => void) =>
		startTransition(async () => {
			await action(fd);
			after?.();
			router.refresh();
		});

	function onCreate(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!label.trim()) return;
		run(createAnalyticsLink, formData({ label, code, target, group_id: groupId || null }), () => {
			setLabel("");
			setCode("");
			setTarget("/resume-file");
		});
	}

	function onCreateGroup(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!newGroup.trim()) return;
		run(createLinkGroup, formData({ name: newGroup }), () => setNewGroup(""));
	}

	const moveLink = (id: number, to: number) => run(setLinkGroup, formData({ id, group_id: to || null }));

	async function copy(c: string) {
		try {
			await navigator.clipboard.writeText(linkUrl(c));
			setCopied(c);
			setTimeout(() => setCopied(null), 1500);
		} catch {
			// ignore
		}
	}

	// Search by name, slug or target page; while searching, empty sections are hidden.
	const q = query.trim().toLowerCase();
	const visible = useMemo(
		() => (q ? links.filter((l) => `${l.label} ${l.code} ${l.target}`.toLowerCase().includes(q)) : links),
		[links, q],
	);
	const known = new Set(groups.map((g) => g.id));
	type Block = { id: number; name: string; group?: LinkGroupRow; items: AnalyticsLinkRow[] };
	const allBlocks: Block[] = [
		...groups.map((g) => ({ id: g.id, name: g.name, group: g, items: visible.filter((l) => l.group_id === g.id) })),
		{ id: NONE, name: "Без раздела", items: visible.filter((l) => !l.group_id || !known.has(l.group_id)) },
	];
	const blocks = allBlocks.filter((b) => (q ? b.items.length > 0 : b.group || b.items.length > 0));

	return (
		<div className="flex flex-col gap-4">
			<datalist id="link-targets">
				{TARGETS.map((t) => (
					<option key={t} value={t} />
				))}
			</datalist>

			{/* Create a link */}
			<form onSubmit={onCreate} className="grid items-end gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
				<label className="flex flex-col gap-1">
					<span className={fieldLabel}>Название</span>
					<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="напр. Резюме для HH" className={inputCls} />
				</label>
				<label className="flex flex-col gap-1">
					<span className={fieldLabel}>Слаг (ссылка)</span>
					<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="artemii-resume" className={`${inputCls} font-mono`} />
				</label>
				<label className="flex flex-col gap-1">
					<span className={fieldLabel}>Открывает страницу</span>
					<input value={target} onChange={(e) => setTarget(e.target.value)} list="link-targets" placeholder="/resume-file" className={`${inputCls} font-mono`} />
				</label>
				<label className="flex flex-col gap-1">
					<span className={fieldLabel}>Раздел</span>
					<GroupSelect groups={groups} value={groupId} onChange={setGroupId} />
				</label>
				<button type="submit" disabled={pending || !label.trim()} className="h-9 rounded-lg bg-foreground px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-80 disabled:opacity-40">
					+ Создать
				</button>
			</form>
			<p className="-mt-2 text-[11px] text-muted-foreground/70">
				Ссылка получится вида <span className="break-all font-mono">{origin}/<span className="text-foreground">слаг</span></span>. Слаг — латиница, цифры и дефис.
				Не используйте слаги реальных разделов (resume, works, about, contacts, ai-assistant).
			</p>

			{/* Search and a new section */}
			<div className="flex flex-col gap-2 sm:flex-row">
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Найти ссылку: название, слаг или страница"
					className={`${inputCls} sm:flex-1`}
					type="search"
				/>
				<form onSubmit={onCreateGroup} className="flex gap-2 sm:w-80">
					<input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="Новый раздел" className={inputCls} />
					<button type="submit" disabled={pending || !newGroup.trim()} className="h-9 shrink-0 rounded-lg border-2 border-foreground px-3 text-[12px] font-bold transition-opacity hover:opacity-80 disabled:opacity-40">
						+ Раздел
					</button>
				</form>
			</div>
			<p className="-mt-2 text-[11px] text-muted-foreground/70">
				Ссылку можно перетащить мышью в другой раздел или выбрать раздел в её строке.
			</p>

			{links.length === 0 ? (
				<p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
					Пока нет ссылок. Создайте первую ↑
				</p>
			) : blocks.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">Ничего не найдено</p>
			) : (
				<div className="flex flex-col gap-3">
					{blocks.map((b, bi) => (
						<details
							key={b.id}
							// Sections start collapsed so the list stays short; a search opens the ones with matches.
							open={q ? true : undefined}
							onDragOver={(e) => {
								if (dragId == null) return;
								e.preventDefault();
								setDropOn(b.id);
							}}
							onDragLeave={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOn((d) => (d === b.id ? null : d));
							}}
							onDrop={(e) => {
								e.preventDefault();
								const link = links.find((l) => l.id === dragId);
								setDropOn(null);
								setDragId(null);
								if (link && (link.group_id ?? NONE) !== b.id) moveLink(link.id, b.id);
							}}
							className={`group/sec rounded-2xl border-2 transition-colors ${
								dropOn === b.id ? "border-foreground bg-muted/40" : "border-border/60 bg-muted/10"
							}`}
						>
							<summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5">
								<span className="text-muted-foreground transition-transform group-open/sec:rotate-90">▸</span>
								<GroupTitle block={b} pending={pending} onRename={(name) => run(renameLinkGroup, formData({ id: b.id, name }))} />
								<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">{b.items.length}</span>
								{b.group && !q && (
									<span className="ml-auto flex items-center gap-1" onClick={(e) => e.preventDefault()}>
										<button type="button" disabled={pending || bi === 0} onClick={() => run(moveLinkGroup, formData({ id: b.id, dir: -1 }))} className={smallBtn} aria-label="Раздел выше">↑</button>
										<button type="button" disabled={pending || bi >= groups.length - 1} onClick={() => run(moveLinkGroup, formData({ id: b.id, dir: 1 }))} className={smallBtn} aria-label="Раздел ниже">↓</button>
										<button
											type="button"
											disabled={pending}
											onClick={() => {
												if (confirm(`Удалить раздел «${b.name}»? Ссылки из него перейдут в «Без раздела».`)) run(deleteLinkGroup, formData({ id: b.id }));
											}}
											className={`${smallBtn} hover:border-red-400/60 hover:text-red-500`}
										>
											Удалить
										</button>
									</span>
								)}
							</summary>
							<div className="flex flex-col gap-2 px-2 pb-2 sm:px-3 sm:pb-3">
								{b.items.length === 0 ? (
									<p className="rounded-xl border border-dashed border-border/60 px-3 py-3 text-center text-[12px] text-muted-foreground">
										Пусто. Перетащите сюда ссылку или выберите этот раздел в её строке.
									</p>
								) : (
									b.items.map((l) => (
										<LinkRow
											key={l.id}
											link={l}
											groups={groups}
											pending={pending}
											copied={copied === l.code}
											url={linkUrl(l.code)}
											dragging={dragId === l.id}
											onDragStart={() => setDragId(l.id)}
											onDragEnd={() => {
												setDragId(null);
												setDropOn(null);
											}}
											onCopy={() => copy(l.code)}
											onMove={(to) => moveLink(l.id, to)}
											onToggle={() => run(toggleAnalyticsLinkTracking, formData({ id: l.id, tracking: String(!l.tracking) }))}
											onDelete={() => {
												if (confirm(`Удалить ссылку «${l.label || l.code}»?`)) run(deleteAnalyticsLink, formData({ id: l.id }));
											}}
											onSave={(fd, done) => run(updateAnalyticsLink, fd, done)}
										/>
									))
								)}
							</div>
						</details>
					))}
				</div>
			)}
		</div>
	);
}

function GroupSelect({ groups, value, onChange }: { groups: LinkGroupRow[]; value: number; onChange: (v: number) => void }) {
	return (
		<select value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls}>
			<option value={NONE}>Без раздела</option>
			{groups.map((g) => (
				<option key={g.id} value={g.id}>
					{g.name}
				</option>
			))}
		</select>
	);
}

// Section name; a click on "✎" turns it into a field (only for real sections).
function GroupTitle({
	block,
	pending,
	onRename,
}: {
	block: { id: number; name: string; group?: LinkGroupRow };
	pending: boolean;
	onRename: (name: string) => void;
}) {
	const [edit, setEdit] = useState(false);
	const [name, setName] = useState(block.name);
	if (edit) {
		return (
			<span className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
				<input
					autoFocus
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && name.trim()) {
							onRename(name.trim());
							setEdit(false);
						}
						if (e.key === "Escape") setEdit(false);
					}}
					className="h-8 w-44 rounded-lg border border-border/70 bg-background px-2 text-[13px] font-semibold outline-none focus:border-foreground"
				/>
				<button
					type="button"
					disabled={pending || !name.trim()}
					onClick={() => {
						onRename(name.trim());
						setEdit(false);
					}}
					className={smallBtn}
				>
					OK
				</button>
			</span>
		);
	}
	return (
		<span className="flex min-w-0 items-center gap-1.5">
			<span className="truncate text-[13px] font-bold">{block.name}</span>
			{block.group && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						setName(block.name);
						setEdit(true);
					}}
					className="text-[12px] text-muted-foreground hover:text-foreground"
					aria-label="Переименовать раздел"
				>
					✎
				</button>
			)}
		</span>
	);
}

function LinkRow({
	link,
	groups,
	pending,
	copied,
	url,
	dragging,
	onDragStart,
	onDragEnd,
	onCopy,
	onMove,
	onToggle,
	onDelete,
	onSave,
}: {
	link: AnalyticsLinkRow;
	groups: LinkGroupRow[];
	pending: boolean;
	copied: boolean;
	url: string;
	dragging: boolean;
	onDragStart: () => void;
	onDragEnd: () => void;
	onCopy: () => void;
	onMove: (groupId: number) => void;
	onToggle: () => void;
	onDelete: () => void;
	onSave: (fd: FormData, done: () => void) => void;
}) {
	const [edit, setEdit] = useState(false);
	const [label, setLabel] = useState(link.label);
	const [code, setCode] = useState(link.code);
	const [target, setTarget] = useState(link.target);

	if (edit) {
		return (
			<div className="flex flex-col gap-2 rounded-xl border border-foreground/30 bg-background p-3">
				<div className="grid gap-2 sm:grid-cols-3">
					<label className="flex flex-col gap-1">
						<span className={fieldLabel}>Название</span>
						<input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
					</label>
					<label className="flex flex-col gap-1">
						<span className={fieldLabel}>Слаг (ссылка)</span>
						<input value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls} font-mono`} />
					</label>
					<label className="flex flex-col gap-1">
						<span className={fieldLabel}>Открывает страницу</span>
						<input value={target} onChange={(e) => setTarget(e.target.value)} list="link-targets" className={`${inputCls} font-mono`} />
					</label>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onSave(formData({ id: link.id, label, code, target }), () => setEdit(false))}
						disabled={pending}
						className="rounded-lg bg-foreground px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						Сохранить
					</button>
					<button type="button" onClick={() => setEdit(false)} className="rounded-lg border border-border/70 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">Отмена</button>
				</div>
			</div>
		);
	}

	return (
		<div
			draggable
			onDragStart={(e) => {
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", String(link.id));
				onDragStart();
			}}
			onDragEnd={onDragEnd}
			className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-background px-3 py-2.5 ${dragging ? "opacity-40" : ""}`}
		>
			<span aria-hidden className="hidden cursor-grab select-none text-muted-foreground/50 active:cursor-grabbing sm:inline" title="Перетащите в другой раздел">
				⋮⋮
			</span>
			<div className="min-w-0 flex-1 basis-48">
				<div className="flex items-center gap-2">
					<span className="truncate text-[13px] font-semibold">{link.label || link.code}</span>
					{!link.tracking && (
						<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">трекинг выкл</span>
					)}
				</div>
				<span className="block truncate font-mono text-[11px] text-muted-foreground/70">
					{url} <span className="text-muted-foreground/50">→ {link.target}</span>
				</span>
			</div>

			<span className="shrink-0 text-center text-[12px]">
				<span className="block font-bold">{link.visitors}</span>
				<span className="block text-[9px] uppercase tracking-wide text-muted-foreground">визиторов</span>
			</span>

			<div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
				<button type="button" onClick={onCopy} className="rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:border-foreground hover:bg-muted/40">
					{copied ? "Скопировано ✓" : "Копировать"}
				</button>
				<select
					value={link.group_id ?? NONE}
					disabled={pending}
					onChange={(e) => onMove(Number(e.target.value))}
					aria-label="Раздел"
					className="h-[30px] max-w-[11rem] rounded-lg border border-border/70 bg-background px-2 text-[11px] text-muted-foreground outline-none hover:border-foreground"
				>
					<option value={NONE}>Без раздела</option>
					{groups.map((g) => (
						<option key={g.id} value={g.id}>
							{g.name}
						</option>
					))}
				</select>
				<button type="button" onClick={() => setEdit(true)} className={smallBtn}>Изменить</button>
				<button type="button" onClick={onToggle} title="Если выключить — переходы по этой ссылке не записываются" className={smallBtn}>
					{link.tracking ? "Выкл. трекинг" : "Вкл. трекинг"}
				</button>
				<button type="button" onClick={onDelete} className="rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-red-400/60 hover:bg-red-50 hover:text-red-500">Удалить</button>
			</div>
		</div>
	);
}
