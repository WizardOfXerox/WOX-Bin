import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SupportDashboard } from "@/components/support/support-dashboard";
import { isStaffSession } from "@/lib/admin-auth";
import { listSupportTicketsForStaff } from "@/lib/support-service";

type ManageSupportPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

export default async function ManageSupportPage({ searchParams }: ManageSupportPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/support/manage");
  }
  if (!isStaffSession(session)) {
    redirect("/support");
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "all";
  const tickets = await listSupportTicketsForStaff({
    q,
    status: status as "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "all"
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SupportDashboard initialSearch={q} initialStatus={status} initialTickets={tickets} viewerUserId={session.user.id} />
    </main>
  );
}
