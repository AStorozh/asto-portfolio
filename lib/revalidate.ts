import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { CONTENT_TAG } from "./content";

// Saving in the admin panel must reset both the page cache and the DB query cache
// (see cached() in lib/content.ts). So all admin actions call this
// wrapper instead of revalidatePath - forgetting the tag becomes impossible.
// updateTag (not revalidateTag) - so the admin sees their edits right away.
export function revalidateContent(path: string, type?: "layout" | "page") {
	updateTag(CONTENT_TAG);
	revalidatePath(path, type ?? "page");
}

// The same, but from a regular request handler (route handler): updateTag
// is available only inside a server action, so revalidateTag is needed there.
export function revalidateContentFromRoute(path: string, type?: "layout" | "page") {
	revalidateTag(CONTENT_TAG, "max");
	revalidatePath(path, type ?? "page");
}
