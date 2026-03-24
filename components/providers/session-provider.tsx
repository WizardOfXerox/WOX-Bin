"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useRef, type ReactNode } from "react";

import {
  consumeRememberedAccountQueue,
  refreshRememberedAccount,
  saveRememberedAccount
} from "@/lib/remembered-accounts";

type Props = {
  children: ReactNode;
  session: Session | null;
};

function SessionErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.error) {
      return;
    }
    const reason = encodeURIComponent(session.error);
    void signOut({ callbackUrl: `/sign-in?sessionError=${reason}` });
  }, [session?.error]);

  return null;
}

function SessionTouch() {
  const { data: session, status } = useSession();
  const touched = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || touched.current) {
      return;
    }
    if (!session?.user?.browserSessionId) {
      return;
    }
    touched.current = true;
    void fetch("/api/settings/sessions/touch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
      })
    }).catch(() => {
      touched.current = false;
    });
  }, [status, session?.user?.browserSessionId]);

  return null;
}

function RememberedAccountsSync() {
  const { data: session, status } = useSession();
  const lastHandledSignature = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    const signature = [
      session.user.id,
      session.user.username ?? "",
      session.user.displayName ?? "",
      session.user.name ?? "",
      session.user.email ?? "",
      session.user.image ?? ""
    ].join("|");

    if (lastHandledSignature.current === signature) {
      return;
    }
    lastHandledSignature.current = signature;

    const payload = {
      id: session.user.id,
      username: session.user.username ?? null,
      displayName: session.user.displayName ?? null,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      preferredProvider: null as "credentials" | "google" | "email" | null
    };

    const pending = consumeRememberedAccountQueue();
    if (pending) {
      saveRememberedAccount({
        ...payload,
        preferredProvider: pending.provider
      });
      return;
    }

    refreshRememberedAccount(payload);
  }, [
    session?.user?.displayName,
    session?.user?.email,
    session?.user?.id,
    session?.user?.image,
    session?.user?.name,
    session?.user?.username,
    status
  ]);

  return null;
}

export function AuthSessionProvider({ children, session }: Props) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <SessionProvider
      basePath="/api/auth"
      /* Dev: avoid extra /api/auth/session calls while webpack is still compiling routes (reduces CLIENT_FETCH_ERROR noise). */
      refetchOnWindowFocus={!isDev}
      session={session}
    >
      <SessionErrorHandler />
      <SessionTouch />
      <RememberedAccountsSync />
      {children}
    </SessionProvider>
  );
}
