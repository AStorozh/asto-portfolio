// The "↗" arrow icon as an SVG instead of a Unicode character,
// so it looks the same on all devices and in any browser.
// Color is inherited via currentColor, the default size equals the font size (1em).
export function ArrowUpRight({ className = "size-[1em]" }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.25}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M7 17 17 7" />
			<path d="M8 7h9v9" />
		</svg>
	);
}
