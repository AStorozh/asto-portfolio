"use client";

import { useState } from "react";
import { track } from "@/lib/analytics-client";

interface DownloadButtonProps {
	label: string;
	loadingLabel: string;
	className?: string;
}

export function DownloadButton({ label, loadingLabel, className }: DownloadButtonProps) {
	const [loading, setLoading] = useState(false);

	async function handleDownload() {
		if (loading) return;
		track("resume_download");
		setLoading(true);
		try {
			const res = await fetch("/resume-file/download");
			if (!res.ok) throw new Error("bad response");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "resume.pdf";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch {
			// fallback - open the print page
			window.open("/resume-file/print", "_blank");
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			type="button"
			onClick={handleDownload}
			aria-busy={loading}
			disabled={loading}
			className={className}
		>
			{loading ? loadingLabel : label}
			<span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.06] text-lg leading-none transition-transform group-hover:translate-y-0.5">
				{loading ? (
					// spinning ring with a gap - shows that the file is being prepared
					<svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden>
						<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
						<path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
					</svg>
				) : (
					"↓"
				)}
			</span>
		</button>
	);
}
