"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { ArrowRight, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { accountLabelFromSession } from "@/lib/account-label";

/** Desktop header row on the marketing home — reflects real auth state (session is hydrated from the root layout). */
type Props = {
  initialSession?: Session | null;
};

export function LandingDesktopAuthNav({ initialSession = null }: Props) {
  const { data: session, status } = useSession();
  const effectiveSession = status === "loading" ? initialSession : session;

  return (
    <div className="hidden items-center gap-2 sm:gap-3 md:flex">
      <Button asChild variant="ghost">
        <Link href="/archive">Archive</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/pricing">Pricing</Link>
      </Button>
      {status === "loading" && !initialSession?.user ? (
        <div
          aria-hidden
          className="h-9 w-[7.5rem] animate-pulse rounded-full bg-muted/40"
        />
      ) : effectiveSession?.user ? (
        <>
          <Button asChild title="Account settings" variant="ghost">
            <Link href="/settings/account">{accountLabelFromSession(effectiveSession)}</Link>
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => void signOut({ callbackUrl: "/" })}
            type="button"
            variant="outline"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </>
      ) : (
        <Button asChild variant="ghost">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      )}
      <Button asChild>
        <Link href="/app">
          Open workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
