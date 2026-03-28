import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { SupportCenter } from "@/components/support/support-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { getServerUiLanguage } from "@/lib/server-i18n";
import { listSupportTicketsForUser } from "@/lib/support-service";
import { SUPPORT_PAGE_COPY } from "@/lib/support-page-copy";

type SupportPageProps = {
  searchParams: Promise<{
    ticket?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Support",
  description: "Support tickets, replies, and screenshots for WOX-Bin users."
};

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  const session = await auth();
  const language = await getServerUiLanguage();
  const copy = SUPPORT_PAGE_COPY[language];

  if (!session?.user?.id || !session.user.role) {
    return (
      <main className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
          <SiteHeader className="mb-8" />
          <section className="grid gap-8 border-b border-border/60 pb-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
            <div className="space-y-5">
              <Badge className="px-3 py-1 text-xs">{copy.badge}</Badge>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{copy.eyebrow}</p>
                <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">{copy.description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/sign-in">
                    {copy.signInCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/forgot-password">{copy.forgotPasswordCta}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/help">{copy.helpCta}</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <LifeBuoy className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">{copy.handlesTitle}</p>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {copy.handlesItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">{copy.recoveryTitle}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.recoveryBody}</p>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">{copy.oneThreadTitle}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.oneThreadBody}</p>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-card/55 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">{copy.helpFirstTitle}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{copy.helpFirstBody}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const tickets = await listSupportTicketsForUser(session.user.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SiteHeader />
      <SupportCenter
        initialSelectedTicketId={params.ticket ?? null}
        initialTickets={tickets}
        language={language}
        viewerIsStaff={session.user.role === "moderator" || session.user.role === "admin"}
        viewerUserId={session.user.id}
      />
    </main>
  );
}
