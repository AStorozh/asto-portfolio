"use client";

// Storing the conversation in the browser. Extracted from the chat: it has nothing
// to do with the conversation logic itself, yet makes noise with three effects and handling of a broken store.
//
// Versioned key: if the message format changes, old entries simply
// won't match the new key and won't break the chat.
const STORAGE_KEY = "ai-assistant-chat-v2";

export type StoredChat<M, Mode> = {
	messages?: M[];
	activeMode?: Mode;
	nextId?: number;
};

export function readChat<M, Mode>(): StoredChat<M, Mode> | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as StoredChat<M, Mode>) : null;
	} catch {
		return null; // broken store - start from a clean slate
	}
}

export function writeChat<M, Mode>(value: StoredChat<M, Mode>): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} catch {
		// private mode or overflow - the conversation just won't be saved
	}
}

export function clearChatStorage(): void {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
