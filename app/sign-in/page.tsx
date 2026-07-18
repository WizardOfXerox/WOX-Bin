"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ChevronDown, Clock3, Trash2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import {
  getAuthNoticeRedirectUrl,
  normalizePostSignInRedirectUrl
} from "@/lib/auth-client-redirect";
import { AUTH_PAGE_COPY } from "@/lib/auth-page-copy";
import {
  clearRememberedAccountQueue,
  forgetRememberedAccount,
  queueRememberedAccountSave,
  readRememberAccountPreference,
  readRememberedAccounts,
  type RememberedAccount,
  writeRememberAccountPreference
} from "@/lib/remembered-accounts";

function SignInPageContent() {
  const searchParams = useSearchParams();
  const { language, t } = useUiLanguage();
  const authCopy = AUTH_PAGE_COPY[language];
  const sessionError = searchParams.get("sessionError");
  const emailVerify = searchParams.get("emailVerify");
  const authError = searchParams.get("authError");
  const sessionNotice = useMemo(() => {
    if (!sessionError) {
      return null;
    }
    return authCopy.sessionErrors[sessionError] ?? authCopy.sessionErrorFallback;
  }, [authCopy.sessionErrorFallback, authCopy.sessionErrors, sessionError]);

  const emailVerifyNotice = useMemo(() => {
    if (!emailVerify) {
      return null;
    }
    return authCopy.emailVerify[emailVerify] ?? null;
  }, [authCopy.emailVerify, emailVerify]);

  const authErrorNotice = useMemo(() => {
    if (!authError) {
      return null;
    }
    return authCopy.authErrors[authError] ?? authCopy.authErrorFallback;
  }, [authCopy.authErrorFallback, authCopy.authErrors, authError]);

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
    setPassword("");
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
      setMagicStatus(authCopy.magicLinkFailed);
      return;
    }
    setMagicStatus(authCopy.magicLinkSent);
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
      setRecoverError(body?.error ?? authCopy.recoverFailed);
      return;
    }

    setRecoverMessage(
      body?.email
        ? authCopy.recoverSentWithEmail.replace("{email}", body.email)
        : authCopy.recoverSentGeneric
    );
    setRecoverPassword("");
  }

  const hasAlternativeAuth = googleOAuthAvailable || magicLinkAvailable;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-5 sm:p-6">
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("auth.signIn.eyebrow")}</p>
              <h1 className="mt-1.5 text-2xl font-semibold">{t("auth.signIn.title")}</h1>
            </div>
            <LanguageSwitcher compact />
          </div>

          {/* ── Remembered Accounts (compact rows) ─────────────── */}
          {rememberedAccounts.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("auth.signIn.recentTitle")}</p>
              <div className="space-y-1">
                {rememberedAccounts.map((account) => {
                  const accountLabel =
                    account.displayName?.trim() || account.username?.trim() || account.email?.trim() || account.name?.trim() || "Account";
                  const accountDetail = account.email?.trim() || account.username?.trim() || "";
                  return (
                    <div
                      className="group flex cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-muted/40"
                      key={account.id}
                      onClick={() => chooseRememberedAccount(account)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") chooseRememberedAccount(account); }}
                    >
                      <UserAvatar
                        image={account.image}
                        label={account.displayName || account.name || account.email}
                        size="sm"
                        username={account.username}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground leading-tight">{accountLabel}</p>
                        {accountDetail ? (
                          <p className="truncate text-[11px] text-muted-foreground leading-tight">{accountDetail}</p>
                        ) : null}
                      </div>
                      <span className="hidden items-center gap-1 text-[10px] text-muted-foreground/60 sm:inline-flex">
                        <Clock3 className="h-3 w-3" />
                        {formatDistanceToNow(new Date(account.lastUsedAt), { addSuffix: true })}
                      </span>
                      <Button
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); removeRememberedAccount(account.id); }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">{t("auth.signIn.forgetAccount")}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Notices ─────────────────────────────────────────── */}
          {sessionNotice ? <p className="text-sm text-amber-500 dark:text-amber-300">{sessionNotice}</p> : null}
          {emailVerifyNotice ? (
            <p
              className={
                emailVerifyNotice.tone === "ok"
                  ? "text-sm text-emerald-500 dark:text-emerald-400"
                  : "text-sm text-amber-500 dark:text-amber-300"
              }
            >
              {emailVerifyNotice.text}
            </p>
          ) : null}
          {authErrorNotice ? <p className="text-sm text-amber-500 dark:text-amber-300">{authErrorNotice}</p> : null}

          {/* ── Login Form ──────────────────────────────────────── */}
          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={t("auth.signIn.identifier")}
              autoComplete="username"
              required
            />
            <PasswordInput
              ref={passwordInputRef}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.signIn.password")}
              autoComplete="current-password"
              required
            />
            {/* Inline row: remember-me + forgot password */}
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                <input
                  checked={rememberAccount}
                  className="size-3.5 rounded border border-input accent-primary"
                  onChange={(event) => handleRememberPreferenceChange(event.target.checked)}
                  type="checkbox"
                />
                {t("auth.signIn.rememberLabel")}
              </label>
              <Link className="text-xs text-primary underline-offset-4 hover:underline whitespace-nowrap" href="/forgot-password">
                {t("auth.signIn.forgotPassword")}
              </Link>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
            </Button>
          </form>

          {/* ── OR Divider + Alternative Auth ───────────────────── */}
          {hasAlternativeAuth ? (
            <>
              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60">{t("auth.signIn.orContinueWith") || "or"}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-col gap-2">
                {googleOAuthAvailable ? (
                  <Button className="w-full" type="button" variant="outline" onClick={() => void handleGoogleSignIn()}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {t("auth.signIn.google")}
                  </Button>
                ) : null}
                {magicLinkAvailable ? (
                  <form className="flex gap-2" onSubmit={(e) => void handleMagicLink(e)}>
                    <Input
                      autoComplete="email"
                      className="flex-1 text-sm"
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      value={magicEmail}
                    />
                    <Button className="shrink-0" disabled={magicLoading || !magicEmail.trim()} type="submit" variant="secondary">
                      {magicLoading ? t("auth.signIn.magicLinkSending") : t("auth.signIn.magicLink")}
                    </Button>
                  </form>
                ) : null}
                {magicStatus ? <p className="text-xs text-muted-foreground">{magicStatus}</p> : null}
              </div>
            </>
          ) : null}

          {/* ── Verification Help (collapsible disclosure) ──────── */}
          <details className="group" open={recoverOpen || authError === "emailNotVerified" || undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
              {t("auth.signIn.verificationHelpTitle")}
            </summary>
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-3 text-[11px] text-muted-foreground leading-relaxed">
                {t("auth.signIn.verificationHelpDescription")}
              </p>
              <form className="space-y-2.5" onSubmit={handleVerificationRecovery}>
                <Input
                  autoComplete="username"
                  className="text-sm"
                  onChange={(event) => setRecoverIdentifier(event.target.value)}
                  placeholder={t("auth.signIn.identifier")}
                  value={recoverIdentifier}
                />
                <PasswordInput
                  autoComplete="current-password"
                  className="text-sm"
                  onChange={(event) => setRecoverPassword(event.target.value)}
                  placeholder={t("auth.signIn.password")}
                  value={recoverPassword}
                />
                <Input
                  autoComplete="email"
                  className="text-sm"
                  onChange={(event) => setRecoverEmail(event.target.value)}
                  placeholder={t("auth.signIn.correctedEmail")}
                  type="email"
                  value={recoverEmail}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("auth.signIn.correctedEmailHint")}
                </p>
                {recoverError ? <p className="text-xs text-destructive">{recoverError}</p> : null}
                {recoverMessage ? <p className="text-xs text-emerald-500 dark:text-emerald-400">{recoverMessage}</p> : null}
                <Button className="w-full" disabled={recoverLoading} size="sm" type="submit" variant="secondary">
                  {recoverLoading ? t("auth.signIn.sending") : t("auth.signIn.resendVerification")}
                </Button>
              </form>
            </div>
          </details>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <p className="text-sm text-muted-foreground">
              {t("auth.signIn.newHere")}{" "}
              <Link className="text-primary font-medium hover:underline underline-offset-4" href="/sign-up">
                {t("auth.signIn.createAccount")}
              </Link>
            </p>
            <p className="text-center text-[10px] text-muted-foreground/50">
              {authCopy.legalPrefix}{" "}
              <Link className="underline-offset-2 hover:underline" href="/terms">
                {t("common.terms")}
              </Link>{" "}
              {authCopy.legalConnector}{" "}
              <Link className="underline-offset-2 hover:underline" href="/privacy">
                {t("common.privacy")}
              </Link>
              .
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
        <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md">
            <CardContent className="p-5 text-sm text-muted-foreground sm:p-6">Loading…</CardContent>
          </Card>
        </main>
      }
    >
      <SignInPageContent />
    </Suspense>
  );
}
