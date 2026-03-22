import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

type WorkspacePageProps = {
  searchParams: Promise<{
    fork?: string;
  }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const session = await auth();
  const sp = await searchParams;
  const initialForkSlug =
    typeof sp.fork === "string" && sp.fork.trim() ? sp.fork.trim() : undefined;

  if (session?.user?.id && (!session.user.onboardingComplete || !session.user.username)) {
    redirect("/account/onboarding");
  }

  return (
    <WorkspaceShell
      initialForkSlug={initialForkSlug}
      sessionUser={
        session?.user?.id
          ? {
              id: session.user.id,
              username: session.user.username,
              displayName: session.user.displayName,
              name: session.user.name ?? null,
              role: session.user.role,
              plan: session.user.plan,
              planStatus: session.user.planStatus
            }
          : null
      }
    />
  );
}
