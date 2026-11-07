import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

// The flat config is assembled directly from plugins: the eslint-config-next wrapper
// targets the old format and breaks on the current ESLint version.
export default tseslint.config(
	{ ignores: [".next/**", "node_modules/**", "next-env.d.ts", "uploads/**", "public/**"] },
	tseslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs["core-web-vitals"].rules,
			// Classic hooks rules - mandatory.
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			// React Compiler hints are useful, but on mature code they produce a lot of noise
			// on legitimate patterns (hydration, subscriptions) - kept as a reminder.
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/purity": "warn",
			"react-hooks/refs": "warn",
			"react-hooks/immutability": "warn",

			// Underscore-prefixed arguments are intentionally unused.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			// any is allowed deliberately - a warning, not a blocker.
			"@typescript-eslint/no-explicit-any": "warn",
			// Our own /uploads route serves files with cache headers; next/image is intentionally
			// not used here, see lib/media-url.ts.
			"@next/next/no-img-element": "off",
		},
	},
);
