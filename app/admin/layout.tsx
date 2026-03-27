import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/deployment", label: "Deployment" },
  { href: "/admin/discord", label: "Discord" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/pastes", label: "Pastes" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/support/manage", label: "Support" }
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin");
  }
  if (!isAdminSession(session)) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <aside className="glass-panel h-fit w-full shrink-0 p-5 md:sticky md:top-6 md:w-56">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
          <p className="mt-2 font-semibold">{session.user.username ?? session.user.email ?? "Admin"}</p>
          <nav className="mt-6 flex flex-wrap gap-2 md:flex-col md:gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground md:border-transparent"
                href={l.href}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            className="mt-6 block rounded-lg border border-white/10 px-3 py-2 text-center text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
            href="/app"
          >
            ← Workspace
          </Link>
        </aside>
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
