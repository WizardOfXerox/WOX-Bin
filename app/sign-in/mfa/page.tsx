"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { normalizePostSignInRedirectUrl } from "@/lib/auth-client-redirect";

function MfaChallengeContent() {
  const searchParams = useSearchParams();
  const { t } = useUiLanguage();
  const ticket = searchParams.get("ticket") ?? "";
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTicket = useMemo(() => ticket.trim().length > 0, [ticket]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasTicket) {
      setError("This sign-in challenge has expired. Start sign-in again.");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      callbackUrl: "/app",
      mfaTicket: ticket,
      totpCode: totpCode.trim() || undefined,
      recoveryCode: recoveryCode.trim() || undefined
    });

    if (!result || result.error) {
      setError("That authenticator or recovery code was not accepted.");
      setLoading(false);
      return;
    }

    window.location.href = normalizePostSignInRedirectUrl(result.url, "/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t("auth.mfa.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-semibold">{t("auth.mfa.title")}</h1>
            </div>
            <LanguageSwitcher compact />
          </div>
          <div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("auth.mfa.description")}
            </p>
          </div>

          {!hasTicket ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              This sign-in challenge is missing or expired. Return to the sign-in page and start again.
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="mfa-code">
                {t("auth.mfa.code")}
              </label>
              <Input
                autoComplete="one-time-code"
                id="mfa-code"
                inputMode="numeric"
                maxLength={8}
                onChange={(event) => setTotpCode(event.target.value)}
                placeholder="123456"
                value={totpCode}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="mfa-recovery-code">
                {t("auth.mfa.recovery")}
              </label>
              <Input
                autoCapitalize="characters"
                id="mfa-recovery-code"
                maxLength={32}
                onChange={(event) => setRecoveryCode(event.target.value)}
                placeholder="ABCDE-12345"
                value={recoveryCode}
              />
              <p className="text-xs text-muted-foreground">
                {t("auth.mfa.hint")}
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="w-full" disabled={loading || !hasTicket} type="submit">
              {loading ? t("auth.mfa.submitting") : t("auth.mfa.submit")}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Need to start over?{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
              {t("auth.mfa.back")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function MfaChallengePage() {
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
      <MfaChallengeContent />
    </Suspense>
  );
}
