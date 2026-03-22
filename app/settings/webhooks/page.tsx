import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SettingsNav } from "@/components/settings/settings-nav";
import { WebhookSettingsClient } from "@/components/settings/webhook-settings-client";
import { getWebhookSettingsForUser } from "@/lib/webhooks";

export default async function WebhookSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const snapshot = await getWebhookSettingsForUser(session.user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/webhooks" plan={snapshot.plan.plan} />
      <WebhookSettingsClient initial={snapshot} />
    </main>
  );
}
