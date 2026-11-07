import { drizzle } from "drizzle-orm/postgres-js";
import { readFileSync } from "node:fs";
import postgres from "postgres";

declare global {
	 
	var __pg: ReturnType<typeof postgres> | undefined;
}

// TLS for the DB connection (DATABASE_SSL):
//   require (default) - encrypted, server certificate not verified;
//   verify            - encrypted and verified against DATABASE_SSL_CA (path to the CA .crt);
//   disable           - plain TCP, only for a local Postgres without TLS.
function sslOption(): postgres.Options<Record<string, never>>["ssl"] {
	const mode = (process.env.DATABASE_SSL || "require").toLowerCase();
	if (mode === "disable") return false;
	if (mode === "verify") {
		const caPath = process.env.DATABASE_SSL_CA;
		return { rejectUnauthorized: true, ...(caPath ? { ca: readFileSync(caPath, "utf8") } : {}) };
	}
	return "require";
}

// Limit the pool and close idle connections, otherwise on restarts of
// dev/prod connections pile up and exhaust the Postgres connection limit
// ("remaining connection slots are reserved for SUPERUSER").
const client =
	globalThis.__pg ??
	postgres(process.env.DATABASE_URL!, {
		ssl: sslOption(),
		max: 8, // the DB has a hard limit of max_connections=25 (shared with the prod app)
		// Keep connections "warm" and don't reopen them needlessly: the remote DB
		// sometimes doesn't respond to a NEW connection (CONNECT_TIMEOUT),
		// while queries go through an already open channel. keep_alive keeps the channel from dying.
		idle_timeout: 60 * 10, // keep up to 10 min of idle time (then close, so slots aren't hoarded)
		max_lifetime: 60 * 60, // recreate a connection at most once an hour
		connect_timeout: 30, // more time to establish a connection during network "blips"
		keep_alive: 30, // TCP keepalive every 30s - the connection doesn't drop while idle
	});
if (process.env.NODE_ENV !== "production") globalThis.__pg = client;

export const db = drizzle(client);

// The remote DB sometimes doesn't respond to a new connection (CONNECT_TIMEOUT) or drops
// the connection. Wrap reads in an auto-retry: transient network failures must not
// crash page rendering. Only for idempotent operations (reads)!
function isTransientDbError(e: unknown): boolean {
	const msg = `${(e as Error)?.message ?? ""} ${((e as { cause?: { message?: string } })?.cause?.message) ?? ""}`;
	return /CONNECT_TIMEOUT|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|connection|terminated|socket|write\s/i.test(msg);
}

export async function withDbRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
	let lastErr: unknown;
	for (let i = 0; i < tries; i++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			if (i === tries - 1 || !isTransientDbError(e)) throw e;
			await new Promise((r) => setTimeout(r, 250 * (i + 1)));
		}
	}
	throw lastErr;
}
