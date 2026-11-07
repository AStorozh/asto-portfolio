export type GalleryNote = { label?: string; text: string; quote?: boolean };

// Notes markup (text of the "Gallery" block in the admin):
//   ### Label          - a small caption above the note (optional)
//   Note text
//   :quote: Text       - a quote note (larger)
// Notes are separated by an empty line.
export function parseGalleryNotes(src: string): GalleryNote[] {
	const notes: GalleryNote[] = [];
	for (const chunk of src.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
		const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
		if (!lines.length) continue;
		let label: string | undefined;
		if (lines[0].startsWith("### ")) label = lines.shift()!.slice(4).trim();
		let text = lines.join(" ").replace(/\*\*/g, "").trim();
		if (!text) continue;
		let quote = false;
		if (text.startsWith(":quote:")) {
			quote = true;
			text = text.slice(7).trim();
		}
		notes.push({ label, text, quote });
	}
	return notes;
}
