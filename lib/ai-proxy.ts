import { socksDispatcher } from "fetch-socks";
import { fetch as undiciFetch, type Dispatcher } from "undici";

// The server in Russia cannot reach OpenAI directly (geo-block). If
// AI_PROXY_URL is set (e.g. socks5://host:1080 or socks5h://…), all calls to
// external AI services go through this SOCKS proxy. Without the variable - a plain fetch.
//
// IMPORTANT: when working through the proxy we use fetch FROM THE undici PACKAGE, not the global one.
// The global fetch (which Next.js also patches) is incompatible with the fetch-socks dispatcher -
// it fails with "invalid onRequestStart method". The undici fetch from the same package as
// fetch-socks correctly accepts the dispatcher option.
let cached: { url: string; dispatcher: Dispatcher } | null = null;

function dispatcherFor(proxyUrl: string): Dispatcher {
	if (cached && cached.url === proxyUrl) return cached.dispatcher;
	const u = new URL(proxyUrl);
	const type = u.protocol.startsWith("socks4") ? 4 : 5;
	const dispatcher = socksDispatcher({
		type,
		host: u.hostname,
		port: Number(u.port) || 1080,
		...(u.username ? { userId: decodeURIComponent(u.username) } : {}),
		...(u.password ? { password: decodeURIComponent(u.password) } : {}),
	});
	cached = { url: proxyUrl, dispatcher };
	return dispatcher;
}

export function aiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
	const proxyUrl = process.env.AI_PROXY_URL;
	if (!proxyUrl) return fetch(input, init);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return undiciFetch(input as any, { ...(init as any), dispatcher: dispatcherFor(proxyUrl) }) as unknown as Promise<Response>;
}
