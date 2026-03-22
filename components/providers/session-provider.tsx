"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useRef, type ReactNode } from "react";

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
      {children}
    </SessionProvider>
  );
}
