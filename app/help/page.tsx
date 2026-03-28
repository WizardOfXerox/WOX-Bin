import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldAlert, UploadCloud, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { HELP_PAGE_COPY } from "@/lib/help-page-copy";
import { getServerUiLanguage } from "@/lib/server-i18n";

const FAQ_ICONS = [UserRound, LockKeyhole, UploadCloud, ShieldAlert] as const;

export const metadata: Metadata = {
  title: "Help",
  description: "User help and troubleshooting answers for WOX-Bin accounts, sharing, security, and workspace issues."
};

export default async function HelpPage() {
  const language = await getServerUiLanguage();
  const copy = HELP_PAGE_COPY[language];

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <section className="grid gap-8 border-b border-border/60 pb-10 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-5 motion-safe:animate-wox-fade-up">
            <Badge className="px-3 py-1 text-xs">{copy.badge}</Badge>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{copy.eyebrow}</p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">{copy.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/support">
                  {copy.supportCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/forgot-password">{copy.resetPasswordCta}</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/doc">{copy.docsCta}</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm motion-safe:animate-wox-fade-up">
            <div className="flex items-center gap-3">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">{copy.bestFirstActionsTitle}</p>
            </div>
            <ol className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {copy.bestFirstActions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-10 grid gap-8">
          {copy.groups.map((group, groupIndex) => {
            const Icon = FAQ_ICONS[groupIndex] ?? UserRound;
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
                  <p className="text-sm text-muted-foreground">{group.description}</p>
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
