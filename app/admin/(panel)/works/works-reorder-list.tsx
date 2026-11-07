"use client";

import { useRef, useState, useTransition } from "react";
import { reorderWorks } from "@/app/actions/works-actions";
import { WorkEditForm } from "./work-form";
import { type CategoryData, type WorkData } from "./form-shared";

export function WorksReorderList({
	works,
	categories,
}: {
	works: WorkData[];
	categories: CategoryData[];
}) {
	const [items, setItems] = useState<WorkData[]>(works);
	const dragIndex = useRef<number | null>(null);
	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [, startTransition] = useTransition();

	function persist(order: WorkData[]) {
		const fd = new FormData();
		fd.set("ids", order.map((w) => w.id).join(","));
		startTransition(() => {
			void reorderWorks(fd);
		});
	}

	function finish() {
		dragIndex.current = null;
		setDraggingId(null);
		persist(items);
	}

	return (
		<div className="flex flex-col gap-3">
			{items.map((w, i) => (
				<div
					key={w.id}
					draggable={draggingId === w.id}
					onDragStart={() => {
						dragIndex.current = i;
					}}
					onDragOver={(e) => {
						e.preventDefault();
						const from = dragIndex.current;
						if (from === null || from === i) return;
						setItems((prev) => {
							const next = [...prev];
							const [moved] = next.splice(from, 1);
							next.splice(i, 0, moved);
							return next;
						});
						dragIndex.current = i;
					}}
					onDrop={(e) => {
						e.preventDefault();
						finish();
					}}
					onDragEnd={finish}
					className={`flex items-start gap-2 rounded-2xl transition-opacity ${draggingId === w.id ? "opacity-50" : ""}`}
				>
					{/* Drag handle - drag only by it */}
					<button
						type="button"
						aria-label="Перетащить для изменения порядка"
						title="Перетащить"
						onPointerDown={() => setDraggingId(w.id)}
						onPointerUp={() => setDraggingId(null)}
						className="mt-2.5 shrink-0 cursor-grab touch-none select-none rounded-lg px-2 py-2 text-base leading-none text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
					>
						⠿
					</button>
					<div className="min-w-0 flex-1">
						<WorkEditForm work={w} categories={categories} />
					</div>
				</div>
			))}
		</div>
	);
}
