"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight } from "../../arrow-up-right";
import { useCallback, useMemo, useState } from "react";

export function AdminLoginForm({ logoUrl }: { logoUrl: string | null }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [shake, setShake] = useState(false);
	const [loading, setLoading] = useState(false);

	const canSubmit = useMemo(() => code.trim().length > 0 && !loading, [code, loading]);

	const onSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError(null);
			setLoading(true);

			try {
				const res = await fetch("/api/admin/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ password: code }),
				});

				if (!res.ok) {
					const data = await res.json().catch(() => null);
					setError(data?.error ?? "Не удалось войти.");
					setShake(true);
					window.setTimeout(() => setShake(false), 480);
					return;
				}

				const from = searchParams.get("from");
				router.replace(from && from.startsWith("/admin") ? from : "/admin/design");
				router.refresh();
			} catch {
				setError("Сеть недоступна. Попробуйте ещё раз.");
				setShake(true);
				window.setTimeout(() => setShake(false), 480);
			} finally {
				setLoading(false);
			}
		},
		[code, router, searchParams],
	);

	return (
		<main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6">
			{/* Background gold glow in the style of the site's AI surfaces */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full opacity-[0.07] blur-3xl"
				style={{
					backgroundImage:
						"radial-gradient(circle, rgba(217,160,78,1) 0%, rgba(192,138,63,1) 55%, transparent 75%)",
				}}
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute bottom-[-12rem] left-[-8%] h-[30rem] w-[30rem] rounded-full bg-foreground opacity-[0.04] blur-3xl"
			/>

			<section
				className={`call-intro-in relative grid w-full max-w-4xl overflow-hidden rounded-3xl border-2 border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.04),0_28px_80px_rgba(0,0,0,0.10)] md:grid-cols-[1.05fr_1fr] ${
					shake ? "animate-[login-shake_0.45s_cubic-bezier(0.36,0.07,0.19,0.97)]" : ""
				}`}
			>
				{/* ── Brand panel ── */}
				<aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-8 text-background md:flex lg:p-10">
					{logoUrl && (
						<img
							src={logoUrl}
							alt=""
							aria-hidden="true"
							className="pointer-events-none absolute -bottom-6 -right-6 h-56 w-auto select-none"
							style={{ filter: "brightness(0) invert(1)", opacity: 0.08 }}
						/>
					)}

					<div className="relative z-10 flex items-center gap-3">
						<span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5">
							<span className="text-base leading-none"><ArrowUpRight /></span>
						</span>
						<span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
							Закрытая зона
						</span>
					</div>

					<div className="relative z-10">
						<h2 className="text-4xl font-black leading-[1.02] tracking-tight lg:text-5xl">
							ADMIN
						</h2>
						<p className="mt-4 max-w-xs text-[11px] font-medium uppercase leading-relaxed tracking-[0.14em] text-white/55">
							Служебный раздел. Доступ предоставляется только администратору.
						</p>
					</div>

					<div className="relative z-10 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
						<span className="inline-flex h-4 w-4 items-center justify-center">
							<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
								<rect x="4" y="9" width="12" height="8" rx="2" />
								<path d="M7 9V6.5a3 3 0 016 0V9" />
							</svg>
						</span>
						Защищённое соединение
					</div>
				</aside>

				{/* ── Form ── */}
				<div className="flex flex-col justify-center gap-7 p-7 sm:p-9 lg:p-10">
					<div className="flex items-baseline justify-between gap-4">
						<h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">ВХОД</h1>
						<span className="text-right text-[10px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-muted-foreground md:hidden">
							ADMIN
						</span>
					</div>

					<form className="flex flex-col gap-4" onSubmit={onSubmit}>
						<label className="flex flex-col gap-2" htmlFor="admin-code">
							<span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
								КОД ДОСТУПА
							</span>
							<input
								id="admin-code"
								name="code"
								type="password"
								autoComplete="current-password"
								placeholder="Введите код…"
								value={code}
								onChange={(e) => {
									setCode(e.target.value);
									if (error) setError(null);
								}}
								className={`h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 shadow-[0_1px_0_rgba(0,0,0,0.03),0_10px_30px_rgba(0,0,0,0.04)] focus:border-foreground ${
									error ? "border-destructive/60" : "border-border/70"
								}`}
							/>
						</label>

						{error ? (
							<div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-foreground">
								<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-xs text-destructive">
									!
								</span>
								{error}
							</div>
						) : null}

						<button
							type="submit"
							disabled={!canSubmit}
							className="group mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-foreground px-4 text-sm font-semibold text-background shadow-[0_1px_0_rgba(255,255,255,0.06),0_18px_55px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-0.5 hover:bg-foreground/90 active:translate-y-0 active:bg-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
						>
							{loading ? "Проверка…" : "Войти"}
							<span className="text-base leading-none transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0">
								<ArrowUpRight />
							</span>
						</button>
					</form>

					<p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
						Доступ только для администратора
					</p>
				</div>
			</section>

			<style jsx global>{`
				@keyframes login-shake {
					10%,
					90% {
						transform: translateX(-2px);
					}
					20%,
					80% {
						transform: translateX(4px);
					}
					30%,
					50%,
					70% {
						transform: translateX(-7px);
					}
					40%,
					60% {
						transform: translateX(7px);
					}
				}
			`}</style>
		</main>
	);
}
