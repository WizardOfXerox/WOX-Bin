"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, LogOut, Menu } from "lucide-react";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { accountLabelFromSession } from "@/lib/account-label";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey:
    | "nav.home"
    | "nav.workspace"
    | "nav.privacy"
    | "nav.quickPaste"
    | "nav.clipboard"
    | "nav.fragment"
    | "nav.feed"
    | "nav.archive"
    | "nav.docs"
    | "nav.bookmarkfs"
    | "nav.help"
    | "nav.support"
    | "nav.changelog"
    | "nav.pricing";
  matches: (pathname: string | null) => boolean;
};

const SITE_NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", matches: (pathname) => pathname === "/" },
  { href: "/app", labelKey: "nav.workspace", matches: (pathname) => pathname === "/app" },
  { href: "/privacy-tools", labelKey: "nav.privacy", matches: (pathname) => pathname === "/privacy-tools" || pathname === "/noref" || pathname === "/shorten" || pathname === "/snapshot" || pathname?.startsWith("/snapshot/") === true || pathname === "/proof" || pathname?.startsWith("/proof/") === true || pathname === "/poll" || pathname?.startsWith("/poll/") === true || pathname === "/chat" || pathname?.startsWith("/chat/") === true || pathname === "/scrub" },
  { href: "/quick", labelKey: "nav.quickPaste", matches: (pathname) => pathname === "/quick" },
  { href: "/clipboard", labelKey: "nav.clipboard", matches: (pathname) => pathname === "/clipboard" || pathname?.startsWith("/c/") === true },
  { href: "/fragment", labelKey: "nav.fragment", matches: (pathname) => pathname === "/fragment" },
  { href: "/feed", labelKey: "nav.feed", matches: (pathname) => pathname === "/feed" || pathname === "/feed.xml" },
  { href: "/archive", labelKey: "nav.archive", matches: (pathname) => pathname === "/archive" },
  { href: "/doc", labelKey: "nav.docs", matches: (pathname) => pathname?.startsWith("/doc") === true || pathname === "/doc_api" || pathname === "/doc_scraping_api" },
  { href: "/bookmarkfs", labelKey: "nav.bookmarkfs", matches: (pathname) => pathname?.startsWith("/bookmarkfs") === true },
  { href: "/help", labelKey: "nav.help", matches: (pathname) => pathname === "/help" },
  { href: "/support", labelKey: "nav.support", matches: (pathname) => pathname?.startsWith("/support") === true },
  { href: "/changelog", labelKey: "nav.changelog", matches: (pathname) => pathname === "/changelog" },
  { href: "/pricing", labelKey: "nav.pricing", matches: (pathname) => pathname === "/pricing" }
];

type Props = {
  className?: string;
};

function navItemClass(active: boolean) {
  return cn(
    "rounded-full px-3 py-1.5 text-sm transition-colors",
    active ? "bg-muted/90 font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  );
}

export function SiteHeader({ className }: Props) {
  const pathname = usePathname();
  const { data: sessionData, status } = useSession();
  const session = (sessionData ?? null) as Session | null;
  const { t } = useUiLanguage();
  const sessionUser = session?.user ?? null;
  const showLoadingSkeleton = status === "loading" && !sessionUser;

  const desktopActions = (
    <>
      <LanguageSwitcher compact />
      {showLoadingSkeleton ? (
        <div aria-hidden className="h-9 w-28 animate-pulse rounded-full bg-muted/40" />
      ) : sessionUser ? (
        <>
          <Button asChild variant="outline">
            <Link className="inline-flex items-center gap-2" href="/settings/account">
              <UserAvatar
                image={sessionUser.image}
                label={sessionUser.displayName || sessionUser.name || sessionUser.email}
                size="sm"
                username={sessionUser.username}
              />
              <span>{accountLabelFromSession(session)}</span>
            </Link>
          </Button>
          <Button onClick={() => void signOut({ callbackUrl: "/" })} type="button" variant="outline">
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </>
      ) : (
        <Button asChild variant="outline">
          <Link href="/sign-in">{t("nav.signIn")}</Link>
        </Button>
      )}
      <Button asChild>
        <Link href="/app">
          {t("nav.openWorkspace")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </>
  );

  return (
    <header className={cn("glass-panel flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 lg:gap-4", className)}>
      <Link className="shrink-0 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground" href="/">
        WOX-Bin
      </Link>

      <div className="hidden shrink-0 items-center gap-2 md:ml-auto md:flex 2xl:ml-0 2xl:hidden">{desktopActions}</div>

      <nav className="order-3 hidden w-full flex-wrap items-center gap-1 md:flex 2xl:order-none 2xl:min-w-0 2xl:flex-1 2xl:w-auto 2xl:flex-nowrap 2xl:overflow-x-auto 2xl:whitespace-nowrap workspace-scrollbar-hide">
        {SITE_NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            className={navItemClass(item.matches(pathname))}
            href={item.href}
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>

      <div className="hidden shrink-0 items-center gap-2 2xl:flex">{desktopActions}</div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            aria-label="Open site navigation"
            className="ml-auto shrink-0 md:hidden"
            size="icon"
            type="button"
            variant="outline"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[1.5rem] p-5">
          <DialogHeader className="text-left">
            <DialogTitle>{t("menu.title")}</DialogTitle>
            <DialogDescription>{t("menu.description")}</DialogDescription>
          </DialogHeader>
          <LanguageSwitcher />
          <div className="grid grid-cols-2 gap-3">
            {SITE_NAV_ITEMS.map((item) => (
              <DialogClose asChild key={item.href}>
                <Button asChild className="h-12 justify-center text-sm" variant={item.matches(pathname) ? "secondary" : "outline"}>
                  <Link href={item.href}>{t(item.labelKey)}</Link>
                </Button>
              </DialogClose>
            ))}
          </div>
          <div className="flex flex-col gap-3 pt-1">
            {showLoadingSkeleton ? (
              <div aria-hidden className="h-12 w-full animate-pulse rounded-full bg-muted/40" />
        ) : sessionUser ? (
              <>
              <DialogClose asChild>
                <Button asChild className="h-12 justify-center text-base" variant="outline">
                  <Link className="inline-flex items-center gap-2" href="/settings/account">
                    <UserAvatar
                      image={sessionUser.image}
                      label={sessionUser.displayName || sessionUser.name || sessionUser.email}
                      size="sm"
                      username={sessionUser.username}
                    />
                    <span>{accountLabelFromSession(session)}</span>
                  </Link>
                </Button>
              </DialogClose>
                <Button
                  className="h-12 justify-center gap-2 text-base"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <DialogClose asChild>
                <Button asChild className="h-12 justify-center text-base" variant="outline">
                  <Link href="/sign-in">{t("nav.signIn")}</Link>
                </Button>
              </DialogClose>
            )}
            <DialogClose asChild>
              <Button asChild className="h-12 justify-center text-base">
                <Link href="/app">
                  {t("nav.openWorkspace")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
