"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { ArrowRight, LogOut, Menu } from "lucide-react";

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
import { cn } from "@/lib/utils";

/**
 * Mobile-only nav: large tap targets, bottom-sheet style on small viewports.
 */
type Props = {
  initialSession?: Session | null;
};

export function LandingMobileNav({ initialSession = null }: Props) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const effectiveSession = session?.user ? session : initialSession;
  const showLoadingSkeleton = status === "loading" && !effectiveSession?.user;

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
          <DialogTitle className="text-base font-semibold">Menu</DialogTitle>
          <DialogDescription>Archive, BookmarkFS, help, support, account, and workspace</DialogDescription>
        </DialogHeader>
        <nav aria-label="Primary" className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/archive">Archive</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/pricing">Pricing</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/quick">Quick paste</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/help">Help</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/bookmarkfs">BookmarkFS</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/support">Support</Link>
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                <Link href="/changelog">Changelog</Link>
              </Button>
            </DialogClose>
          </div>
          {showLoadingSkeleton ? (
            <div aria-hidden className="h-12 w-full animate-pulse rounded-full bg-muted/40" />
          ) : effectiveSession?.user ? (
            <>
              <DialogClose asChild>
                <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                  <Link href="/settings/account">{accountLabelFromSession(effectiveSession)}</Link>
                </Button>
              </DialogClose>
              <Button
                className="h-12 w-full justify-center gap-2 text-base"
                onClick={() => {
                  setOpen(false);
                  void signOut({ callbackUrl: "/" });
                }}
                type="button"
                variant="outline"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <DialogClose asChild>
                <Button asChild className="h-12 w-full justify-center text-base" variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button asChild className="h-12 w-full justify-center text-base" variant="secondary">
                  <Link href="/sign-up">Create account</Link>
                </Button>
              </DialogClose>
            </>
          )}
          <DialogClose asChild>
            <Button asChild className="h-12 w-full justify-center text-base">
              <Link href="/app">
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </DialogClose>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
