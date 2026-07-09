"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  ArrowRight,
  LogOut,
  Menu,
  LayoutTemplate,
  Sparkles,
  Clipboard,
  Link2,
  Folder,
  Shield,
  Radio,
  Archive,
  FileText,
  History,
  HelpCircle,
  LifeBuoy
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { accountLabelFromSession } from "@/lib/account-label";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

type CategoryItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  labelKey: string;
  descKey: string;
};

type Props = {
  initialSession?: Session | null;
};

export function LandingMobileNav({ initialSession = null }: Props) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const { t } = useUiLanguage();
  const effectiveSession = session?.user ? session : initialSession;
  const showLoadingSkeleton = status === "loading" && !effectiveSession?.user;
  const sessionUser = effectiveSession?.user ?? null;

  const servicesItems: CategoryItem[] = [
    {
      href: "/app",
      icon: LayoutTemplate,
      color: "bg-indigo-500/10 text-indigo-400 dark:text-indigo-300",
      labelKey: "nav.workspace",
      descKey: "nav.workspace.desc"
    },
    {
      href: "/quick",
      icon: Sparkles,
      color: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300",
      labelKey: "nav.quickPaste",
      descKey: "nav.quickPaste.desc"
    },
    {
      href: "/clipboard",
      icon: Clipboard,
      color: "bg-cyan-500/10 text-cyan-400 dark:text-cyan-300",
      labelKey: "nav.clipboard",
      descKey: "nav.clipboard.desc"
    },
    {
      href: "/fragment",
      icon: Link2,
      color: "bg-amber-500/10 text-amber-400 dark:text-amber-300",
      labelKey: "nav.fragment",
      descKey: "nav.fragment.desc"
    },
    {
      href: "/bookmarkfs",
      icon: Folder,
      color: "bg-violet-500/10 text-violet-400 dark:text-violet-300",
      labelKey: "nav.bookmarkfs",
      descKey: "nav.bookmarkfs.desc"
    },
    {
      href: "/privacy-tools",
      icon: Shield,
      color: "bg-rose-500/10 text-rose-400 dark:text-rose-300",
      labelKey: "nav.privacy",
      descKey: "nav.privacy.desc"
    }
  ];

  const exploreItems: CategoryItem[] = [
    {
      href: "/feed",
      icon: Radio,
      color: "bg-sky-500/10 text-sky-400 dark:text-sky-300",
      labelKey: "nav.feed",
      descKey: "nav.feed.desc"
    },
    {
      href: "/archive",
      icon: Archive,
      color: "bg-yellow-500/10 text-yellow-400 dark:text-yellow-300",
      labelKey: "nav.archive",
      descKey: "nav.archive.desc"
    }
  ];

  const resourcesItems: CategoryItem[] = [
    {
      href: "/doc",
      icon: FileText,
      color: "bg-teal-500/10 text-teal-400 dark:text-teal-300",
      labelKey: "nav.docs",
      descKey: "nav.docs.desc"
    },
    {
      href: "/changelog",
      icon: History,
      color: "bg-pink-500/10 text-pink-400 dark:text-pink-300",
      labelKey: "nav.changelog",
      descKey: "nav.changelog.desc"
    },
    {
      href: "/help",
      icon: HelpCircle,
      color: "bg-purple-500/10 text-purple-400 dark:text-purple-300",
      labelKey: "nav.help",
      descKey: "nav.help.desc"
    },
    {
      href: "/support",
      icon: LifeBuoy,
      color: "bg-orange-500/10 text-orange-400 dark:text-orange-300",
      labelKey: "nav.support",
      descKey: "nav.support.desc"
    }
  ];

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label="Open menu"
          className="shrink-0 md:hidden"
          size="icon"
          type="button"
          variant="outline"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "gap-5 border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          /* Bottom sheet on narrow screens */
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[min(88dvh,560px)] max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-[1.5rem] max-md:border-x-0 max-md:border-b-0 max-md:pt-6",
          /* Centered dialog from md up (e.g. keyboard / large phone landscape) */
          "md:left-[50%] md:top-[50%] md:max-h-none md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[1.25rem] md:border"
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-semibold">{t("menu.title")}</DialogTitle>
          <DialogDescription>{t("menu.description")}</DialogDescription>
        </DialogHeader>
        <LanguageSwitcher />
        <nav aria-label="Primary" className="flex flex-col gap-6 overflow-y-auto max-h-[50vh] pr-1 py-1">
          
          {/* Category: Services */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1 text-left">
              {t("nav.services")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {servicesItems.map((item) => (
                <DialogClose asChild key={item.href}>
                  <Button
                    asChild
                    className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                    variant="outline"
                  >
                    <Link href={item.href}>
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", item.color)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </Button>
                </DialogClose>
              ))}
            </div>
          </div>

          {/* Category: Explore */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1 text-left">
              {t("nav.explore")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {exploreItems.map((item) => (
                <DialogClose asChild key={item.href}>
                  <Button
                    asChild
                    className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                    variant="outline"
                  >
                    <Link href={item.href}>
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", item.color)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </Button>
                </DialogClose>
              ))}
            </div>
          </div>

          {/* Category: Resources */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1 text-left">
              {t("nav.resources")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {resourcesItems.map((item) => (
                <DialogClose asChild key={item.href}>
                  <Button
                    asChild
                    className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                    variant="outline"
                  >
                    <Link href={item.href}>
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded", item.color)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </Button>
                </DialogClose>
              ))}
            </div>
          </div>

          {/* Category: Pricing & Home */}
          <div className="border-t border-border/60 pt-4 flex gap-2">
            <DialogClose asChild>
              <Button
                asChild
                className="h-11 flex-1 justify-center text-xs font-semibold"
                variant="outline"
              >
                <Link href="/pricing">{t("nav.pricing")}</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                asChild
                className="h-11 flex-1 justify-center text-xs font-semibold"
                variant="outline"
              >
                <Link href="/">{t("nav.home")}</Link>
              </Button>
            </DialogClose>
          </div>

          {/* Mobile Auth Actions */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
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
                      <span>{accountLabelFromSession(effectiveSession)}</span>
                    </Link>
                  </Button>
                </DialogClose>
                <Button
                  className="h-12 justify-center gap-2 text-base"
                  onClick={() => {
                    setOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                  type="button"
                  variant="outline"
                >
                  <LogOut className="h-4 w-4" />
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <>
                <DialogClose asChild>
                  <Button asChild className="h-12 justify-center text-base" variant="outline">
                    <Link href="/sign-in">{t("nav.signIn")}</Link>
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button asChild className="h-12 justify-center text-base" variant="secondary">
                    <Link href="/sign-up">{t("nav.createAccount")}</Link>
                  </Button>
                </DialogClose>
              </>
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
        </nav>
      </DialogContent>
    </Dialog>
  );
}
