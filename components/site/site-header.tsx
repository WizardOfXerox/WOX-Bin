"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  LogOut,
  Menu,
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
  LifeBuoy,
  Wrench
} from "lucide-react";

import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Button } from "@/components/ui/button";
import { PwaInstallButton } from "@/components/ui/pwa-install-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SiteAnnouncementBar } from "@/components/site/site-announcement-bar";
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
import type { TranslationKey } from "@/lib/i18n";

type CategoryItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
};

type Props = {
  className?: string;
};

function navItemClass(active: boolean) {
  return cn(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-muted/80 text-foreground font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  );
}

function triggerClass(active: boolean) {
  return cn(
    "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors group-hover:bg-muted/60 group-hover:text-foreground",
    active ? "text-foreground bg-muted/80 font-semibold" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
  );
}

export function SiteHeader({ className }: Props) {
  const pathname = usePathname();
  const { data: sessionData, status } = useSession();
  const session = (sessionData ?? null) as Session | null;
  const { t } = useUiLanguage();
  const sessionUser = session?.user ?? null;
  const showLoadingSkeleton = status === "loading" && !sessionUser;

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
      href: "/tools",
      icon: Wrench,
      color: "bg-blue-500/10 text-blue-400 dark:text-blue-300",
      labelKey: "nav.tools",
      descKey: "nav.tools.desc"
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

  const isServicesActive = servicesItems.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  );
  const isExploreActive = exploreItems.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  );
  const isResourcesActive = resourcesItems.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  );

  const desktopActions = (
    <>
      <LanguageSwitcher compact variant="ghost" />
      <PwaInstallButton compact />
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
          <Button className="whitespace-nowrap" onClick={() => void signOut({ callbackUrl: "/" })} type="button" variant="outline">
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </>
      ) : (
        <Button asChild variant="outline">
          <Link href="/sign-in">{t("nav.signIn")}</Link>
        </Button>
      )}
      <Button asChild className="whitespace-nowrap">
        <Link href="/app">
          {t("nav.openWorkspace")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </>
  );

  return (
    <header className={cn("glass-panel flex flex-col gap-3 px-4 py-3 sm:px-5 lg:gap-4", className)}>
      <SiteAnnouncementBar />
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left Side: Brand Logo + Desktop Nav */}
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link className="shrink-0 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground transition-colors" href="/">
            WOX-Bin
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden items-center gap-1 xl:flex">
            <Link className={navItemClass(pathname === "/")} href="/">
              {t("nav.home")}
            </Link>

            {/* Services Dropdown */}
            <div className="group relative">
              <button className={triggerClass(isServicesActive)} type="button">
                <span>{t("nav.services")}</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full left-0 pt-2 transition-all duration-200 z-50 origin-top-left">
                <div className="grid w-[540px] grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-2xl">
                  {servicesItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70",
                        pathname === item.href ? "bg-muted/40" : ""
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
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
              <button className={triggerClass(isExploreActive)} type="button">
                <span>{t("nav.explore")}</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full left-0 pt-2 transition-all duration-200 z-50 origin-top-left">
                <div className="flex w-[280px] flex-col gap-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-2xl">
                  {exploreItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70",
                        pathname === item.href ? "bg-muted/40" : ""
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
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
              <button className={triggerClass(isResourcesActive)} type="button">
                <span>{t("nav.resources")}</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 absolute top-full left-0 pt-2 transition-all duration-200 z-50 origin-top-left">
                <div className="grid w-[440px] grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-4 shadow-2xl">
                  {resourcesItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group/item flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-muted/70",
                        pathname === item.href ? "bg-muted/40" : ""
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/item:scale-110", item.color)}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
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

            <Link className={navItemClass(pathname === "/pricing")} href="/pricing">
              {t("nav.pricing")}
            </Link>
          </nav>
        </div>

        {/* Right Side: Desktop Actions & Mobile Menu trigger */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 xl:flex">{desktopActions}</div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                aria-label="Open site navigation"
                className="shrink-0 xl:hidden"
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
              <PwaInstallButton className="h-12 justify-center text-base" />
              
              {/* Grouped Mobile Menu Links */}
              <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] pr-1 py-1">
                {/* Category: Services */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
                    {t("nav.services")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {servicesItems.map((item) => (
                      <DialogClose asChild key={item.href}>
                        <Button
                          asChild
                          className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                          variant={pathname === item.href ? "secondary" : "outline"}
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
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
                    {t("nav.explore")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {exploreItems.map((item) => (
                      <DialogClose asChild key={item.href}>
                        <Button
                          asChild
                          className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                          variant={pathname === item.href ? "secondary" : "outline"}
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
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 px-1">
                    {t("nav.resources")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {resourcesItems.map((item) => (
                      <DialogClose asChild key={item.href}>
                        <Button
                          asChild
                          className="h-11 justify-start px-3 text-xs gap-2 font-medium"
                          variant={pathname === item.href ? "secondary" : "outline"}
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
                      variant={pathname === "/pricing" ? "secondary" : "outline"}
                    >
                      <Link href="/pricing">{t("nav.pricing")}</Link>
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      asChild
                      className="h-11 flex-1 justify-center text-xs font-semibold"
                      variant={pathname === "/" ? "secondary" : "outline"}
                    >
                      <Link href="/">{t("nav.home")}</Link>
                    </Button>
                  </DialogClose>
                </div>
              </div>

              {/* Mobile Auth Actions */}
              <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
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
        </div>
      </div>
    </header>
  );
}
