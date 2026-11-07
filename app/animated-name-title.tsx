"use client";

import { useEffect, useState } from "react";

function shuffleIndexes(length: number) {
	const indexes = Array.from({ length }, (_, index) => index);
	for (let index = indexes.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
	}
	return indexes;
}

export function AnimatedNameTitle({ words }: { words: string[] }) {
	const letters = words.flatMap((word) => [...word]);

	const [visibleLetters, setVisibleLetters] = useState<Set<number>>(() => new Set());

	useEffect(() => {
		// "Reduce motion" in the OS: show the whole name at once, like the quotes and the logo.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setVisibleLetters(new Set(letters.map((_, index) => index)));
			return;
		}
		setVisibleLetters(new Set());
		const order = shuffleIndexes(letters.length);
		let orderIndex = 0;

		const intervalId = window.setInterval(() => {
			const nextLetter = order[orderIndex];
			setVisibleLetters((currentLetters) => {
				const nextLetters = new Set(currentLetters);
				nextLetters.add(nextLetter);
				return nextLetters;
			});
			orderIndex += 1;
			if (orderIndex >= order.length) {
				window.clearInterval(intervalId);
			}
		}, 48);

		return () => window.clearInterval(intervalId);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [words.join(",")]);

	let letterIndex = 0;

	return (
		<h1 className="flex w-full min-w-0 flex-col items-center justify-center gap-0 text-center lg:flex-row lg:flex-nowrap lg:items-baseline lg:justify-evenly lg:gap-0 text-[clamp(1.75rem,6vw,5.5rem)] font-black leading-[1.05] tracking-[0.12em] sm:tracking-[0.145em] [text-wrap:balance] select-none">
			{words.map((word) => (
				<span key={word} className="shrink-0 whitespace-nowrap">
					{[...word].map((letter, index) => {
						const currentIndex = letterIndex;
						letterIndex += 1;
						const fromTop = currentIndex % 2 === 0;
						const isVisible = visibleLetters.has(currentIndex);

						return (
							<span
								key={`${letter}-${index}`}
								className={isVisible ? "name-letter-in inline-block opacity-0" : "inline-block opacity-0"}
								style={{
									"--name-letter-y": fromTop ? "-0.22em" : "0.22em",
								} as React.CSSProperties}
							>
								{letter}
							</span>
						);
					})}
				</span>
			))}
		</h1>
	);
}
