import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PastebinMigrateSettingsClient } from "@/components/settings/pastebin-migrate-settings-client";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function MigratePastebinSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/migrate-pastebin" plan={session.user.plan} />
      <PastebinMigrateSettingsClient />
    </main>
  );
}
