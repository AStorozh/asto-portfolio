"use client";

import { Lora } from "next/font/google";
import { useEffect, useRef } from "react";

const lora = Lora({ subsets: ["latin"], weight: "700" });

type Particle = { hx: number; hy: number; x: number; y: number; ph: number; sp: number };

// A word made of drifting dots connected by lines. Port of netlogo.js from hire-flow.
export function NetLogo({ text, className }: { text: string; className?: string }) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const DPR = Math.min(window.devicePixelRatio || 1, 2);
		const font = lora.style.fontFamily;

		let particles: Particle[] = [];
		let W = 0, H = 0, cell = 12, maxD2 = 1, dot = 1.5, wob = 2.6, ink = "#222";
		let raf = 0;
		let alive = true;

		function build() {
			// Size without rotation: in a rotated card getBoundingClientRect would return an inflated box.
			W = canvas!.clientWidth;
			H = canvas!.clientHeight;
			particles = [];
			if (!W || !H) return;
			canvas!.width = W * DPR;
			canvas!.height = H * DPR;
			ink = getComputedStyle(canvas!).color || "#222";

			const off = document.createElement("canvas");
			off.width = W;
			off.height = H;
			const o = off.getContext("2d");
			if (!o) return;
			const fs = Math.min(H * 0.72, (W * 0.94) / (text.length * 0.52));
			o.fillStyle = "#000";
			o.textAlign = "center";
			o.textBaseline = "middle";
			o.font = `700 ${fs}px ${font}, Georgia, 'Times New Roman', serif`;
			o.fillText(text, W / 2, H / 2 + fs * 0.04);
			const data = o.getImageData(0, 0, W, H).data;

			// In a small logo the dots are smaller and denser, otherwise the letters blend together.
			const gap = Math.max(2, Math.round(fs / 20));
			dot = Math.min(1.5, gap * 0.4);
			wob = Math.min(2.6, gap * 0.65);
			cell = gap * 2.2;
			maxD2 = cell * cell;
			for (let y = 0; y < H; y += gap) {
				for (let x = 0; x < W; x += gap) {
					if (data[(y * W + x) * 4 + 3] > 130) {
						particles.push({
							hx: x,
							hy: y,
							x: x + (Math.random() - 0.5) * 48,
							y: y + (Math.random() - 0.5) * 48,
							ph: Math.random() * 6.283,
							sp: 0.55 + Math.random() * 0.5,
						});
					}
				}
			}
		}

		function update(t: number) {
			for (const p of particles) {
				const ox = Math.cos(t * p.sp + p.ph) * wob;
				const oy = Math.sin(t * p.sp * 1.12 + p.ph) * wob;
				p.x += (p.hx + ox - p.x) * 0.055;
				p.y += (p.hy + oy - p.y) * 0.055;
			}
		}

		function draw() {
			ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
			ctx!.clearRect(0, 0, W, H);
			ctx!.fillStyle = ink;
			ctx!.strokeStyle = ink;

			const grid = new Map<string, number[]>();
			particles.forEach((p, i) => {
				const k = `${(p.x / cell) | 0},${(p.y / cell) | 0}`;
				const arr = grid.get(k);
				if (arr) arr.push(i);
				else grid.set(k, [i]);
			});

			ctx!.lineWidth = 0.7;
			ctx!.globalAlpha = 0.4;
			ctx!.beginPath();
			particles.forEach((p, i) => {
				const cx = (p.x / cell) | 0, cy = (p.y / cell) | 0;
				for (let gx = cx - 1; gx <= cx + 1; gx++) {
					for (let gy = cy - 1; gy <= cy + 1; gy++) {
						const arr = grid.get(`${gx},${gy}`);
						if (!arr) continue;
						for (const j of arr) {
							if (j <= i) continue;
							const q = particles[j];
							const dx = p.x - q.x, dy = p.y - q.y;
							if (dx * dx + dy * dy < maxD2) {
								ctx!.moveTo(p.x, p.y);
								ctx!.lineTo(q.x, q.y);
							}
						}
					}
				}
			});
			ctx!.stroke();

			ctx!.globalAlpha = 1;
			for (const p of particles) {
				ctx!.beginPath();
				ctx!.arc(p.x, p.y, dot, 0, 6.283);
				ctx!.fill();
			}
		}

		function frame(now: number) {
			update(now / 1000);
			draw();
			raf = requestAnimationFrame(frame);
		}

		function start() {
			if (!alive) return;
			cancelAnimationFrame(raf);
			build();
			if (!particles.length) return;
			if (reduce) {
				for (const p of particles) { p.x = p.hx; p.y = p.hy; }
				draw();
			} else {
				raf = requestAnimationFrame(frame);
			}
		}

		let rt: ReturnType<typeof setTimeout>;
		const ro = new ResizeObserver(() => {
			clearTimeout(rt);
			rt = setTimeout(start, 200);
		});
		ro.observe(canvas);
		// The font isn't used in the DOM, so we load it explicitly, otherwise canvas draws a fallback.
		document.fonts.load(`700 1em ${font}`).finally(start);

		return () => {
			alive = false;
			ro.disconnect();
			clearTimeout(rt);
			cancelAnimationFrame(raf);
		};
	}, [text]);

	return <canvas ref={ref} role="img" aria-label={text} className={className} />;
}
