import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BillingSettingsClient } from "@/components/settings/billing-settings-client";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getBillingSettingsSnapshot } from "@/lib/billing-service";

export default async function BillingSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const snapshot = await getBillingSettingsSnapshot(session.user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/billing" plan={snapshot.plan.plan} />
      <BillingSettingsClient initial={snapshot} isAdmin={session.user.role === "admin"} />
    </main>
  );
}
