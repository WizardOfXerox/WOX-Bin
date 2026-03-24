"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserAvatar } from "@/components/ui/user-avatar";

import { accountLabelFromSession } from "@/lib/account-label";
import { useUiLanguage } from "@/components/providers/ui-language-provider";

/** Desktop header row on the marketing home — reflects real auth state (session is hydrated from the root layout). */
type Props = {
  initialSession?: Session | null;
};

export function LandingDesktopAuthNav({ initialSession = null }: Props) {
  const { data: session, status } = useSession();
  const { t } = useUiLanguage();
  const effectiveSession = session?.user ? session : initialSession;
  const showLoadingSkeleton = status === "loading" && !effectiveSession?.user;

  return (
    <div className="hidden items-center gap-2 sm:gap-3 md:flex">
      <LanguageSwitcher compact />
      <Button asChild variant="ghost">
        <Link href="/archive">{t("nav.archive")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/pricing">{t("nav.pricing")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/quick">{t("nav.quickPaste")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/help">{t("nav.help")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/support">{t("nav.support")}</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/changelog">{t("nav.changelog")}</Link>
      </Button>
      {showLoadingSkeleton ? (
        <div
          aria-hidden
          className="h-9 w-[7.5rem] animate-pulse rounded-full bg-muted/40"
        />
      ) : effectiveSession?.user ? (
        <>
          <Button asChild title="Account settings" variant="ghost">
            <Link className="inline-flex items-center gap-2" href="/settings/account">
              <UserAvatar
                image={effectiveSession.user.image}
                label={effectiveSession.user.displayName || effectiveSession.user.name || effectiveSession.user.email}
                size="sm"
                username={effectiveSession.user.username}
              />
              <span>{accountLabelFromSession(effectiveSession)}</span>
            </Link>
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => void signOut({ callbackUrl: "/" })}
            type="button"
            variant="outline"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </Button>
        </>
      ) : (
        <Button asChild variant="ghost">
          <Link href="/sign-in">{t("nav.signIn")}</Link>
        </Button>
      )}
      <Button asChild>
        <Link href="/app">
          {t("nav.openWorkspace")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
