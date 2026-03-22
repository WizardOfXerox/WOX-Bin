import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsNav } from "@/components/settings/settings-nav";
import { TeamSettingsClient } from "@/components/settings/team-settings-client";
import { getUserPlanSummary } from "@/lib/usage-service";
import { getTeamSettingsSnapshot } from "@/lib/team-service";

export default async function TeamSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const [teamSnapshot, plan] = await Promise.all([
    getTeamSettingsSnapshot(session.user.id),
    getUserPlanSummary(session.user.id)
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/team" plan={plan.plan} />
      <TeamSettingsClient initial={teamSnapshot} />
    </main>
  );
}
