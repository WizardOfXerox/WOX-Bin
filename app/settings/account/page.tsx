import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AccountSettingsClient } from "@/components/settings/account-settings-client";
import { SettingsNav } from "@/components/settings/settings-nav";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { isSmtpConfigured } from "@/lib/mail";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const [row, googleAccount] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        emailVerified: true
      }
    }),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
      .limit(1)
  ]);

  if (!row) {
    redirect("/sign-in");
  }

  const initial = {
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    hasPassword: Boolean(row.passwordHash),
    emailVerified: Boolean(row.emailVerified),
    smtpConfigured: isSmtpConfigured(),
    googleConnected: Boolean(googleAccount[0]),
    googleOAuthAvailable: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/account" plan={session.user.plan} />
      <AccountSettingsClient initial={initial} />
    </main>
  );
}
