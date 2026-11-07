"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics-client";
import { useT } from "@/lib/lang-context";

type CallStatus = "idle" | "connecting" | "active";

type CallContextValue = {
	status: CallStatus;
	seconds: number;
	error: string | null;
	toggle: () => void;
};

// Marker error: the connection to OpenAI failed (likely a geo-block).
const GEO_BLOCKED = "__call_geo_blocked__";

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
	const ctx = useContext(CallContext);
	if (!ctx) throw new Error("useCall должен использоваться внутри CallProvider");
	return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const t = useT();

	const [status, setStatus] = useState<CallStatus>("idle");
	const [seconds, setSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	// Popup "turn on a VPN": the voice connection to OpenAI failed, most likely
	// because the visitor is in Russia (OpenAI blocks calls from there).
	const [geoBlocked, setGeoBlocked] = useState(false);
	const connectedRef = useRef(false); // WebRTC reached "connected" at least once
	const connectTimerRef = useRef<number | undefined>(undefined);

	const pcRef = useRef<RTCPeerConnection | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const dcRef = useRef<RTCDataChannel | null>(null);
	const secondsRef = useRef(0); // mirror of the call duration, for saving when the call ends

	// Call duration timer.
	useEffect(() => {
		if (status !== "active") return;
		const id = window.setInterval(
			() => setSeconds((s) => ((secondsRef.current = s + 1), s + 1)),
			1000,
		);
		return () => window.clearInterval(id);
	}, [status]);

	// Hint popup at call start (shown briefly).
	const [showIntro, setShowIntro] = useState(false);
	const prevStatusRef = useRef<CallStatus>("idle");
	const introTimerRef = useRef<number | undefined>(undefined);
	useEffect(() => {
		if (prevStatusRef.current === "idle" && status !== "idle") {
			setShowIntro(true);
			window.clearTimeout(introTimerRef.current);
			introTimerRef.current = window.setTimeout(() => setShowIntro(false), 9000);
		}
		if (status === "idle") setShowIntro(false);
		prevStatusRef.current = status;
		return () => window.clearTimeout(introTimerRef.current);
	}, [status]);

	const cleanup = useCallback(() => {
		window.clearTimeout(connectTimerRef.current);
		pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
		pcRef.current?.close();
		pcRef.current = null;
		dcRef.current = null;
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (audioRef.current) audioRef.current.srcObject = null;
	}, []);

	const endCall = useCallback(() => {
		cleanup();
		if (secondsRef.current > 0) track("ai_call_end", String(secondsRef.current));
		secondsRef.current = 0;
		setStatus("idle");
		setSeconds(0);
	}, [cleanup]);

	// Handling the navigate_to tool: the model asks to move the user to a page.
	const handleNavigate = useCallback(
		(rawPath: string, callId: string) => {
			const path = (rawPath || "").trim();
			const safe = path.startsWith("/") && !path.startsWith("//");
			if (safe) {
				router.push(path);
			}
			// Tell the model the result so it can continue the conversation.
			const dc = dcRef.current;
			if (dc && dc.readyState === "open") {
				dc.send(
					JSON.stringify({
						type: "conversation.item.create",
						item: {
							type: "function_call_output",
							call_id: callId,
							output: JSON.stringify(
								safe ? { ok: true, navigated_to: path } : { ok: false, reason: "недопустимый путь" },
							),
						},
					}),
				);
				dc.send(JSON.stringify({ type: "response.create" }));
			}
		},
		[router],
	);

	// The connection never came up: end the call and show the VPN popup.
	const failToConnect = useCallback(() => {
		cleanup();
		secondsRef.current = 0;
		setStatus("idle");
		setSeconds(0);
		setShowIntro(false);
		setGeoBlocked(true);
	}, [cleanup]);

	const startCall = useCallback(async () => {
		setError(null);
		setGeoBlocked(false);
		connectedRef.current = false;
		setStatus("connecting");
		track("ai_call");
		try {
			// 1. Ephemeral session token with the "dossier" and the navigate_to tool.
			const tokenRes = await fetch("/api/ai-assistant/realtime-session", { method: "POST" });
			const tokenData = await tokenRes.json();
			if (!tokenRes.ok) throw new Error(tokenData?.error ?? t.ai_call_err_generic);
			const ephemeralKey: string = tokenData.client_secret;

			// 2. Microphone.
			if (!navigator.mediaDevices?.getUserMedia) throw new Error(t.ai_call_err_mic);
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			// 3. WebRTC directly to OpenAI Realtime.
			const pc = new RTCPeerConnection();
			pcRef.current = pc;
			pc.ontrack = (e) => {
				if (audioRef.current) audioRef.current.srcObject = e.streams[0];
			};
			stream.getTracks().forEach((track) => pc.addTrack(track, stream));

			const dc = pc.createDataChannel("oai-events");
			dcRef.current = dc;
			dc.addEventListener("message", (event) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.type === "response.function_call_arguments.done" && msg.name === "navigate_to") {
						let path = "";
						try {
							path = JSON.parse(msg.arguments ?? "{}").path ?? "";
						} catch {
							/* ignore */
						}
						handleNavigate(path, msg.call_id);
					}
				} catch {
					/* non-JSON event - ignore */
				}
			});

			pc.addEventListener("connectionstatechange", () => {
				const st = pc.connectionState;
				if (st === "connected") {
					connectedRef.current = true;
					window.clearTimeout(connectTimerRef.current);
				} else if (st === "failed" || st === "disconnected" || st === "closed") {
					if (connectedRef.current) endCall();
					else failToConnect();
				}
			});

			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			// The visitor's browser connects to OpenAI Realtime DIRECTLY. From Russia
			// this domain is geo-blocked by OpenAI, so the connection fails
			// (unlike the text chat, which reaches OpenAI through a server-side
			// proxy). We catch both the network failure and 403, and show a clear message.
			const geoMsg = GEO_BLOCKED;
			let sdpRes: Response;
			try {
				sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
					method: "POST",
					body: offer.sdp,
					headers: {
						Authorization: `Bearer ${ephemeralKey}`,
						"Content-Type": "application/sdp",
					},
				});
			} catch {
				throw new Error(geoMsg);
			}
			// 403 is OpenAI's answer for a blocked country. Other errors (no credits,
			// overload) are not about the visitor's location: show the usual message.
			if (sdpRes.status === 403) throw new Error(geoMsg);
			if (!sdpRes.ok) throw new Error(t.ai_call_err_generic);
			const answerSdp = await sdpRes.text();
			await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

			setSeconds(0);
			setStatus("active");
			// OpenAI answered, but the audio itself may still not get through.
			// If there is no connection in 15 seconds, show the VPN popup.
			connectTimerRef.current = window.setTimeout(() => {
				if (!connectedRef.current && pcRef.current === pc) failToConnect();
			}, 15000);
		} catch (e) {
			if (e instanceof Error && e.message === GEO_BLOCKED) {
				failToConnect();
				return;
			}
			cleanup();
			setStatus("idle");
			setError(e instanceof Error ? e.message : t.ai_call_err_generic);
		}
	}, [cleanup, endCall, failToConnect, handleNavigate, t]);

	const toggle = useCallback(() => {
		if (status === "idle") startCall();
		else endCall();
	}, [status, startCall, endCall]);

	// Close the call when leaving the page entirely (closing the tab).
	useEffect(() => () => cleanup(), [cleanup]);

	// The call error message disappears on its own after 12 seconds.
	useEffect(() => {
		if (!error) return;
		const id = setTimeout(() => setError(null), 12000);
		return () => clearTimeout(id);
	}, [error]);

	return (
		<CallContext.Provider value={{ status, seconds, error, toggle }}>
			{children}
			<audio ref={audioRef} autoPlay className="hidden" />

			{showIntro && (
				<div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
					{/* dimming backdrop for visibility */}
					<div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
					<div className="call-intro-in pointer-events-auto relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-yellow-100/45 bg-[linear-gradient(150deg,oklch(0.13_0.008_85),oklch(0.18_0.03_85))] p-6 text-white shadow-[inset_0_0_60px_rgba(217,160,78,0.18),0_30px_90px_rgba(0,0,0,0.5),0_0_80px_rgba(217,160,78,0.35)]">
						{/* close button */}
						<button
							type="button"
							onClick={() => setShowIntro(false)}
							aria-label={t.ai_call_close}
							className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>

						{/* header: gold dot + title + gold bar */}
						<div className="flex items-center gap-3 pr-8">
							<span className="relative flex h-3 w-3">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
								<span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(217,160,78,0.8)]" />
							</span>
							<h3 className="text-xl font-extrabold tracking-tight drop-shadow-[0_2px_12px_rgba(217,160,78,0.3)]">
								{t.ai_call_intro_title}
							</h3>
						</div>
						<div className="mt-3 h-[2px] w-9 rounded-full bg-gradient-to-r from-amber-300 to-amber-600 shadow-[0_0_10px_rgba(217,160,78,0.5)]" />

						{/* body */}
						<p className="mt-4 text-[15px] leading-relaxed text-white/85 sm:text-base">
							{t.ai_call_intro_body}
						</p>
						<div className="mt-4 flex flex-col gap-3">
							<div className="flex items-start gap-3">
								<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_8px_rgba(217,160,78,0.6)]" />
								<p className="text-sm leading-relaxed text-white/70 sm:text-[15px]">
									{t.ai_call_intro_end}
								</p>
							</div>
							<div className="flex items-start gap-3">
								<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_8px_rgba(217,160,78,0.6)]" />
								<p className="text-sm leading-relaxed text-white/70 sm:text-[15px]">
									{t.ai_call_intro_navigate}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{geoBlocked && (
				<div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="call-geo-title">
					<div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setGeoBlocked(false)} />
					<div className="call-intro-in relative w-full max-w-md rounded-3xl border-2 border-foreground bg-background p-6 text-foreground shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
						<h3 id="call-geo-title" className="text-xl font-extrabold tracking-tight">{t.ai_call_geo_title}</h3>
						<p className="mt-3 text-[15px] leading-relaxed text-foreground/80">{t.ai_call_geo_body}</p>
						<button
							type="button"
							onClick={() => setGeoBlocked(false)}
							className="mt-5 w-full rounded-full border-2 border-foreground bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
						>
							{t.ai_call_geo_ok}
						</button>
					</div>
				</div>
			)}

			{/* Call error toast (e.g. unavailable from Russia) - shown
			    globally, wherever the call was started from. */}
			{error && (
				<div
					role="alert"
					className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4"
				>
					<div className="call-intro-in pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border-2 border-foreground bg-background px-4 py-3 text-sm leading-relaxed text-foreground shadow-[0_14px_42px_rgba(0,0,0,0.18)]">
						<span className="flex-1">{error}</span>
						<button
							type="button"
							onClick={() => setError(null)}
							aria-label={t.ai_call_close}
							className="shrink-0 rounded-full p-1 text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
			)}
		</CallContext.Provider>
	);
}
