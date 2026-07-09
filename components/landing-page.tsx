"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import {
  ArrowRight,
  Braces,
  Bookmark,
  Clock3,
  Code2,
  FileText,
  Globe,
  KeyRound,
  Link2,
  Lock,
  Moon,
  Palette,
  Sparkles,
  Terminal,
  Upload,
  Zap,
} from "lucide-react";

import { LandingDesktopAuthNav } from "@/components/landing-auth-nav";
import { LANDING_PAGE_COPY } from "@/components/landing-page-copy";
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { SiteAnnouncementBar } from "@/components/site/site-announcement-bar";
import { CHANGELOG_ENTRIES } from "@/lib/changelog";
import { TOOLS_ENABLED } from "@/lib/tools/availability";
import { Button } from "@/components/ui/button";

type Props = {
  session: Session | null;
};

/* ------------------------------------------------------------------ */
/*  Bento card wrapper — glass + glow on hover                        */
/* ------------------------------------------------------------------ */
function BentoCard({
  children,
  className = "",
  span = "",
}: {
  children: React.ReactNode;
  className?: string;
  span?: string;
}) {
  return (
    <div
      className={`group/bento relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.06] hover:shadow-[0_0_40px_-12px_rgba(56,128,255,0.15)] sm:p-6 ${span} ${className}`}
    >
      {/* subtle corner glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover/bento:opacity-100"
      />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat pill — used in the hero area                                 */
/* ------------------------------------------------------------------ */
function StatPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors duration-300 hover:border-primary/30 hover:text-foreground sm:text-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main landing page                                                 */
/* ------------------------------------------------------------------ */
export function LandingPage({ session }: Props) {
  const { language, t } = useUiLanguage();
  const signedIn = Boolean(session?.user);
  const copy = LANDING_PAGE_COPY[language];
  const recentChanges = CHANGELOG_ENTRIES.slice(0, 2);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* ── Background layers ── */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-80" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-40" aria-hidden />
      {/* grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  NAV BAR — floating, glassmorphic                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <header className="flex items-center justify-between py-5 sm:py-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110">
              <Terminal className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-wide text-foreground">
              WOX<span className="text-primary">-Bin</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <LandingMobileNav initialSession={session} />
            <LandingDesktopAuthNav initialSession={session} />
          </div>
        </header>

        <SiteAnnouncementBar />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  HERO SECTION                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="flex flex-col items-center pt-12 text-center sm:pt-16 md:pt-20 lg:pt-24 motion-safe:animate-wox-fade-up">
          {/* eyebrow badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{copy.shippingNow}</span>
          </div>

          {/* hero title */}
          <h1 className="max-w-4xl text-balance font-sans text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              {copy.heroTitle.split(",")[0]},
            </span>
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {copy.heroTitle.split(",").slice(1).join(",").trim() || "operator-ready control surface."}
            </span>
          </h1>

          {/* sub-headline */}
          <p className="mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base md:text-lg">
            {copy.tagline}
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <Button asChild size="lg" className="group/cta h-12 gap-2 rounded-full px-7 text-sm font-semibold shadow-[0_0_20px_-4px_rgba(56,128,255,0.4)] transition-shadow duration-300 hover:shadow-[0_0_30px_-4px_rgba(56,128,255,0.6)] sm:h-11 sm:text-base">
              <Link href="/app">
                {t("nav.openWorkspace")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
              </Link>
            </Button>
            {signedIn ? (
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/10 px-7 text-sm backdrop-blur-sm sm:h-11 sm:text-base">
                <Link href="/settings/account">{t("nav.accountSettings")}</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/10 px-7 text-sm backdrop-blur-sm sm:h-11 sm:text-base">
                <Link href="/sign-up">{t("nav.createAccount")}</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-full px-7 text-sm text-muted-foreground sm:h-11 sm:text-base">
              <Link href="/pricing">{copy.comparePlans}</Link>
            </Button>
          </div>

          {/* stat pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:mt-10 sm:gap-3">
            <StatPill icon={Code2} label={copy.featureBadges[0]} />
            <StatPill icon={FileText} label={copy.featureBadges[2]} />
            <StatPill icon={Lock} label={copy.featureBadges[3]} />
            <StatPill icon={Globe} label={copy.featureBadges[5]} />
            <StatPill icon={Zap} label={copy.featureBadges[10]} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  BENTO FEATURE GRID                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="mt-16 grid auto-rows-auto grid-cols-1 gap-3 sm:mt-20 sm:grid-cols-2 sm:gap-4 lg:mt-24 lg:grid-cols-3 lg:gap-5">
          {/* ── Card 1: Ribbon Workspace (large, spans 2 cols) ── */}
          <BentoCard span="sm:col-span-2" className="lg:row-span-2">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-indigo-500/10 p-2.5">
                  <Braces className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                  {copy.featureCards[0].title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {copy.featureCards[0].body}
                </p>
              </div>
              {/* decorative code mockup */}
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/40 p-4 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2 pb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-[10px] text-muted-foreground/50">editor.tsx</span>
                </div>
                <div className="space-y-1">
                  <p><span className="text-blue-400">const</span> <span className="text-cyan-300">workspace</span> = <span className="text-amber-300">createRibbon</span>();</p>
                  <p><span className="text-blue-400">const</span> <span className="text-cyan-300">paste</span> = <span className="text-amber-300">newPaste</span>(<span className="text-emerald-400">&quot;typescript&quot;</span>);</p>
                  <p><span className="text-purple-400">await</span> paste.<span className="text-amber-300">save</span>({"{"} <span className="text-cyan-300">visibility</span>{": "}<span className="text-emerald-400">&quot;secret&quot;</span> {"}"});</p>
                  <p className="text-muted-foreground/40">{"// ✓ Saved · Secret link generated"}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* ── Card 2: Code-Aware Editor ── */}
          <BentoCard>
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-cyan-500/10 p-2.5">
              <Palette className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.featureCards[1].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.featureCards[1].body}</p>
          </BentoCard>

          {/* ── Card 3: Files & Sharing ── */}
          <BentoCard>
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-500/10 p-2.5">
              <Upload className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.featureCards[2].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.featureCards[2].body}</p>
          </BentoCard>

          {/* ── Card 4: Quick-Share Surfaces ── */}
          <BentoCard>
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-amber-500/10 p-2.5">
              <Link2 className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.featureCards[6].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.featureCards[6].body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["/quick", "/clipboard", "/fragment", "/secret"].map((route) => (
                <Link
                  key={route}
                  href={route}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors duration-200 hover:border-primary/30 hover:text-primary"
                >
                  {route}
                </Link>
              ))}
            </div>
          </BentoCard>

          {/* ── Card 5: BookmarkFS Companion ── */}
          <BentoCard>
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-violet-500/10 p-2.5">
              <Bookmark className="h-5 w-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.bookmarkfsLink}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {copy.featureCards[3].body}
            </p>
            <Link
              href="/bookmarkfs"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              {copy.quickLinksBookmarkfs}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </BentoCard>

          {/* ── Card 6: Trust & Accounts ── */}
          <BentoCard>
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-rose-500/10 p-2.5">
              <KeyRound className="h-5 w-5 text-rose-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.featureCards[5].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.featureCards[5].body}</p>
          </BentoCard>

          {/* ── Card 7: Tools (conditionally shown) ── */}
          {TOOLS_ENABLED ? (
            <BentoCard>
              <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-sky-500/10 p-2.5">
                <Zap className="h-5 w-5 text-sky-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{copy.toolsCardTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.toolsCardBody}</p>
              <Link
                href="/tools"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                {copy.quickLinksTools}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </BentoCard>
          ) : null}

          {/* ── Card 8: Afterdark Mode ── */}
          <BentoCard className="border-purple-500/10">
            <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-purple-500/10 p-2.5">
              <Moon className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{copy.themesTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.themesBody}</p>
          </BentoCard>

          {/* ── Card 9: Recent Changelog (wide) ── */}
          <BentoCard span="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="inline-flex items-center justify-center rounded-xl bg-pink-500/10 p-2.5">
                    <Clock3 className="h-5 w-5 text-pink-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{copy.recentChangesTitle}</h2>
                </div>
                <div className="space-y-4">
                  {recentChanges.map((entry) => (
                    <div key={entry.slug} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{entry.title}</p>
                        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:pt-12">
                <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full border-white/10">
                  <Link href="/changelog">
                    {copy.readFullChangelog}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </BentoCard>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  QUICK LINKS — minimal grid                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="mt-16 sm:mt-20 lg:mt-24">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground/60">
            {copy.quickLinksTitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {[
              { href: "/pricing", label: copy.quickLinksPricing },
              { href: "/doc", label: copy.quickLinksDocs },
              { href: "/bookmarkfs", label: copy.quickLinksBookmarkfs },
              { href: "/quick", label: copy.quickLinksQuickPaste },
              { href: "/fragment", label: copy.quickLinksFragment },
              { href: "/clipboard", label: copy.quickLinksClipboard },
              { href: "/archive", label: copy.quickLinksArchive },
              { href: "/help", label: copy.quickLinksHelp },
              { href: "/support", label: copy.quickLinksSupport },
              { href: "/changelog", label: copy.quickLinksChangelog },
              ...(TOOLS_ENABLED ? [{ href: "/tools", label: copy.quickLinksTools }] : []),
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/*  FOOTER                                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/[0.06] py-8 text-center text-xs text-muted-foreground sm:mt-20 sm:py-10">
          <Link href="/" className="font-semibold text-foreground">
            WOX-Bin
          </Link>
          <span aria-hidden className="text-white/10">·</span>
          {signedIn ? (
            <Link className="transition-colors hover:text-foreground" href="/settings/account">
              {t("nav.accountSettings")}
            </Link>
          ) : (
            <Link className="transition-colors hover:text-foreground" href="/sign-in">
              {t("nav.signIn")}
            </Link>
          )}
          <span aria-hidden className="text-white/10">·</span>
          <Link className="transition-colors hover:text-foreground" href="/doc">
            {copy.footerApiDocs}
          </Link>
          <span aria-hidden className="text-white/10">·</span>
          <Link className="transition-colors hover:text-foreground" href="/pricing">
            {t("nav.pricing")}
          </Link>
          <span aria-hidden className="text-white/10">·</span>
          <Link className="transition-colors hover:text-foreground" href="/terms">
            {copy.footerTerms}
          </Link>
          <span aria-hidden className="text-white/10">·</span>
          <Link className="transition-colors hover:text-foreground" href="/privacy">
            {copy.footerPrivacy}
          </Link>
        </footer>
      </div>
    </main>
  );
}
