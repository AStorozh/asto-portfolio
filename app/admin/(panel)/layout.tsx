import { AdminSidebar } from "../admin-sidebar";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
	// Access is closed by the server middleware.ts - without a valid session the page is not served.
	return (
		<main className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-background p-2 sm:p-3 md:px-5 md:py-5" aria-label="Админка">
			{/* Phone: the menu is a top bar with a drawer; from md up it is a column on the left. */}
			<div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row md:gap-5">
				<AdminSidebar />
				<section
					aria-label="Контент админки"
					className="min-h-0 flex-1 overflow-hidden rounded-2xl border-2 md:rounded-3xl border-foreground bg-background shadow-[0_1px_0_rgba(0,0,0,0.03),0_14px_42px_rgba(0,0,0,0.05)]"
				>
					{children}
				</section>
			</div>
		</main>
	);
}
