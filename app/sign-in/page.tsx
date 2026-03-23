"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAuthNoticeRedirectUrl,
  normalizePostSignInRedirectUrl
} from "@/lib/auth-client-redirect";

const SESSION_ERROR_MESSAGES: Record<string, string> = {
  SessionRevoked: "This session was signed out or revoked elsewhere. Sign in again.",
  SessionIdleTimeout: "You were signed out after a period of inactivity. Sign in again.",
  AccountSuspended: "Your account is currently suspended. If you believe this is incorrect, contact the site operator.",
  AccountBanned: "Your account has been banned. If you believe this is incorrect, contact the site operator."
};

const EMAIL_VERIFY_MESSAGES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  pending: { tone: "ok", text: "Account created. Check your email to verify your address before signing in." },
  ok: { tone: "ok", text: "Email verified. You can sign in below." },
  invalid: { tone: "warn", text: "That verification link is invalid or expired. Request a new one from account settings after signing in." },
  missing: { tone: "warn", text: "Verification link was missing a token." }
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  emailNotVerified: "Your email is not verified yet. Check your inbox for the verification link before signing in.",
  accountSuspended: "Your account is currently suspended. Check your email for details or contact the site operator.",
  accountBanned: "Your account has been banned. Contact the site operator if you need clarification."
};

function SignInPageContent() {
  const searchParams = useSearchParams();
  const sessionError = searchParams.get("sessionError");
  const emailVerify = searchParams.get("emailVerify");
  const authError = searchParams.get("authError");
  const sessionNotice = useMemo(() => {
    if (!sessionError) {
      return null;
    }
    return SESSION_ERROR_MESSAGES[sessionError] ?? "Your session is no longer valid. Sign in again.";
  }, [sessionError]);

  const emailVerifyNotice = useMemo(() => {
    if (!emailVerify) {
      return null;
    }
    return EMAIL_VERIFY_MESSAGES[emailVerify] ?? null;
  }, [emailVerify]);

  const authErrorNotice = useMemo(() => {
    if (!authError) {
      return null;
    }
    return AUTH_ERROR_MESSAGES[authError] ?? "Sign in failed.";
  }, [authError]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [magicLinkAvailable, setMagicLinkAvailable] = useState(false);
  const [googleOAuthAvailable, setGoogleOAuthAvailable] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/config/client")
      .then((r) => r.json() as Promise<{ emailMagicLink?: boolean; googleOAuth?: boolean }>)
      .then((data) => {
        setMagicLinkAvailable(Boolean(data.emailMagicLink));
        setGoogleOAuthAvailable(Boolean(data.googleOAuth));
      })
      .catch(() => {
        setMagicLinkAvailable(false);
        setGoogleOAuthAvailable(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
      callbackUrl: "/app"
    });

    const noticeRedirectUrl = getAuthNoticeRedirectUrl(result?.url);
    if (noticeRedirectUrl) {
      window.location.href = noticeRedirectUrl;
      return;
    }

    if (!result || result.error) {
      setError("Sign in failed. Check your username/email and password.");
      setLoading(false);
      return;
    }

    window.location.href = normalizePostSignInRedirectUrl(result.url, "/app");
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMagicLoading(true);
    setMagicStatus(null);
    setError(null);
    const result = await signIn("email", {
      email: magicEmail.trim(),
      callbackUrl: "/app",
      redirect: false
    });
    setMagicLoading(false);
    if (result?.error) {
      setMagicStatus("Could not send sign-in email. Check the address and try again.");
      return;
    }
    setMagicStatus("Check your inbox for a sign-in link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold">Sign in to your workspace</h1>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Username or email"
              autoComplete="username"
              required
            />
            <div className="space-y-2">
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                autoComplete="current-password"
                required
              />
              <p className="text-right text-xs">
                <Link className="text-primary underline-offset-4 hover:underline" href="/forgot-password">
                  Forgot password?
                </Link>
              </p>
            </div>
            {sessionNotice ? <p className="text-sm text-amber-200/90">{sessionNotice}</p> : null}
            {emailVerifyNotice ? (
              <p
                className={
                  emailVerifyNotice.tone === "ok"
                    ? "text-sm text-emerald-500 dark:text-emerald-400"
                    : "text-sm text-amber-200/90"
                }
              >
                {emailVerifyNotice.text}
              </p>
            ) : null}
            {authErrorNotice ? <p className="text-sm text-amber-200/90">{authErrorNotice}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="space-y-3">
            {googleOAuthAvailable ? (
              <Button className="w-full" type="button" variant="outline" onClick={() => signIn("google", { callbackUrl: "/app" })}>
                Continue with Google
              </Button>
            ) : null}
            {magicLinkAvailable ? (
              <form className="space-y-2 rounded-xl border border-border bg-muted/20 p-4" onSubmit={(e) => void handleMagicLink(e)}>
                <p className="text-xs font-medium text-muted-foreground">Sign in with email link</p>
                <Input
                  autoComplete="email"
                  onChange={(e) => setMagicEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={magicEmail}
                />
                <Button className="w-full" disabled={magicLoading || !magicEmail.trim()} type="submit" variant="secondary">
                  {magicLoading ? "Sending link…" : "Email me a magic link"}
                </Button>
                {magicStatus ? <p className="text-xs text-muted-foreground">{magicStatus}</p> : null}
              </form>
            ) : null}
            <p className="text-center text-xs text-muted-foreground">
              Use of WOX-Bin is subject to our{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href="/terms">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href="/privacy">
                Privacy Policy
              </Link>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              New here?{" "}
              <Link className="text-primary" href="/sign-up">
                Create an account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        </main>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}
