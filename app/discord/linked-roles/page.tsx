import type { Metadata } from "next";
import Link from "next/link";
import { Link2, ShieldCheck, UserCheck } from "lucide-react";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Discord Linked Roles Verification",
  description: "Verification landing page for Discord Linked Roles and WOX-Bin account status."
};

export const dynamic = "force-dynamic";

export default async function DiscordLinkedRolesPage() {
  const session = await auth();
  const user = session?.user ?? null;
  const isSignedIn = Boolean(user?.id);

  const statusChips = isSignedIn
    ? [
        { label: `Role: ${user.role}`, tone: "default" as const },
        { label: `Plan: ${user.plan}`, tone: "default" as const },
        {
          label: user.onboardingComplete ? "Profile ready" : "Profile setup pending",
          tone: user.onboardingComplete ? ("default" as const) : ("secondary" as const)
        }
      ]
    : [];

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
        <SiteHeader />

        <section className="glass-panel overflow-hidden px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <Badge className="px-3 py-1 text-xs">Discord Linked Roles</Badge>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Verification URL</p>
                <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  Verify your WOX-Bin account before Discord uses it for linked-role requirements.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  This page is safe to use as the Discord Developer Portal Linked Roles Verification URL. It confirms the
                  user is signed in to WOX-Bin and gives them a clear landing page before any linked-role rules are applied.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {isSignedIn ? (
                  <>
                    <Button asChild size="lg">
                      <Link href="/settings/account">Open account settings</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/discord">Back to Discord bot</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg">
                      <Link href="/sign-in">Sign in to verify</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/sign-up">Create account</Link>
                    </Button>
                  </>
                )}
              </div>
              {statusChips.length ? (
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {statusChips.map((chip) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-foreground"
                      key={chip.label}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Current verification status
                  </div>
                  {isSignedIn ? (
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Signed in as <span className="font-semibold text-foreground">{user.displayName ?? user.name ?? user.username ?? user.email}</span>
                      </p>
                      <p>
                        Username: <span className="font-mono text-foreground">{user.username ?? "Unavailable"}</span>
                      </p>
                      <p>
                        Account role: <span className="text-foreground">{user.role}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm leading-7 text-muted-foreground">
                      You are not signed in right now. Sign in first so WOX-Bin can verify that you own this account before
                      Discord checks linked-role requirements.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    What this page does
                  </div>
                  <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
                    <li>Confirms the user can reach and sign in to WOX-Bin over HTTPS.</li>
                    <li>Gives Discord a stable verification landing URL for linked-role requirements.</li>
                    <li>Keeps the flow honest: account verification is handled here, while linked-role rules can expand later.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-primary" />
                    Next step
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    After you save this page as the Linked Roles Verification URL in Discord, you can continue using
                    WOX-Bin’s Discord dashboard for install links, webhooks, and slash-command setup.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
