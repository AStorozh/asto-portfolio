import { getLang, getTranslations, withLang } from "@/lib/lang";
import { getAllSiteImages, getResumeSections, getResumeTexts } from "@/lib/content";
import { mediaUrl, mediaBlur } from "@/lib/media-url";
import { DownloadButton } from "./download-button";

type ResumeFileDocumentProps = {
	embedded?: boolean;
	lang?: "ru" | "en" | "de";
};

type Segment =
	| { type: "subheading"; text: string }
	| { type: "para"; text: string }
	| { type: "list"; items: string[] };

// Parsing a block body: lines with "#" are subheadings; a group of 1 line is a paragraph, of several - a list
function parseBody(body: string): Segment[] {
	const segments: Segment[] = [];
	let group: string[] = [];
	const flush = () => {
		if (group.length === 0) return;
		if (group.length === 1) segments.push({ type: "para", text: group[0] });
		else segments.push({ type: "list", items: group });
		group = [];
	};
	for (const raw of body.split("\n")) {
		const line = raw.trim();
		if (line === "") {
			flush();
			continue;
		}
		if (/^#{1,3}\s*/.test(line)) {
			flush();
			const text = line.replace(/^#{1,3}\s*/, "").trim();
			if (text) segments.push({ type: "subheading", text });
		} else {
			group.push(line.replace(/^[-•·]\s*/, "").trim());
		}
	}
	flush();
	return segments;
}

// Turns the contact block segments (label + value) into a flat list
// of { label, value } pairs - one line per contact.
function toContacts(segments: Segment[]): { label: string; value: string }[] {
	const out: { label: string; value: string }[] = [];
	let label = "";
	for (const seg of segments) {
		if (seg.type === "subheading") label = seg.text;
		else if (seg.type === "para") {
			out.push({ label, value: seg.text });
			label = "";
		}
		else for (const item of seg.items) out.push({ label, value: item });
	}
	return out;
}

// Icon by contact label (phone, telegram, github, site). 16×16, inherits color.
function ContactIcon({ label }: { label: string }) {
	const l = label.toLowerCase();
	const common = {
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		className: "h-[15px] w-[15px] shrink-0",
		"aria-hidden": true,
	};
	if (/telegram|tg|@/.test(l))
		return (
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				className="h-[15px] w-[15px] shrink-0"
				aria-hidden
			>
				<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
			</svg>
		);
	if (/тел|phone|tel|\+\d/.test(l))
		return (
			<svg {...common}>
				<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
			</svg>
		);
	if (/e-?mail|почт/.test(l))
		return (
			<svg {...common}>
				<rect x="2" y="4" width="20" height="16" rx="2" />
				<path d="M22 6l-10 7L2 6" />
			</svg>
		);
	if (/github|git/.test(l))
		return (
			<svg {...common}>
				<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
			</svg>
		);
	if (/linkedin|linked\.in/.test(l))
		return (
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				className="h-[15px] w-[15px] shrink-0"
				aria-hidden
			>
				<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
			</svg>
		);
	return (
		<svg {...common}>
			<circle cx="12" cy="12" r="10" />
			<line x1="2" y1="12" x2="22" y2="12" />
			<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	);
}

export async function ResumeFileDocument({ embedded = false, lang: langProp }: ResumeFileDocumentProps) {
	const lang = langProp ?? (await getLang());
	const [t, rawResumeTexts, rawSections, siteImgs] = await Promise.all([
		getTranslations(lang),
		getResumeTexts(),
		getResumeSections(),
		getAllSiteImages(),
	]);
	const resumeKV = withLang(rawResumeTexts, lang);
	const photoRaw = siteImgs["resume_photo"] ?? "";
	const photo = mediaUrl(photoRaw, { w: 600 });
	const photoBlur = mediaBlur(photoRaw);

	// Value from the DB, falling back to the default translation
	const rv = (key: string, fallback: string) => {
		const v = resumeKV[key];
		return v != null && v.trim() !== "" ? v : fallback;
	};

	const name = rv("resume_name", t.resume_name);
	const role = rv("resume_role", t.resume_role);
	const sidebarBg = mediaUrl(siteImgs["resume_sidebar_bg"] ?? "", { w: 800 });

	// Generic blocks: heading + subheadings / paragraphs / lists
	const pickSections = (part: "sidebar" | "main") =>
		rawSections
			.filter((s) => s.part === part)
			.map((s) => ({
				id: s.id,
				slug: s.slug,
				title: (lang === "en" ? s.title_en || s.title : lang === "de" ? s.title_de || s.title : s.title).trim(),
				segments: parseBody(lang === "en" ? s.body_en || s.body : lang === "de" ? s.body_de || s.body : s.body),
			}))
			.filter((s) => s.title || s.segments.length);
	const sidebarSections = pickSections("sidebar");
	const mainSections = pickSections("main");

	const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.22em]";

	return (
		<main
			className="min-h-[calc(100dvh-4rem)] overflow-y-auto px-5 py-5"
			aria-label={t.resume_file_aria}
			data-page="резюме файл"
		>
			<div className="flex w-full justify-center">
				<section
					data-block="резюме файл контент"
					className={`grid w-full max-w-[1000px] grid-cols-1 overflow-hidden bg-background text-foreground sm:aspect-[210/297] sm:grid-cols-[34%_1fr] ${
						embedded
							? "rounded-3xl border-2 border-foreground shadow-none"
							: "rounded-3xl border-2 border-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.05)]"
					}`}
				>
					{/* ── Sidebar (dark) ── */}
					<aside className="relative order-2 flex min-h-0 flex-col gap-5 bg-foreground p-5 text-background sm:order-none sm:gap-6 sm:p-8">
						<div
							className="relative mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-[1.6rem] border border-white/10 bg-cover bg-center shadow-[0_18px_45px_rgba(0,0,0,0.35)] sm:max-w-none"
							style={photoBlur ? { backgroundImage: `url(${photoBlur})` } : undefined}
						>
							{photo && (
								<img
									src={photo}
									alt={name}
									draggable={false}
									decoding="async"
									className="block aspect-square w-full object-cover object-center grayscale"
								/>
							)}
						</div>

						{sidebarSections.map((s) => (
							<section key={s.id} className="space-y-2">
								{s.title && <h2 className={`${eyebrow} text-white/45`}>{s.title}</h2>}
								{s.slug === "contacts" ? (
									<ul className="space-y-1.5 text-[13px] leading-snug text-white/85">
										{toContacts(s.segments).map((c, i) => (
											<li key={i} className="flex items-center gap-2.5">
												<span className="text-white/55">
													<ContactIcon label={c.label} />
												</span>
												<span className="break-all">{c.value}</span>
											</li>
										))}
									</ul>
								) : (
									s.segments.map((seg, i) =>
									seg.type === "subheading" ? (
										<h3 key={i} className="pt-1 text-[13px] font-bold tracking-wide text-white">{seg.text}</h3>
									) : seg.type === "para" ? (
										<p key={i} className="text-[13px] leading-snug text-white/80">{seg.text}</p>
									) : (
										<ul key={i} className="space-y-0.5 text-[13px] leading-snug text-white/80">
											{seg.items.map((item, j) => (
												<li key={j} className="flex gap-2.5">
													<span className="flex h-[1.3em] shrink-0 items-center">
														<span className="h-1.5 w-1.5 rounded-full bg-white/40" />
													</span>
													<span className="break-words">{item}</span>
												</li>
											))}
										</ul>
									),
								))}
							</section>
						))}

							{/* Decorative image in the bottom right corner of the dark column */}
							{sidebarBg && (
								<div
									className="pointer-events-none absolute bottom-5 right-5 h-32 w-32 sm:bottom-7 sm:right-7 sm:h-48 sm:w-48"
									style={{
										maskImage: "radial-gradient(ellipse at center, black 45%, transparent 90%)",
										WebkitMaskImage: "radial-gradient(ellipse at center, black 45%, transparent 90%)",
									}}
								>
									<img
										src={sidebarBg}
										alt=""
										aria-hidden="true"
										className="h-full w-full select-none object-contain opacity-30 grayscale"
									/>
									{/* Shadow on top - slightly overlaps the image */}
									<div className="absolute inset-0 bg-gradient-to-t from-transparent to-foreground" />
								</div>
							)}
						</aside>

					{/* ── Main part (light) ── */}
					<div className="relative flex min-h-0 flex-col overflow-hidden p-5 sm:p-8">
						{/* Header */}
						<div className="border-b-2 border-foreground pb-4 sm:pb-5">
							<h1 className="text-balance text-center text-[2.1rem] font-black leading-[1.03] tracking-[0.015em] sm:whitespace-nowrap sm:text-[2.9rem] sm:leading-[1.02] sm:tracking-[0.01em]">
								{name}
							</h1>
							<p className="mt-4 flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.22em] text-background sm:mt-5 sm:text-[14px]">
								{role}
							</p>
						</div>

						{mainSections.map((s) => (
							<section key={s.id} className="mt-4 space-y-1.5 sm:mt-4">
								{s.title && (
									<h2 className="text-[15px] font-extrabold uppercase tracking-tight">{s.title}</h2>
								)}
								{s.segments.map((seg, i) =>
									seg.type === "subheading" ? (
										<h3 key={i} className="pt-0.5 text-[13.5px] font-extrabold leading-tight text-foreground">{seg.text}</h3>
									) : seg.type === "para" ? (
										<p key={i} lang={lang} className="text-justify hyphens-auto text-[12.5px] leading-snug text-foreground/80">{seg.text}</p>
									) : (
										<ul key={i} className="space-y-0 text-[12.5px] leading-snug text-foreground/80">
											{seg.items.map((item, j) => (
												<li key={j} className="flex gap-2.5">
													<span className="flex h-[1.3em] shrink-0 items-center">
														<span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
													</span>
													<span lang={lang} className="min-w-0 flex-1 text-justify hyphens-auto">{item}</span>
												</li>
											))}
										</ul>
									),
								)}
							</section>
						))}

						{/* Footnote - dark plate, flush with the bottom right corner of the block */}
						{/* Phone: a normal block at the end of the column that wraps, otherwise the one-line plate ran past the left edge */}
						<div className="-mb-5 -mr-5 mt-6 flex max-w-[calc(100%+1.25rem)] flex-wrap items-center gap-x-1.5 gap-y-1 self-end rounded-tl-2xl bg-foreground py-2.5 pl-5 pr-4 text-[11px] font-medium leading-snug text-background sm:absolute sm:bottom-0 sm:right-0 sm:m-0 sm:max-w-none sm:flex-nowrap sm:whitespace-nowrap sm:leading-none">
							{rv("resume_more_info", t.resume_more_info)}
							<a
								href="https://asto-portfolio.ru"
								target="_blank"
								rel="noreferrer"
								data-analytics="contact_click"
								data-analytics-meta="website"
								className="text-[15px] font-extrabold tracking-tight text-amber-400"
							>
								asto-portfolio.ru
							</a>
						</div>

					</div>
				</section>
			</div>

			{/* Download button - in the screen corner, over the resume sheet */}
			{!embedded && (
				<DownloadButton
					label={lang === "en" ? "Download PDF" : lang === "de" ? "PDF herunterladen" : "Скачать PDF"}
					loadingLabel={lang === "en" ? "Preparing…" : lang === "de" ? "Wird erstellt…" : "Готовим файл…"}
					className="group fixed bottom-5 right-5 z-50 inline-flex items-center gap-2.5 rounded-full border-2 border-foreground bg-background py-2.5 pl-5 pr-2.5 text-sm font-semibold tracking-tight text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04),0_14px_42px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0"
				/>
			)}
		</main>
	);
}

export default function ResumeFilePage() {
	return <ResumeFileDocument />;
}
