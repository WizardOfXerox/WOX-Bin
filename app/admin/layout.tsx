import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/deployment", label: "Deployment" },
  { href: "/admin/storage", label: "Storage" },
  { href: "/admin/discord", label: "Discord" },
  { href: "/admin/reports", label: "Reports" },
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
      <div className="w-full px-3 py-4 sm:px-4 md:px-6 xl:px-8 2xl:px-10">
        <div className="grid min-h-[calc(100dvh-2rem)] gap-5 xl:grid-cols-[clamp(16rem,18vw,20rem)_minmax(0,1fr)] 2xl:gap-6">
          <aside className="glass-panel h-fit w-full shrink-0 p-5 sm:p-6 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <p className="mt-2 font-semibold">{session.user.username ?? session.user.email ?? "Admin"}</p>
            <nav className="mt-6 flex flex-wrap gap-2 md:flex-col md:gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground md:border-transparent"
                  href={l.href}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <Link
              className="mt-6 block rounded-xl border border-white/10 px-3 py-2.5 text-center text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
              href="/app"
            >
              ← Workspace
            </Link>
          </aside>
          <main className="min-w-0 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
