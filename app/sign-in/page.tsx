"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Clock3, Trash2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import {
  getAuthNoticeRedirectUrl,
  normalizePostSignInRedirectUrl
} from "@/lib/auth-client-redirect";
import {
  clearRememberedAccountQueue,
  forgetRememberedAccount,
  queueRememberedAccountSave,
  readRememberAccountPreference,
  readRememberedAccounts,
  type RememberedAccount,
  writeRememberAccountPreference
} from "@/lib/remembered-accounts";

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
  emailNotVerified: "Your email is not verified yet. Check your inbox for the verification link, or use verification help below.",
  accountSuspended: "Your account is currently suspended. Check your email for details or contact the site operator.",
  accountBanned: "Your account has been banned. Contact the site operator if you need clarification."
};

function SignInPageContent() {
  const searchParams = useSearchParams();
  const { t } = useUiLanguage();
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
  const [rememberAccount, setRememberAccount] = useState(() =>
    typeof window !== "undefined" ? readRememberAccountPreference() : false
  );
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(() =>
    typeof window !== "undefined" ? readRememberedAccounts() : []
  );
  const [recoverOpen, setRecoverOpen] = useState(authError === "emailNotVerified");
  const [recoverIdentifier, setRecoverIdentifier] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);
  const [recoverError, setRecoverError] = useState<string | null>(null);

  const [magicLinkAvailable, setMagicLinkAvailable] = useState(false);
  const [googleOAuthAvailable, setGoogleOAuthAvailable] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicStatus, setMagicStatus] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

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

  function handleRememberPreferenceChange(next: boolean) {
    setRememberAccount(next);
    writeRememberAccountPreference(next);
  }

  function chooseRememberedAccount(account: RememberedAccount) {
    const nextIdentifier = account.email?.trim() || account.username?.trim() || "";
    setIdentifier(nextIdentifier);
    setRecoverIdentifier(nextIdentifier);
    setMagicEmail(account.email?.trim() || "");
    setError(null);
    setMagicStatus(null);
    setRecoverError(null);
    setRecoverMessage(null);
    setRememberAccount(true);
    writeRememberAccountPreference(true);
    passwordInputRef.current?.focus();
  }

  function removeRememberedAccount(accountId: string) {
    forgetRememberedAccount(accountId);
    setRememberedAccounts(readRememberedAccounts());
  }

  function queueRememberPreference(provider: "credentials" | "google" | "email") {
    if (rememberAccount) {
      queueRememberedAccountSave(provider);
      return;
    }
    clearRememberedAccountQueue();
  }

  async function handleGoogleSignIn() {
    queueRememberPreference("google");
    await signIn("google", { callbackUrl: "/app" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    queueRememberPreference("credentials");

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
      callbackUrl: "/app"
    });

    const noticeRedirectUrl = getAuthNoticeRedirectUrl(result?.url);
    if (noticeRedirectUrl) {
      clearRememberedAccountQueue();
      window.location.href = noticeRedirectUrl;
      return;
    }

    if (!result || result.error) {
      clearRememberedAccountQueue();
      setError(t("auth.signIn.failed"));
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
    queueRememberPreference("email");
    const result = await signIn("email", {
      email: magicEmail.trim(),
      callbackUrl: "/app",
      redirect: false
    });
    setMagicLoading(false);
    if (result?.error) {
      clearRememberedAccountQueue();
      setMagicStatus("Could not send sign-in email. Check the address and try again.");
      return;
    }
    setMagicStatus("Check your inbox for a sign-in link.");
  }

  async function handleVerificationRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoverLoading(true);
    setRecoverError(null);
    setRecoverMessage(null);

    const response = await fetch("/api/auth/recover-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: recoverIdentifier.trim() || identifier.trim(),
        password: recoverPassword,
        email: recoverEmail.trim() || undefined
      })
    });

    const body = (await response.json().catch(() => null)) as { error?: string; email?: string } | null;
    setRecoverLoading(false);

    if (!response.ok) {
      setRecoverError(body?.error ?? "Could not recover verification email.");
      return;
    }

    setRecoverMessage(
      body?.email
        ? `Verification email sent to ${body.email}.`
        : "Verification email sent. Check your inbox."
    );
    setRecoverPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("auth.signIn.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-semibold">{t("auth.signIn.title")}</h1>
            </div>
            <LanguageSwitcher compact />
          </div>
          {rememberedAccounts.length ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{t("auth.signIn.recentTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("auth.signIn.recentDescription")}</p>
              </div>
              <div className="grid gap-3">
                {rememberedAccounts.map((account) => {
                  const accountLabel =
                    account.displayName?.trim() || account.username?.trim() || account.email?.trim() || account.name?.trim() || "Account";
                  const accountDetail = account.email?.trim() || account.username?.trim() || "Saved on this browser";
                  return (
                    <div className="rounded-2xl border border-border bg-card/70 p-3" key={account.id}>
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          image={account.image}
                          label={account.displayName || account.name || account.email}
                          size="md"
                          username={account.username}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{accountLabel}</p>
                              <p className="truncate text-xs text-muted-foreground">{accountDetail}</p>
                            </div>
                            <Button
                              className="shrink-0"
                              onClick={() => removeRememberedAccount(account.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">{t("auth.signIn.forgetAccount")}</span>
                            </Button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button onClick={() => chooseRememberedAccount(account)} size="sm" type="button" variant="outline">
                              {t("auth.signIn.useAccount")}
                            </Button>
                            {googleOAuthAvailable && account.preferredProvider === "google" ? (
                              <Button onClick={() => void handleGoogleSignIn()} size="sm" type="button" variant="secondary">
                                {t("auth.signIn.useGoogle")}
                              </Button>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              {t("auth.signIn.lastUsed")} {formatDistanceToNow(new Date(account.lastUsedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t("auth.signIn.identifier")}
              autoComplete="username"
              required
            />
            <div className="space-y-2">
              <Input
                ref={passwordInputRef}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.signIn.password")}
                type="password"
                autoComplete="current-password"
                required
              />
              <p className="text-right text-xs">
                <Link className="text-primary underline-offset-4 hover:underline" href="/forgot-password">
                  {t("auth.signIn.forgotPassword")}
                </Link>
              </p>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
              <input
                checked={rememberAccount}
                className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
                onChange={(event) => handleRememberPreferenceChange(event.target.checked)}
                type="checkbox"
              />
              <span className="min-w-0">
                <span className="font-medium text-foreground">{t("auth.signIn.rememberLabel")}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t("auth.signIn.rememberDescription")}</span>
              </span>
            </label>
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
              {loading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
            </Button>
          </form>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("auth.signIn.verificationHelpTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("auth.signIn.verificationHelpDescription")}
                </p>
              </div>
              {authError === "emailNotVerified" ? null : (
                <Button onClick={() => setRecoverOpen((open) => !open)} size="sm" type="button" variant="ghost">
                  {recoverOpen ? t("auth.signIn.hide") : t("auth.signIn.open")}
                </Button>
              )}
            </div>
            {recoverOpen || authError === "emailNotVerified" ? (
              <form className="mt-4 space-y-3" onSubmit={handleVerificationRecovery}>
                <Input
                  autoComplete="username"
                  onChange={(event) => setRecoverIdentifier(event.target.value)}
                  placeholder={t("auth.signIn.identifier")}
                  value={recoverIdentifier}
                />
                <Input
                  autoComplete="current-password"
                  onChange={(event) => setRecoverPassword(event.target.value)}
                  placeholder={t("auth.signIn.password")}
                  type="password"
                  value={recoverPassword}
                />
                <Input
                  autoComplete="email"
                  onChange={(event) => setRecoverEmail(event.target.value)}
                  placeholder={t("auth.signIn.correctedEmail")}
                  type="email"
                  value={recoverEmail}
                />
                <p className="text-xs text-muted-foreground">
                  {t("auth.signIn.correctedEmailHint")}
                </p>
                {recoverError ? <p className="text-sm text-destructive">{recoverError}</p> : null}
                {recoverMessage ? <p className="text-sm text-emerald-500 dark:text-emerald-400">{recoverMessage}</p> : null}
                <Button className="w-full" disabled={recoverLoading} type="submit" variant="secondary">
                  {recoverLoading ? t("auth.signIn.sending") : t("auth.signIn.resendVerification")}
                </Button>
              </form>
            ) : null}
          </div>
          <div className="space-y-3">
            {googleOAuthAvailable ? (
              <Button className="w-full" type="button" variant="outline" onClick={() => void handleGoogleSignIn()}>
                {t("auth.signIn.google")}
              </Button>
            ) : null}
            {magicLinkAvailable ? (
              <form className="space-y-2 rounded-xl border border-border bg-muted/20 p-4" onSubmit={(e) => void handleMagicLink(e)}>
                <p className="text-xs font-medium text-muted-foreground">{t("auth.signIn.magicLinkTitle")}</p>
                <Input
                  autoComplete="email"
                  onChange={(e) => setMagicEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={magicEmail}
                />
                <Button className="w-full" disabled={magicLoading || !magicEmail.trim()} type="submit" variant="secondary">
                  {magicLoading ? t("auth.signIn.magicLinkSending") : t("auth.signIn.magicLink")}
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
              {t("auth.signIn.newHere")}{" "}
              <Link className="text-primary" href="/sign-up">
                {t("auth.signIn.createAccount")}
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
