import { db } from "@/lib/db";
import { adminNotes } from "@/lib/schema";
import { NoteEditor } from "./note-editor";

export default async function AdminNotesPage() {
	const [note] = await db.select().from(adminNotes).limit(1);

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b border-border/50 px-4 py-4 sm:px-6 sm:py-5">
				<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground">Заметки</p>
				<p className="mt-1 text-xs text-muted-foreground">Личные заметки и идеи по сайту</p>
			</div>
			<div className="min-h-0 flex-1 flex flex-col px-3 py-4 sm:px-6 sm:py-6">
				<NoteEditor initialValue={note?.content ?? ""} />
			</div>
		</div>
	);
}
