"use client";

import { useEffect } from "react";

// Prepares the resume sheet for printing: fits the whole layout (1000px wide) onto one A4 sheet,
// keeping 1:1 proportions with the /resume-file page, then calls print.
function fitToA4() {
	const sheet = document.querySelector('[data-block="резюме файл контент"]') as HTMLElement | null;
	const wrapper = sheet?.parentElement as HTMLElement | null;
	const main = wrapper?.parentElement as HTMLElement | null;
	if (!sheet || !wrapper || !main) return;

	// A4 in CSS pixels at 96 dpi
	const PAGE_W = 793.7;
	const PAGE_H = 1122.5;
	const DESIGN_W = 1000; // layout width of the sheet (as on screen)
	const DESIGN_H = (DESIGN_W * 297) / 210; // A4 height at 1000px width ≈ 1414

	sheet.style.maxWidth = "none";
	sheet.style.width = `${DESIGN_W}px`;
	sheet.style.aspectRatio = "auto";
	sheet.style.height = "auto";

	// if the content is shorter than A4 the sheet is still A4 (as on screen), otherwise it grows to fit the content
	const sheetH = Math.max(sheet.scrollHeight, DESIGN_H);
	sheet.style.height = `${sheetH}px`;

	const scale = Math.min(PAGE_W / DESIGN_W, PAGE_H / sheetH);
	const offsetX = Math.max(0, (PAGE_W - DESIGN_W * scale) / 2);

	sheet.style.transformOrigin = "top left";
	sheet.style.transform = `translateX(${offsetX}px) scale(${scale})`;

	wrapper.style.display = "block";
	wrapper.style.width = `${PAGE_W}px`;
	wrapper.style.height = `${PAGE_H}px`;
	wrapper.style.overflow = "hidden";

	main.style.minHeight = "0";
	main.style.height = "auto";
	main.style.overflow = "visible";
	main.style.padding = "0";
	main.style.margin = "0";
}

export function AutoPrint() {
	useEffect(() => {
		fitToA4();
		const onLoad = () => fitToA4();
		window.addEventListener("load", onLoad);
		const t = setTimeout(() => {
			fitToA4();
			window.print();
		}, 600);
		return () => {
			clearTimeout(t);
			window.removeEventListener("load", onLoad);
		};
	}, []);
	return null;
}
