import crypto from "crypto";

// A minimal Google Sheets API client on a service account - without external
// dependencies: we sign the JWT (RS256) ourselves and call the REST API.

type ServiceAccount = {
	client_email: string;
	private_key: string;
	token_uri: string;
};

function getServiceAccount(): ServiceAccount {
	const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
	if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_B64 не задан в .env.local");
	const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
	return {
		client_email: json.client_email,
		private_key: json.private_key,
		token_uri: json.token_uri || "https://oauth2.googleapis.com/token",
	};
}

function base64url(input: Buffer | string): string {
	return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.exp - 60 > Date.now() / 1000) return cachedToken.token;

	const sa = getServiceAccount();
	const now = Math.floor(Date.now() / 1000);
	const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	const claim = base64url(
		JSON.stringify({
			iss: sa.client_email,
			scope: "https://www.googleapis.com/auth/spreadsheets",
			aud: sa.token_uri,
			iat: now,
			exp: now + 3600,
		}),
	);
	const signingInput = `${header}.${claim}`;
	const signature = base64url(
		crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key),
	);
	const jwt = `${signingInput}.${signature}`;

	const res = await fetch(sa.token_uri, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion: jwt,
		}),
	});
	if (!res.ok) throw new Error(`Google token error: ${await res.text()}`);
	const data = await res.json();
	cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
	return cachedToken.token;
}

const API = "https://sheets.googleapis.com/v4/spreadsheets";

async function api(path: string, init?: RequestInit) {
	const token = await getAccessToken();
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
	});
	if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
	return res.json();
}

// Makes sure tabs with the given names exist.
async function ensureSheets(spreadsheetId: string, titles: string[]): Promise<void> {
	const meta = await api(`/${spreadsheetId}?fields=sheets.properties.title`);
	const existing = new Set<string>((meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title));
	const toAdd = titles.filter((t) => !existing.has(t));
	if (toAdd.length === 0) return;
	await api(`/${spreadsheetId}:batchUpdate`, {
		method: "POST",
		body: JSON.stringify({ requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })) }),
	});
}

// Clears the tab and writes values starting at A1.
export async function writeTab(
	spreadsheetId: string,
	title: string,
	values: (string | number)[][],
): Promise<void> {
	await api(`/${spreadsheetId}/values/${encodeURIComponent(`${title}!A1:Z100000`)}:clear`, {
		method: "POST",
		body: "{}",
	});
	await api(
		`/${spreadsheetId}/values/${encodeURIComponent(`${title}!A1`)}?valueInputOption=RAW`,
		{ method: "PUT", body: JSON.stringify({ values }) },
	);
}

export async function writeSheets(
	spreadsheetId: string,
	tabs: { title: string; values: (string | number)[][] }[],
): Promise<void> {
	await ensureSheets(
		spreadsheetId,
		tabs.map((t) => t.title),
	);
	for (const t of tabs) await writeTab(spreadsheetId, t.title, t.values);
}
