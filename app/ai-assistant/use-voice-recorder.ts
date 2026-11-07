"use client";

import { useEffect, useRef, useState } from "react";

// Voice recording and transcription to text. Extracted from the chat: this is a standalone
// piece of microphone handling that has nothing to do with the conversation itself.
//
// onText - what to do with the transcribed text (usually put it into the input field),
// onError - show a message to the user. Error texts are passed by the caller
// so the hook does not depend on translations.
export function useVoiceRecorder({
	onText,
	onError,
	messages,
}: {
	onText: (text: string) => void;
	onError: (message: string) => void;
	messages: { unavailable: string; denied: string; failed: string; error: string };
}) {
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	// The microphone must be released even if the user left the page during recording.
	useEffect(() => {
		return () => {
			streamRef.current?.getTracks().forEach((track) => track.stop());
		};
	}, []);

	async function transcribe() {
		const chunks = chunksRef.current;
		chunksRef.current = [];
		if (!chunks.length) return;

		const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
		if (blob.size === 0) return;

		setIsTranscribing(true);
		try {
			const fd = new FormData();
			fd.append("audio", blob, "voice.webm");
			const res = await fetch("/api/ai-assistant/transcribe", { method: "POST", body: fd });
			const data = await res.json();
			if (!res.ok || !data?.text?.trim()) throw new Error(data?.error ?? messages.failed);
			onText(data.text.trim());
		} catch (e) {
			onError(e instanceof Error ? e.message : messages.error);
		} finally {
			setIsTranscribing(false);
		}
	}

	async function toggle() {
		if (isRecording) {
			recorderRef.current?.stop(); // onstop will start the transcription
			streamRef.current?.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
			setIsRecording(false);
			return;
		}

		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			onError(messages.unavailable);
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);
			streamRef.current = stream;
			recorderRef.current = recorder;
			chunksRef.current = [];
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};
			recorder.onstop = () => {
				recorderRef.current = null;
				void transcribe();
			};
			setIsRecording(true);
			recorder.start();
		} catch {
			onError(messages.denied);
		}
	}

	return { isRecording, isTranscribing, toggle };
}
