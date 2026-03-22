import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, Clock3, ExternalLink, LifeBuoy, Mail, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() || "";

export const metadata: Metadata = {
  title: "Support — WOX-Bin",
  description: "Support and escalation page for WOX-Bin users who need help with accounts, moderation, billing, or paste access."
};

export default function SupportPage() {
  const hasDirectSupport = Boolean(supportEmail || supportUrl);

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <section className="grid gap-8 border-b border-border/60 pb-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <div className="space-y-5 motion-safe:animate-wox-fade-up">
            <Badge className="px-3 py-1 text-xs">Support</Badge>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin</p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Manual help when self-service is no longer enough.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Support is for account lockouts, moderation disputes, billing mistakes, and edge cases that the app cannot
                resolve on its own. Routine questions should go through the Help page first.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/help">
                  Read Help &amp; answers
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings/account">Account settings</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/forgot-password">Forgot password</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Before you contact support</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Have the account email, username, and the time the problem happened.</li>
              <li>Include the exact error text or a screenshot if the app showed one.</li>
              <li>For paste issues, include the paste slug or full share URL.</li>
              <li>For billing issues, include the email used at checkout and the payment timestamp.</li>
            </ul>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Fast paths</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Use built-in flows first: password reset, account settings, session cleanup, and Help answers cover the
              majority of user issues without waiting on an operator.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Security &amp; moderation</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Suspensions, bans, hidden pastes, and abuse reports are handled by administrators. Support is the right
              path for appeals or if a moderation email looks incorrect.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Known limitation</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              If a deployment has not published a direct support channel yet, use Help plus the recovery flows first, then
              contact the operator through the address shown in transactional emails.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-border/70 bg-card/60 p-6 backdrop-blur-sm motion-safe:animate-wox-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Direct contact</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                This deployment can publish an operator email or an external support desk link. If neither is set, the page
                still tells users how to recover access and where to go next.
              </p>
            </div>
            <Badge className="px-3 py-1 text-xs">{hasDirectSupport ? "Configured" : "Not configured yet"}</Badge>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/60 bg-background/60 p-5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Support email</p>
              </div>
              {supportEmail ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{supportEmail}</p>
                  <Button asChild className="mt-4" variant="outline">
                    <a href={`mailto:${supportEmail}`}>Email support</a>
                  </Button>
                </>
              ) : (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  No public support email is configured for this deployment yet.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-border/60 bg-background/60 p-5">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">External support desk</p>
              </div>
              {supportUrl ? (
                <>
                  <p className="mt-3 break-all text-sm leading-7 text-muted-foreground">{supportUrl}</p>
                  <Button asChild className="mt-4" variant="outline">
                    <a href={supportUrl} rel="noreferrer" target="_blank">
                      Open support desk
                    </a>
                  </Button>
                </>
              ) : (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  No external support desk URL is configured yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
