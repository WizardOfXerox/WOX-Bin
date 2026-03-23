import Link from "next/link";
import type { Session } from "next-auth";
import {
  ArrowRight,
  Braces,
  Cloud,
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
import { LandingMobileNav } from "@/components/landing-mobile-nav";
import { APP_COPY } from "@/lib/constants";
import { TOOLS_ENABLED } from "@/lib/tools/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  session: Session | null;
};

export function LandingPage({ session }: Props) {
  const signedIn = Boolean(session?.user);
  const heroTail = TOOLS_ENABLED
    ? "browser utilities live at "
    : "The tools surface is temporarily disabled while it is being finished. See ";
  const tagline = TOOLS_ENABLED
    ? APP_COPY.tagline
    : "A paste workspace with a real editor—ribbon tools, Prism and Markdown, multi-file pastes, local IndexedDB drafts, and account sync. Compare Free, Pro, and Team on the pricing page.";

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
          <h1 className="max-w-none text-balance font-sans text-[1.7rem] font-semibold leading-[1.15] tracking-tight text-foreground min-[400px]:text-[1.9rem] sm:text-3xl sm:leading-tight md:text-5xl md:leading-[1.1] lg:text-6xl lg:leading-[1.08]">
            Local-first pasting, shareable links, and a workspace that scales with you.
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Write in the browser, stay offline-friendly, then sync to your account when you want hosted pastes, API
            access, and team options. The paste workspace lives at <span className="font-mono text-xs">/app</span>,
            and the browser companion lives at <span className="font-mono text-xs">/bookmarkfs</span>.{" "}
            {TOOLS_ENABLED ? (
              <>
                {heroTail}
                <span className="font-mono text-xs">/tools</span>. See{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/pricing">
                  plans &amp; pricing
                </Link>
                .
              </>
            ) : (
              <>
                The tools surface is temporarily disabled while it is being finished. See{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/pricing">
                  plans &amp; pricing
                </Link>
                .
              </>
            )}
          </p>
        </header>

        <section className="grid flex-1 gap-8 pt-8 sm:gap-10 sm:pt-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)] lg:gap-12 lg:pt-14 xl:gap-16 xl:pt-20">
          <div className="flex min-w-0 flex-col justify-center gap-6 sm:gap-8">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Ribbon editor &amp; Prism</Badge>
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Markdown preview</Badge>
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Multi-file pastes</Badge>
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Local + cloud sync</Badge>
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">BookmarkFS companion</Badge>
              <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Free · Pro · Team</Badge>
              {TOOLS_ENABLED ? <Badge className="px-2.5 py-0.5 text-xs sm:px-3 sm:text-[0.8125rem]">Browser tools hub</Badge> : null}
            </div>
            <p className="max-w-none text-base leading-7 text-muted-foreground sm:max-w-2xl sm:text-lg sm:leading-8 md:max-w-3xl md:text-xl xl:max-w-4xl">
              {tagline}
            </p>
            <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Button asChild className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0" size="lg">
                <Link href="/app">
                  Open workspace
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
                  <Link href="/settings/account">Account settings</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0"
                  size="lg"
                  variant="outline"
                >
                  <Link href="/sign-up">Create account</Link>
                </Button>
              )}
              <Button asChild className="h-12 w-full min-h-12 touch-manipulation sm:h-auto sm:w-auto sm:min-h-0" size="lg" variant="secondary">
                <Link href="/pricing">Compare plans</Link>
              </Button>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
              {signedIn ? (
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/settings/account">
                  Account settings
                </Link>
              ) : (
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/sign-in">
                  Sign in
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
                  Forgot password
                </Link>
              )}
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              {TOOLS_ENABLED ? (
                <>
                  <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/tools">
                    Tools
                  </Link>
                  <span aria-hidden className="hidden text-border sm:inline">
                    ·
                  </span>
                </>
              ) : null}
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/archive">
                Archive
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/bookmarkfs">
                BookmarkFS
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5 xl:grid-cols-3">
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <LayoutTemplate className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Ribbon workspace</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Home, Insert, Layout, and View tabs—formatting helpers, lists, indent, find/replace, timestamps, fenced
                    code, tables, JSON tools, print, and templates in one strip.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <Braces className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Code-aware editor</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Prism themes (Tomorrow, Twilight, Solarized light, and more), line numbers, wrap, tab indent, bracket
                    highlights, and a
                    transparent caret layer locked to the highlight.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <UploadCloud className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Files &amp; sharing</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Attach multiple files per paste with per-file languages, Markdown preview, export code as an image,
                    and share links with optional line-range anchors.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <Cloud className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Modes &amp; polish</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    IndexedDB local drafts or signed-in sync, folders and pins, light UI shell, workspace tone, quick
                    open, keyboard help, import URL, and API uploads with keys.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Social &amp; public</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Comments and stars on shared pastes, public feed and archive, raw and read-only hints, anonymous
                    publish flow, and moderation-aware visibility.
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Trust &amp; accounts</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Cloudflare Turnstile, rate limits, and moderation-ready public pages. Session management, optional
                    Google sign-in, email-based password reset when your host configures SMTP, and pricing / billing
                    entry points for Pro and Team.
                  </p>
                </CardContent>
              </Card>
              {TOOLS_ENABLED ? (
                <Card className="overflow-hidden">
                  <CardContent className="space-y-3 p-4 sm:p-6">
                    <Wrench className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-foreground">Tools beyond pastes</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Client-side converters and utilities—PDF extract/split/merge, image convert, data &amp; ZIP helpers, and
                      more from the{" "}
                      <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/tools">
                        /tools
                      </Link>{" "}
                      hub (documented at{" "}
                      <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/doc/tools">
                        /doc/tools
                      </Link>
                      ).
                    </p>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4 sm:p-6">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Plans &amp; recovery</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/pricing">
                      Pricing
                    </Link>{" "}
                    summarizes Free, Pro, and Team. Use{" "}
                    <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">
                      forgot password
                    </Link>{" "}
                    if you registered with an email; operators enable outbound SMTP to deliver reset links.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="min-w-0 self-start border-border bg-muted/40 dark:border-white/15 dark:bg-black/35 lg:sticky lg:top-10">
            <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground sm:text-sm">Why WOX-Bin</p>
                  <h2 className="mt-1.5 text-xl font-semibold leading-snug text-foreground sm:mt-2 sm:text-2xl">
                    Built for daily use
                  </h2>
                </div>
                <Badge className="w-fit shrink-0 border-primary/30 bg-primary/10 text-foreground">Shipping now</Badge>
              </div>
              <div className="space-y-2.5 sm:space-y-3">
                {APP_COPY.marketingBullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="rounded-2xl border border-border bg-card/85 p-3.5 text-sm leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/[0.06] sm:p-4"
                  >
                    {bullet}
                  </div>
                ))}
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Quick links</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/pricing">
                      Pricing &amp; billing
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/doc">
                      API &amp; documentation
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/bookmarkfs">
                      BookmarkFS companion
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/help">
                      Help &amp; answers
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/support">
                      Support
                    </Link>
                  </li>
                  {TOOLS_ENABLED ? (
                    <li>
                      <Link className="text-primary underline-offset-4 hover:underline" href="/tools">
                        Browser tools
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/archive">
                      Public archive
                    </Link>
                  </li>
                  <li>
                    <Link className="text-primary underline-offset-4 hover:underline" href="/forgot-password">
                      Forgot password
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Themes &amp; accessibility</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Switch syntax colors per paste, toggle a light app shell that keeps text contrast in check, optional
                  high-contrast chrome, and deep vs balanced workspace backgrounds.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/50 p-3.5 dark:border-white/10 dark:bg-black/20 sm:p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Tip</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Open the workspace and press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs dark:border-white/15 dark:bg-white/5">?</kbd>{" "}
                  (when the editor is focused) for shortcuts—quick open, new paste, save, find, replace, and more.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground sm:mt-20 sm:pt-10">
          {signedIn ? (
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/settings/account">
              Account settings
            </Link>
          ) : (
            <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/sign-in">
              Sign in
            </Link>
          )}
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/doc">
            API &amp; docs
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          {TOOLS_ENABLED ? (
            <>
              <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/tools">
                Tools
              </Link>
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
            </>
          ) : null}
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/archive">
            Archive
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/bookmarkfs">
            BookmarkFS
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/pricing">
            Pricing
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/help">
            Help
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/support">
            Support
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
            Terms
          </Link>
          <span aria-hidden className="hidden text-border sm:inline">
            ·
          </span>
          <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
