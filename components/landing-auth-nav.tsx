"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  LogOut,
  ChevronDown,
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
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserAvatar } from "@/components/ui/user-avatar";

import { accountLabelFromSession } from "@/lib/account-label";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

type CategoryItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
};

type Props = {
  initialSession?: Session | null;
};

function triggerClass() {
  return "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground group-hover:bg-muted/60 group-hover:text-foreground";
}

export function LandingDesktopAuthNav({ initialSession = null }: Props) {
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
      href: "/file",
      icon: FileText,
      color: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300",
      labelKey: "nav.fileShare",
      descKey: "nav.fileShare.desc"
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
    <div className="hidden items-center gap-2 sm:gap-3 md:flex">
      <LanguageSwitcher compact />

      {/* Services Dropdown */}
      <div className="group relative">
        <button className={triggerClass()} type="button">
          <span>{t("nav.services")}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
        </button>
        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full right-0 md:left-0 md:right-auto pt-2 transition-all duration-200 z-50 origin-top-left">
          <div className="grid w-[540px] grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-2xl">
            {servicesItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                    {t(item.labelKey)}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal font-normal">
                    {t(item.descKey)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Explore Dropdown */}
      <div className="group relative">
        <button className={triggerClass()} type="button">
          <span>{t("nav.explore")}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
        </button>
        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full right-0 md:left-0 md:right-auto pt-2 transition-all duration-200 z-50 origin-top-left">
          <div className="flex w-[280px] flex-col gap-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-2xl">
            {exploreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                    {t(item.labelKey)}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal font-normal">
                    {t(item.descKey)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Resources Dropdown */}
      <div className="group relative">
        <button className={triggerClass()} type="button">
          <span>{t("nav.resources")}</span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
        </button>
        <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full right-0 md:left-0 md:right-auto pt-2 transition-all duration-200 z-50 origin-top-left">
          <div className="grid w-[440px] grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-2xl">
            {resourcesItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground group-hover/item:text-primary transition-colors">
                    {t(item.labelKey)}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-normal font-normal">
                    {t(item.descKey)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Button asChild variant="ghost" className="rounded-full px-3 py-1.5 h-auto text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
        <Link href="/pricing">{t("nav.pricing")}</Link>
      </Button>

      {showLoadingSkeleton ? (
        <div
          aria-hidden
          className="h-9 w-[7.5rem] animate-pulse rounded-full bg-muted/40"
        />
      ) : sessionUser ? (
        <>
          <Button asChild title="Account settings" variant="ghost" className="rounded-full px-3 py-1.5 h-auto text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
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
          <Button
            className="gap-1.5 rounded-full"
            onClick={() => void signOut({ callbackUrl: "/" })}
            type="button"
            variant="outline"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </>
      ) : (
        <Button asChild variant="ghost" className="rounded-full px-3 py-1.5 h-auto text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <Link href="/sign-in">{t("nav.signIn")}</Link>
        </Button>
      )}
      <Button asChild className="rounded-full">
        <Link href="/app">
          {t("nav.openWorkspace")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
