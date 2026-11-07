import { redirect } from "next/navigation";

export default function AdminPage() {
	// Authorized users pass middleware and arrive here → send them to the default section.
	// Unauthorized ones are intercepted by middleware earlier and sent to /admin/login.
	redirect("/admin/design");
}

