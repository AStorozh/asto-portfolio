"use client";

import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/lang-context";
import { ArrowUpRight } from "../arrow-up-right";
import { FitWidthTitle } from "../fit-width-title";
import { track, getLinkCode } from "@/lib/analytics-client";
import { MessageContent } from "./message-content";
import { useVoiceRecorder } from "./use-voice-recorder";
import { readChat, writeChat, clearChatStorage } from "./use-chat-storage";
import { useCall } from "./call-context";

type Mode = "vacancy" | "task" | "market" | null;

type ChatMessage = {
	id: number;
	role: "assistant" | "user";
	text: string;
	files?: string[];
	kind?: "mode";
	mode?: "vacancy" | "task" | "market";
	desc?: string;
	attachments?: { name: string; content: string }[];
	backUrl?: string; // "back" link (e.g. to a work page)
};

// Same limit as the server applies to one message (MAX_CHARS_PER_MESSAGE in the API route).
const MAX_FILE_CHARS = 30_000;

// Attached file chip in the site's style (for a dark background: input panel and user bubble).
function FileChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
	const t = useT();
	return (
		<span className="inline-flex max-w-[15rem] items-center gap-2 rounded-xl border border-background/25 bg-background/10 px-2.5 py-1.5 text-background">
			<svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 opacity-80">
				<path d="M14 3v4a1 1 0 0 0 1 1h4" />
				<path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
				<path d="M9 13h6M9 17h4" />
			</svg>
			<span className="truncate text-xs font-medium">{name}</span>
			{onRemove && (
				<button
					type="button"
					onClick={onRemove}
					aria-label={t.ai_remove_file}
					className="shrink-0 rounded-full p-0.5 text-background/70 transition-colors hover:bg-background/15 hover:text-background"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>
			)}
		</span>
	);
}

function formatDuration(seconds: number) {
	const minutes = Math.floor(seconds / 60)
		.toString()
		.padStart(2, "0");
	const rest = (seconds % 60).toString().padStart(2, "0");
	return `${minutes}:${rest}`;
}

type AssistantChatProps = {
	heroTitle?: string;
	initialWork?: string;
	initialWorkUrl?: string;
	initialMode?: string;
};

