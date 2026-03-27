"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import {
  ArrowRight,
  Braces,
  Cloud,
  Clock3,
  KeyRound,
  LayoutTemplate,
  MessageSquare,
  Palette,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wrench
} from "lucide-react";

import { LandingDesktopAuthNav } from "@/components/landing-auth-nav";
import { LANDING_PAGE_COPY } from "@/components/landing-page-copy";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { SiteAnnouncementBar } from "@/components/site/site-announcement-bar";
import { CHANGELOG_ENTRIES } from "@/lib/changelog";
import { TOOLS_ENABLED } from "@/lib/tools/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  session: Session | null;
};

export function LandingPage({ session }: Props) {
  const { language, t } = useUiLanguage();
  const signedIn = Boolean(session?.user);
  const copy = LANDING_PAGE_COPY[language];
  const tagline = copy.tagline;
  const recentChanges = CHANGELOG_ENTRIES.slice(0, 3);
  const featureBadges = TOOLS_ENABLED ? copy.featureBadges : copy.featureBadges.slice(0, 11);
  const primaryFeatureCards = copy.featureCards.slice(0, 7);
  const primaryFeatureIcons = [LayoutTemplate, Braces, UploadCloud, Cloud, MessageSquare, ShieldCheck, Sparkles];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-70" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[min(100%,96rem)] flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] motion-safe:animate-wox-fade-up sm:px-8 sm:pb-10 sm:pt-10 lg:px-12 lg:pt-10 xl:px-16">
        <header className="flex flex-col gap-5 sm:gap-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin</p>
            <div className="flex shrink-0 items-center gap-2">
              <LandingMobileNav initialSession={session} />
              <LandingDesktopAuthNav initialSession={session} />
            </div>
          </div>
          <SiteAnnouncementBar />
          <h1 className="max-w-none text-balance font-sans text-[1.7rem] font-semibold leading-[1.15] tracking-tight text-foreground min-[400px]:text-[1.9rem] sm:text-3xl sm:leading-tight md:text-5xl md:leading-[1.1] lg:text-6xl lg:leading-[1.08]">
            {copy.heroTitle}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {copy.heroLeadStart} <span className="font-mono text-xs">/app</span>
            {copy.heroLeadMiddle} <span className="font-mono text-xs">/bookmarkfs</span>
            {copy.heroLeadSupport} <span className="font-mono text-xs">/support</span>
            {copy.heroLeadChangelog} <span className="font-mono text-xs">/changelog</span>
            {TOOLS_ENABLED ? (
              <>
                {copy.heroLeadToolsEnabled} <span className="font-mono text-xs">/tools</span>.{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/pricing">
                  {copy.plansAndPricing}
                </Link>
                .
              </>
            ) : (
              <>
                {copy.heroLeadToolsDisabled}{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/pricing">
                  {copy.plansAndPricing}
                </Link>
                .
              </>
            )}
          </p>
        </header>

        <section className="grid flex-1 gap-8 pt-8 sm:gap-10 sm:pt-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)] lg:gap-12 lg:pt-14 xl:gap-16 xl:pt-20">
          <div className="flex min-w-0 flex-col justify-center gap-6 sm:gap-8">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {featureBadges.map((badge) => (
                <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]" key={badge}>
                  {badge}
                </Badge>
              ))}
            </div>
            <p className="max-w-none text-base leading-7 text-muted-foreground sm:max-w-2xl sm:text-lg sm:leading-8 md:max-w-3xl md:text-xl xl:max-w-4xl">
              {tagline}
            </p>
            <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button asChild className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0" size="lg">
                <Link href="/app">
                  {t("nav.openWorkspace")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {signedIn ? (
                <Button
                  asChild
                  className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0"
                  size="lg"
                  variant="outline"
                >
                  <Link href="/settings/account">{t("nav.accountSettings")}</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0"
                  size="lg"
                  variant="outline"
                >
                  <Link href="/sign-up">{t("nav.createAccount")}</Link>
                </Button>
              )}
              <Button asChild className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0" size="lg" variant="secondary">
                <Link href="/pricing">{copy.comparePlans}</Link>
              </Button>
              <Button asChild className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0" size="lg" variant="ghost">
                <Link href="/changelog">{copy.viewChangelog}</Link>
              </Button>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
              {signedIn ? (
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/settings/account">
                  {t("nav.accountSettings")}
                </Link>
              ) : (
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/sign-in">
                  {t("nav.signIn")}
                </Link>
              )}
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              {signedIn ? (
                <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/settings/sessions">
                  Sessions
                </Link>
              ) : (
                <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/forgot-password">
                  {t("auth.signIn.forgotPassword")}
                </Link>
              )}
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              {TOOLS_ENABLED ? (
                <>
                  <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/tools">
                    {copy.toolsLink}
                  </Link>
                  <span aria-hidden className="hidden text-border sm:inline">
                    ·
                  </span>
                </>
              ) : null}
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/archive">
                {copy.archiveLink}
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/bookmarkfs">
                {copy.bookmarkfsLink}
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/quick">
                {copy.quickPasteLink}
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/clipboard">
                {copy.clipboardBucketsLink}
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/changelog">
                {t("nav.changelog")}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5 xl:grid-cols-3">
              {primaryFeatureCards.map((card, index) => {
                const Icon = primaryFeatureIcons[index];
                return (
                  <Card className="overflow-hidden" key={card.title}>
                    <CardContent className="space-y-3 p-4 sm:p-6">
                      <Icon className="h-5 w-5 text-primary" />
                      <h2 className="font-semibold text-foreground">{card.title}</h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
              {TOOLS_ENABLED ? (
                <Card className="overflow-hidden">
                  <CardContent className="space-y-3 p-4 sm:p-6">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">{copy.toolsCardTitle}</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">{copy.toolsCardBody}</p>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">{copy.featureCards[7]?.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{copy.featureCards[7]?.body}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="min-w-0 self-start border-border bg-muted/40 dark:border-white/15 dark:bg-black/35 lg:sticky lg:top-10">
            <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground sm:text-sm">{copy.currentSurfaceEyebrow}</p>
                  <h2 className="mt-1.5 text-xl font-semibold leading-snug text-foreground sm:mt-2 sm:text-2xl">
                    {copy.currentSurfaceTitle}
                  </h2>
                </div>
                <Badge className="w-fit shrink-0 border-primary/30 bg-primary/10 text-foreground">{copy.shippingNow}</Badge>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                {copy.marketingBullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-border bg-card/85 p-3.5 text-sm leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.06] sm:p-4"
                  >
                    {bullet}
                  </div>
                ))}
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{copy.quickLinksTitle}</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/pricing">
                      {copy.quickLinksPricing}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/doc">
                      {copy.quickLinksDocs}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/bookmarkfs">
                      {copy.quickLinksBookmarkfs}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/quick">
                      {copy.quickLinksQuickPaste}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/fragment">
                      {copy.quickLinksFragment}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/clipboard">
                      {copy.quickLinksClipboard}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/help">
                      {copy.quickLinksHelp}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/support">
                      {copy.quickLinksSupport}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/changelog">
                      {copy.quickLinksChangelog}
                    </Link>
                  </li>
                  {TOOLS_ENABLED ? (
                    <li>
                      <Link className="text-primary underline-offset-4 hover:underline" href="/tools">
                        {copy.quickLinksTools}
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/archive">
                      {copy.quickLinksArchive}
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/forgot-password">
                      {copy.quickLinksForgotPassword}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{copy.recentChangesTitle}</p>
                </div>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {recentChanges.map((entry) => (
                    <div key={entry.slug}>
                      <p className="font-medium text-foreground">{entry.title}</p>
                      <p className="mt-1 leading-6">{entry.summary}</p>
                    </div>
                  ))}
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/changelog">
                    {copy.readFullChangelog}
                  </Link>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{copy.themesTitle}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {copy.themesBody}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">{copy.startHereTitle}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{copy.startHereBody}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground sm:mt-20 sm:pt-10">
          {signedIn ? (
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/settings/account">
              {t("nav.accountSettings")}
            </Link>
          ) : (
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/sign-in">
              {t("nav.signIn")}
            </Link>
          )}
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/doc">
            {copy.footerApiDocs}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          {TOOLS_ENABLED ? (
            <>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/tools">
                {copy.footerTools}
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
            </>
          ) : null}
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/archive">
            {copy.archiveLink}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/bookmarkfs">
            {copy.bookmarkfsLink}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/quick">
            {copy.quickPasteLink}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/changelog">
            {t("nav.changelog")}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/pricing">
            {t("nav.pricing")}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/help">
            {t("nav.help")}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/support">
            {t("nav.support")}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
            {copy.footerTerms}
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
            {copy.footerPrivacy}
          </Link>
        </footer>
      </div>
    </main>
  );
}
