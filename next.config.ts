import type { NextConfig } from "next";
import path from "node:path";

// Content security policy. List exactly what the site needs:
// Google fonts, frames from our own storage, connections to OpenAI for chat and
// voice mode. The browser blocks everything else, including an attempt to
// load a third-party script through injected HTML.
const csp = [
	"default-src 'self'",
	// 'unsafe-inline' is needed by Next for its bootstrap scripts, 'unsafe-eval' -
	// for hot reload in development.
	`script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com data:",
	"img-src 'self' data: blob: https:",
	"media-src 'self' blob: https:",
	// Chat and voice transcription talk to OpenAI directly from the browser in
	// voice mode (WebRTC), the rest goes through our server.
	"connect-src 'self' https://api.openai.com wss://api.openai.com",
	"frame-ancestors 'none'", // the site cannot be embedded in someone else's page
	"base-uri 'self'",
	"form-action 'self'",
	"object-src 'none'",
	"upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
	{ key: "Content-Security-Policy", value: csp },
	// The browser must use only https for a year.
	{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
	// Do not guess the file type from its content - otherwise an image could be passed off as a script.
	{ key: "X-Content-Type-Options", value: "nosniff" },
	// Forbid embedding in an iframe (duplicates frame-ancestors for old browsers).
	{ key: "X-Frame-Options", value: "DENY" },
	// Other sites only get the domain, without path and parameters.
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	// The microphone is needed only for voice chat, everything else is off.
	{ key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
];

// Project presentation sites in public/ (the only copy: public/sena and public/luma).
const PROJECT_SITES = ["sena", "luma"];

const nextConfig: NextConfig = {
	// Pin the workspace root to this project so Turbopack doesn't infer the
	// home directory (~) as the root and recursively watch every file there.
	turbopack: {
		root: path.resolve(__dirname),
	},

	// Server version and stack are a free hint for anyone looking for vulnerabilities.
	poweredByHeader: false,

	// Project presentation sites (public/sena, public/luma) open at an address with a trailing slash: /sena/.
	// Without the slash their relative links to styles and scripts would lead to the site root, so Next must not strip it;
	// proxy.ts adds the slash to a bare /sena.
	skipTrailingSlashRedirect: true,

	async headers() {
		return [{ source: "/:path*", headers: securityHeaders }];
	},

	// The personal gallery section moved from a transliterated address to an English one -
	// old links must keep working.
	async redirects() {
		return [
			{ source: "/about/galereya", destination: "/about/personal", permanent: true },
		];
	},

	// /sena/ and /luma/ are presentation-site pages, not catch-all [slug] label links.
	async rewrites() {
		return {
			beforeFiles: PROJECT_SITES.map((name) => ({ source: `/${name}/`, destination: `/${name}/index.html` })),
			afterFiles: [],
			fallback: [],
		};
	},
};

export default nextConfig;
