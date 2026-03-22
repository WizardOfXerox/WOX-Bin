import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldAlert, UploadCloud, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FAQ_GROUPS = [
  {
    title: "Account access",
    icon: UserRound,
    items: [
      {
        q: "I signed up but I cannot sign in.",
        a: "Password accounts must verify their email before sign-in is allowed. Check your inbox for the verification message, then retry. If the message expired, ask the operator to resend it."
      },
      {
        q: "I forgot my password.",
        a: "Use the forgot-password flow. If SMTP is configured on this deployment, WOX-Bin sends a reset link to your account email and revokes old browser sessions after the reset completes."
      },
      {
        q: "I used email/password first, then Google later. Is that a different account?",
        a: "Not if the Google account uses the same email address. WOX-Bin links Google to the existing account email instead of creating a second account for that same address."
      }
    ]
  },
  {
    title: "Security and sharing",
    icon: LockKeyhole,
    items: [
      {
        q: "Can I remove Google sign-in later?",
        a: "Yes, but only after you create a password on the account. The settings page blocks Google disconnect until password sign-in exists so the account is not left without a recovery path."
      },
      {
        q: "Why can’t I see a private or password-protected paste?",
        a: "Private pastes are owner-only unless you are staff. Password-protected pastes require the correct password or a valid access grant. Hidden or moderated pastes may also be unavailable."
      },
      {
        q: "What happens when I report abuse?",
        a: "Reports go to moderators. They can hide or delete pastes, suspend or ban accounts, and optionally notify the affected user by email with the moderation reason."
      }
    ]
  },
  {
    title: "Workspace and uploads",
    icon: UploadCloud,
    items: [
      {
        q: "My local drafts are gone after switching devices.",
        a: "Local drafts live in the browser on that specific device. Sign in if you want hosted sync across devices, or export your data before moving machines."
      },
      {
        q: "Why was my upload rejected?",
        a: "Uploads can fail because of plan limits, file size, unsupported attachment MIME types, rate limits, or temporary provider issues. Check the exact message shown in the workspace first."
      },
      {
        q: "Where do I find API and product docs?",
        a: "Use the docs hub for operator and API details, and this Help page for user-level answers. They serve different audiences."
      }
    ]
  },
  {
    title: "Moderation and operator issues",
    icon: ShieldAlert,
    items: [
      {
        q: "My account says suspended or banned.",
        a: "That state is enforced server-side. You will see the restriction on sign-in and, when configured, by email. Use the support page to contact the operator if you need clarification."
      },
      {
        q: "Billing or plan access looks wrong.",
        a: "Check your current plan in Billing settings first. If checkout succeeded but the plan did not update, contact the operator with the email used for purchase and the payment timestamp."
      },
      {
        q: "I need manual help, not just FAQs.",
        a: "Use the support page. It points users to the operator contact path for issues that cannot be solved through settings, reset flows, or built-in Help answers."
      }
    ]
  }
] as const;

export const metadata: Metadata = {
  title: "Help — WOX-Bin",
  description: "User help and troubleshooting answers for WOX-Bin accounts, sharing, security, and workspace issues."
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <section className="grid gap-8 border-b border-border/60 pb-10 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-5 motion-safe:animate-wox-fade-up">
            <Badge className="px-3 py-1 text-xs">Help</Badge>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin</p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Fast answers for account, sharing, and workspace problems.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                This page is the first stop when something breaks. It answers the common issues directly so users do not
                need manual support when the fix is already known.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/support">
                  Go to support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/forgot-password">Reset password</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/doc">Open docs</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-3">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Best first actions</p>
            </div>
            <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>1. Read the error shown in the app first.</li>
              <li>2. Use account settings for sign-in methods, sessions, and password management.</li>
              <li>3. Use support only after the built-in answers here do not resolve the problem.</li>
            </ol>
          </div>
        </section>

        <section className="mt-10 grid gap-8">
          {FAQ_GROUPS.map((group, groupIndex) => {
            const Icon = group.icon;
            return (
              <section
                className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)] motion-safe:animate-wox-fade-up"
                key={group.title}
                style={{ animationDelay: `${groupIndex * 80}ms` }}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{group.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Answers written for users, not operators.</p>
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => (
                    <details
                      className="group rounded-[1.5rem] border border-border/70 bg-card/55 px-5 py-4 backdrop-blur-sm"
                      key={item.q}
                    >
                      <summary className="cursor-pointer list-none text-base font-medium text-foreground">{item.q}</summary>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      </div>
    </main>
  );
}