export function AssistantChat({ heroTitle, initialWork, initialWorkUrl, initialMode }: AssistantChatProps = {}) {
	const t = useT();
	const router = useRouter();

	const CAPABILITIES = useMemo(() => [
		{
			id: "vacancy" as const,
			title: t.ai_cap_vacancy_title,
			description: t.ai_cap_vacancy_desc,
			hint: t.ai_cap_vacancy_hint,
			acceptsFile: true,
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
					<rect x="2" y="7" width="20" height="14" rx="2" />
					<path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
					<line x1="12" y1="12" x2="12" y2="16" />
					<line x1="10" y1="14" x2="14" y2="14" />
				</svg>
			),
		},
		{
			id: "task" as const,
			title: t.ai_cap_task_title,
			description: t.ai_cap_task_desc,
			hint: t.ai_cap_task_hint,
			acceptsFile: false,
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
					<polyline points="16 18 22 12 16 6" />
					<polyline points="8 6 2 12 8 18" />
				</svg>
			),
		},
		{
			id: "market" as const,
			title: t.ai_cap_market_title,
			description: t.ai_cap_market_desc,
			hint: t.ai_cap_market_hint,
			acceptsFile: false,
			icon: (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
					<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
					<polyline points="16 7 22 7 22 13" />
				</svg>
			),
		},
	], [t]);

	const PLACEHOLDERS: Record<NonNullable<Mode>, string> = useMemo(() => ({
		vacancy: t.ai_placeholder_vacancy,
		task: t.ai_placeholder_task,
		market: t.ai_placeholder_market,
	}), [t]);

	const initialMessages: ChatMessage[] = useMemo(() => [
		{ id: 1, role: "assistant", text: t.ai_greeting_1 },
		{ id: 2, role: "assistant", text: t.ai_greeting_2 },
	], [t]);

	const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
	const [message, setMessage] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
	// Requests "in flight". A list, not a boolean flag: while one reply is being prepared,
	// the user can send the next one, and the indicator is computed across all of them.
	const [inflight, setInflight] = useState<{ id: number }[]>([]);
	const [activeMode, setActiveMode] = useState<Mode>(null);
	const [pendingSend, setPendingSend] = useState(false);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const isSending = inflight.length > 0;
	const nextIdRef = useRef(3);
	const reqIdRef = useRef(0);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const formRef = useRef<HTMLFormElement | null>(null);
	const messagesRef = useRef<HTMLDivElement | null>(null);

	const { isRecording, isTranscribing, toggle: toggleRecording } = useVoiceRecorder({
		onText: (text) => {
			setMessage(text);
			setPendingSend(true); // send the recognized text immediately
		},
		onError: (text) => addMessage("assistant", text),
		messages: {
			unavailable: t.ai_mic_unavailable,
			denied: t.ai_mic_denied,
			failed: t.ai_speech_failed,
			error: t.ai_speech_error,
		},
	});

	const call = useCall();
	const prevCallStatus = useRef(call.status);

	// Short chat messages when a call starts/ends.
	useEffect(() => {
		const prev = prevCallStatus.current;
		if (prev !== "active" && call.status === "active") {
			addMessage("assistant", t.ai_call_started);
		} else if (prev === "active" && call.status === "idle") {
			addMessage("assistant", t.ai_call_ended);
		}
		prevCallStatus.current = call.status;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [call.status]);

	// Clear the chat: reset to the welcome messages and clear the saved history.
	function clearChat() {
		setMessages(initialMessages);
		setActiveMode(null);
		setAttachedFiles([]);
		setMessage("");
		nextIdRef.current = initialMessages.length + 1;
		clearChatStorage();
	}

	// Restore the conversation (once on mount).
	useEffect(() => {
		const saved = readChat<ChatMessage, Mode>();
		if (saved?.messages?.length) {
			setMessages(saved.messages);
			const maxId = saved.messages.reduce((m, x) => Math.max(m, x.id), 0);
			nextIdRef.current = saved.nextId ?? maxId + 1;
		}
		if (saved?.activeMode) setActiveMode(saved.activeMode);
		setHydrated(true);
	}, []);

	// Save the conversation on changes (only after restoring).
	useEffect(() => {
		if (!hydrated) return;
		writeChat({ messages, activeMode, nextId: nextIdRef.current });
	}, [messages, activeMode, hydrated]);

	// Auto-scroll the chat down on new messages / typing indicator.
	useEffect(() => {
		const el = messagesRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages, isSending]);

	useEffect(() => {
		const form = formRef.current;
		const msgs = messagesRef.current;
		if (!form || !msgs) return;
		const observer = new ResizeObserver(() => {
			msgs.style.paddingBottom = `${form.offsetHeight + 56}px`;
		});
		observer.observe(form);
		return () => observer.disconnect();
	}, []);

	function addMessage(role: ChatMessage["role"], text: string, files?: string[]) {
		setMessages((current) => [
			...current,
			{ id: nextIdRef.current++, role, text, files },
		]);
	}

	async function handleSubmit(event: { preventDefault(): void }) {
		event.preventDefault();
		const trimmedMessage = message.trim();
		const files = attachedFiles;
		if (isSending || (!trimmedMessage && files.length === 0)) return;
		track("ai_message");

		const reqId = reqIdRef.current++;
		// The selected task mode affects only this request: there is no "being inside
		// a task", the dialog afterwards continues as a regular chat.
		const modeForRequest = activeMode;
		const userMessage: ChatMessage = {
			id: nextIdRef.current++,
			role: "user",
			text: trimmedMessage || t.ai_no_text_file,
			attachments: files.length ? files : undefined,
		};
		// context for the request; add the message functionally so that a reply from
		// a parallel request (another task) is not overwritten
		const history = [...messages, userMessage];

		setMessages((curr) => [...curr, userMessage]);
		setMessage("");
		setAttachedFiles([]);
		setInflight((p) => [...p, { id: reqId }]);
		setActiveMode(null);
		if (textareaRef.current) textareaRef.current.style.height = "auto";

		try {
			const response = await fetch("/api/ai-assistant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: history
						.filter((m) => m.kind !== "mode")
						.map((m) => ({
							role: m.role,
							text: m.attachments?.length
								? `${m.text}\n\n[Содержимое прикреплённых файлов]\n${m.attachments
										.map((a) => `### ${a.name}\n${a.content}`)
										.join("\n\n")}`
								: m.text,
							files: m.attachments?.map((a) => a.name) ?? m.files,
						})),
					mode: modeForRequest,
					link_code: getLinkCode(),
				}),
			});
			const data = await response.json();
			// The technical error text is not shown to the user - console only;
			// the chat gets a soft placeholder "assistant is on vacation" (t.ai_error).
			if (!response.ok || typeof data?.answer !== "string") {
				console.error("[ai-assistant]", data?.error ?? response.status, data?.details ?? "");
				throw new Error(t.ai_error);
			}
			addMessage("assistant", data.answer);
		} catch (error) {
			if (!(error instanceof Error) || error.message !== t.ai_error) console.error(error);
			addMessage("assistant", t.ai_error);
		} finally {
			setInflight((p) => p.filter((x) => x.id !== reqId));
		}
	}

	async function handleFileChange(files: FileList | null) {
		if (!files) return;
		const read = await Promise.all(
			Array.from(files).map(async (f) => {
				let content = "";
				try {
					content = await f.text();
				} catch {
					content = "";
				}
				if (content.length > MAX_FILE_CHARS) content = content.slice(0, MAX_FILE_CHARS) + "\n…(файл обрезан)";
				return { name: f.name, content };
			}),
		);
		setAttachedFiles((current) => [...current, ...read]);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}

	function removeAttachment(index: number) {
		setAttachedFiles((current) => current.filter((_, i) => i !== index));
	}

	function handleTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
		setMessage(event.currentTarget.value);
		const el = event.currentTarget;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}

	function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			event.currentTarget.form?.requestSubmit();
		}
	}

	function activateMode(mode: Mode) {
		const isNew = mode !== activeMode;
		setActiveMode(mode);
		if (mode === "market") setMessage(t.ai_market_auto);
		if (isNew && mode) {
			track("ai_task", mode);
			const cap = CAPABILITIES.find((c) => c.id === mode);
			if (cap) {
				const blockId = nextIdRef.current++;
				setMessages((current) => [
					...current,
					{ id: blockId, role: "assistant", kind: "mode", mode, text: cap.title, desc: cap.description },
				]);
				// "Who am I on the market" starts the analysis right after selection.
				if (mode === "market") setPendingSend(true);
			}
		}
		requestAnimationFrame(() => textareaRef.current?.focus());
	}

	// Auto-send a prefilled request (used for the "market" mode and works).
	useEffect(() => {
		if (!pendingSend) return;
		setPendingSend(false);
		formRef.current?.requestSubmit();
		 
	}, [pendingSend]);

	// Start of the "question about a work" task - opens via the link /ai-assistant?work=...
	function startWorkTask(title: string, backUrl?: string) {
		track("ai_task", "work");
		const blockId = nextIdRef.current++;
		setMessages((current) => [
			...current,
			{ id: blockId, role: "assistant", kind: "mode", text: title, desc: t.ai_work_desc, backUrl },
		]);
		setActiveMode(null);
		setMessage(t.ai_work_prompt.replace("{title}", title));
		setPendingSend(true);
	}

	// Handle the ?work=... parameter once after the history is restored.
	const workHandledRef = useRef(false);
	useEffect(() => {
		if (!hydrated || workHandledRef.current) return;
		if (initialWork && initialWork.trim()) {
			workHandledRef.current = true;
			startWorkTask(initialWork.trim(), initialWorkUrl?.trim() || undefined);
			router.replace("/ai-assistant");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hydrated, initialWork]);

	// Handle the ?mode=vacancy|task|market parameter - starts the task right away.
	const modeHandledRef = useRef(false);
	useEffect(() => {
		if (!hydrated || modeHandledRef.current) return;
		if (initialMode === "vacancy" || initialMode === "task" || initialMode === "market") {
			modeHandledRef.current = true;
			activateMode(initialMode);
			router.replace("/ai-assistant");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hydrated, initialMode]);

	// Regular message bubble.
	function renderBubble(item: ChatMessage) {
		return (
			<article key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
				<div
					className={`max-w-[85%] rounded-[1.4rem] px-3.5 py-2 text-sm leading-snug shadow-sm ${
						item.role === "user"
							? "bg-foreground text-background"
							: "border border-yellow-600/60 bg-muted/45 text-foreground"
					}`}
				>
					{item.role === "assistant" ? (
						<MessageContent text={item.text} />
					) : (
						<p className="whitespace-pre-wrap break-words">{item.text}</p>
					)}
					{((item.attachments?.length ?? 0) > 0 || (item.files?.length ?? 0) > 0) && (
						<div className="mt-2.5 flex flex-wrap gap-2">
							{item.attachments?.map((a, i) => <FileChip key={`a-${i}`} name={a.name} />)}
							{!item.attachments && item.files?.map((f, i) => <FileChip key={`f-${i}`} name={f} />)}
						</div>
					)}
				</div>
			</article>
		);
	}

	const typingBubble = (
		<article className="flex justify-start">
			<div className="flex items-center gap-1.5 px-2 py-2">
				<span className="h-2 w-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.3s]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.15s]" />
				<span className="h-2 w-2 animate-bounce rounded-full bg-amber-500" />
			</div>
		</article>
	);

	function handleCapabilityDragOver(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		setIsDraggingOver(true);
	}

	function handleCapabilityDrop(event: DragEvent<HTMLButtonElement>) {
		event.preventDefault();
		setIsDraggingOver(false);
		if (event.dataTransfer.files.length > 0) {
			handleFileChange(event.dataTransfer.files);
			activateMode("vacancy");
		}
	}

	return (
		<div className="grid h-full w-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-[20rem_1fr]">
			<aside className="relative hidden min-h-0 flex-col gap-5 lg:flex">
				{/* Header - a block in the site's common style */}
				<div className="relative flex min-h-0 flex-1 basis-0 flex-col overflow-hidden rounded-3xl border-2 border-foreground bg-background p-5 text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]">
					<h2 className="font-extrabold leading-none tracking-tight">
						<FitWidthTitle watch={heroTitle ?? t.ai_capabilities_title}>
							{heroTitle ?? t.ai_capabilities_title}
						</FitWidthTitle>
					</h2>
					<p className="mt-5 text-sm leading-relaxed text-muted-foreground">
						{t.ai_capabilities_subtitle}
					</p>
				</div>

				{CAPABILITIES.map((cap, i) => {
						const isActive = activeMode === cap.id;
						const isDropTarget = isDraggingOver && cap.acceptsFile;
						return (
							<button
								key={cap.id}
								type="button"
								onClick={() => activateMode(cap.id)}
								onDragOver={cap.acceptsFile ? handleCapabilityDragOver : undefined}
								onDragLeave={cap.acceptsFile ? () => setIsDraggingOver(false) : undefined}
								onDrop={cap.acceptsFile ? handleCapabilityDrop : undefined}
								style={{ animationDelay: `${140 + i * 90}ms` }}
								className={`sidebar-item-in ai-surface group flex w-full min-h-0 flex-1 basis-0 flex-col gap-5 overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 ${
									isActive || isDropTarget
										? "border-white/80 brightness-105"
										: "border-white/25 hover:border-white/55 hover:brightness-110"
								}`}
							>
								<div className="flex items-center justify-between gap-3">
									<h3 className="text-lg font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)] sm:text-xl">
										{cap.title}
									</h3>
									<span
										aria-hidden
										className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg leading-none text-white transition-transform duration-300 group-hover:translate-x-0.5"
									>
										<ArrowUpRight />
									</span>
								</div>
								<p className="text-sm leading-relaxed text-white/85">
									{cap.description}
								</p>
							</button>
						);
					})}

				{call.status === "active" && (
					<div className="relative shrink-0 overflow-hidden rounded-3xl bg-foreground p-5 text-white">
						<div className="flex items-center gap-2">
							<span className="h-2 w-2 animate-pulse rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]" />
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
								{t.ai_call_active}
							</p>
						</div>
						<p className="mt-3 text-3xl font-extrabold tabular-nums">{formatDuration(call.seconds)}</p>
					</div>
				)}
			</aside>

			<div className="flex min-h-0 flex-col">
				<section className="relative flex min-h-0 flex-1 flex-col rounded-3xl border-2 border-foreground bg-transparent text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]">
					<div className="absolute -left-0.5 -right-0.5 -top-0.5 z-10 flex items-center justify-between gap-4 rounded-3xl border-2 border-foreground bg-background p-2.5 text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]">
						<h2 className="px-2 text-base font-semibold tracking-tight">{t.ai_chat_title}</h2>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={call.toggle}
								disabled={call.status === "connecting"}
								className="rounded-full bg-foreground px-4 py-1.5 text-base font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-60"
							>
								{call.status === "connecting"
									? t.ai_call_connecting
									: call.status === "active"
									? `${t.ai_call_end} ${formatDuration(call.seconds)}`
									: t.ai_call_start}
							</button>
							<button
								type="button"
								onClick={clearChat}
								title={t.ai_clear_chat}
								aria-label={t.ai_clear_chat}
								className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground/15 text-foreground/70 transition-colors hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
									<path d="M3 6h18" />
									<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
									<path d="M10 11v6M14 11v6" />
								</svg>
							</button>
						</div>
					</div>
					<div ref={messagesRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-20 sm:px-5" style={{ paddingBottom: "128px" }}>
						{messages.map((item) => {
							if (item.kind === "mode") {
								// Task card - only a visual marker in the feed:
								// the conversation after it continues with regular messages below.
								return (
									<div
										key={item.id}
										className="my-2 overflow-hidden rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]"
									>
										<div className="flex items-center gap-3 bg-foreground px-4 py-3 text-background">
											<span className="h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 shadow-[0_0_10px_rgba(217,160,78,0.5)]" />
											<div className="min-w-0 flex-1">
												<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
													{t.ai_task_label}
												</p>
												<h3 className="truncate text-base font-extrabold tracking-tight">{item.text}</h3>
											</div>
											{item.backUrl && (
												<a
													href={item.backUrl}
													aria-label={t.ai_task_back_work_aria}
													title={t.ai_task_back_work_aria}
													className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-background/30 p-1.5 text-xs font-semibold text-background transition-colors hover:bg-background/15"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
														<path d="M15 18l-6-6 6-6" />
													</svg>
													<span className="pr-1">{t.ai_task_back_work}</span>
												</a>
											)}
										</div>
										{item.desc && (
											<p className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{item.desc}</p>
										)}
									</div>
								);
							}

							return renderBubble(item);
						})}
						{isSending && typingBubble}
					</div>
					<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
					<form ref={formRef} onSubmit={handleSubmit} className="absolute -bottom-0.5 -left-0.5 -right-0.5 z-10 rounded-3xl border-2 border-foreground bg-foreground p-2.5 text-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]">
						{attachedFiles.length > 0 && (
							<div className="mb-2 flex flex-wrap gap-2 px-1 pb-2">
								{attachedFiles.map((file, i) => (
									<FileChip key={`${file.name}-${i}`} name={file.name} onRemove={() => removeAttachment(i)} />
								))}
							</div>
						)}
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept=".txt,.md,.markdown,.csv,.json,.log,.rtf,.html,.xml,.yml,.yaml,.js,.ts,.py,text/*"
							className="hidden"
							onChange={(event) => handleFileChange(event.currentTarget.files)}
						/>
						<div className="flex items-end gap-2">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-background transition-colors hover:bg-background/10"
								aria-label={t.ai_attach_file}
							>
								<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
									<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.7 9.7a2 2 0 0 1-2.8-2.8l8.9-8.9" />
								</svg>
							</button>
							<div className="flex min-w-0 flex-1 items-end gap-2 overflow-hidden rounded-[1.4rem] bg-background/10 pl-1">
								<textarea
									ref={textareaRef}
									value={message}
									onChange={handleTextareaChange}
									onKeyDown={handleTextareaKeyDown}
									placeholder={activeMode ? PLACEHOLDERS[activeMode] : t.ai_placeholder_default}
									rows={1}
									className="min-h-[36px] flex-1 resize-none overflow-hidden bg-transparent px-3 py-1.5 text-base leading-relaxed text-background placeholder:text-background/45 outline-none"
								/>
								<button
									type="submit"
									disabled={isSending}
									className="inline-flex h-9 shrink-0 items-center rounded-[1.4rem] bg-background px-4 text-base font-semibold text-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
								>
									{isSending ? t.ai_thinking : t.ai_send}
								</button>
							</div>
							<button
								type="button"
								onClick={toggleRecording}
								disabled={isTranscribing}
								className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
									isRecording ? "bg-background text-foreground" : "text-background hover:bg-background/10"
								}`}
								aria-label={isRecording ? t.ai_recording_stop : t.ai_recording_start}
							>
								{isTranscribing ? (
									<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin">
										<circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
										<path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
									</svg>
								) : isRecording ? (
									<span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
								) : (
									<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
										<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
										<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
										<path d="M12 19v3" />
									</svg>
								)}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
