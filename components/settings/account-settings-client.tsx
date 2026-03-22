"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type AccountProfileInitial = {
  email: string | null;
  username: string | null;
  displayName: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  smtpConfigured: boolean;
};

type Props = {
  initial: AccountProfileInitial;
};

export function AccountSettingsClient({ initial }: Props) {
  const { update } = useSession();
  const [username, setUsername] = useState(initial.username ?? "");
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    const payload: { username?: string; displayName?: string } = {};
    const trimmedUser = username.trim().toLowerCase();
    const trimmedDisplay = displayName.trim();
    if (trimmedUser !== (initial.username ?? "").toLowerCase()) {
      payload.username = trimmedUser;
    }
    if (trimmedDisplay !== (initial.displayName ?? "")) {
      payload.displayName = trimmedDisplay;
    }

    if (Object.keys(payload).length === 0) {
      setStatus("No changes to save.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = (await response.json().catch(() => null)) as {
      error?: string;
      username?: string;
      displayName?: string | null;
    };

    if (!response.ok) {
      setError(body?.error ?? "Could not update your account.");
      setLoading(false);
      return;
    }

    if (typeof body.username === "string") {
      setUsername(body.username);
    }
    if (body.displayName !== undefined) {
      setDisplayName(body.displayName ?? "");
    }

    await update();
    setStatus("Profile saved.");
    setLoading(false);
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMessage(null);
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const body = (await response.json().catch(() => null)) as { error?: string; ok?: boolean };
    setResendLoading(false);
    if (!response.ok) {
      setResendMessage(body?.error ?? "Could not send email.");
      return;
    }
    setResendMessage("Verification email sent. Check your inbox.");
  }

  async function handleExport() {
    setExportLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/account/data-export");
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string };
        setError(body?.error ?? "Export failed.");
        setExportLoading(false);
        return;
      }
      const blob = await response.blob();
      const dispo = response.headers.get("Content-Disposition");
      const match = dispo?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "wox-bin-export.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Download started.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteLoading(true);
    setDeleteError(null);

    const response = await fetch("/api/settings/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmPhrase: deletePhrase.trim(),
        password: initial.hasPassword ? deletePassword : undefined
      })
    });

    const body = (await response.json().catch(() => null)) as { error?: string; ok?: boolean };

    if (!response.ok) {
      setDeleteError(body?.error ?? "Could not delete account.");
      setDeleteLoading(false);
      return;
    }

    await signOut({ callbackUrl: "/" });
  }

  const showVerifyBanner =
    initial.smtpConfigured && initial.email && !initial.emailVerified;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold">Account</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your username is public where you share pastes. Display name is shown in the app header and session.
            </p>
          </div>

          {showVerifyBanner ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <p className="font-medium text-amber-50">Verify your email</p>
              <p className="mt-1 text-amber-100/90">
                We sent a link to <span className="font-medium">{initial.email}</span>. Verifying helps with recovery and
                notifications on this deployment.
              </p>
              <Button
                className="mt-3"
                disabled={resendLoading}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => void handleResendVerification()}
              >
                {resendLoading ? "Sending…" : "Resend verification email"}
              </Button>
              {resendMessage ? <p className="mt-2 text-xs text-amber-50/90">{resendMessage}</p> : null}
            </div>
          ) : null}

          {initial.emailVerified && initial.email ? (
            <p className="text-xs text-emerald-500/90">Email verified.</p>
          ) : null}

          <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="account-email">
                Email
              </label>
              <Input
                className="bg-muted/40"
                disabled
                id="account-email"
                readOnly
                value={initial.email ?? "—"}
              />
              <p className="text-xs text-muted-foreground">
                Email is tied to your sign-in provider and cannot be changed here yet.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="account-username">
                Username
              </label>
              <Input
                autoComplete="username"
                id="account-username"
                maxLength={32}
                minLength={2}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_name"
                value={username}
              />
              <p className="text-xs text-muted-foreground">2–32 characters: letters, numbers, underscores. Stored lowercase.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="account-display">
                Display name
              </label>
              <Input
                autoComplete="nickname"
                id="account-display"
                maxLength={80}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be addressed"
                value={displayName}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {initial.hasPassword ? (
                <p>
                  You sign in with <span className="font-medium text-foreground">email and password</span>. Changing your
                  password from this screen is not available yet (add a reset-email flow on your deployment if you need it).
                </p>
              ) : (
                <p>
                  No password on file — you probably use <span className="font-medium text-foreground">Google</span>,{" "}
                  <span className="font-medium text-foreground">magic link</span>, or another OAuth provider. Manage your
                  email with that provider; use the fields above for how you appear in WOX-Bin.
                </p>
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {status ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{status}</p> : null}

            <Button disabled={loading} type="submit">
              {loading ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Data</p>
            <h2 className="mt-2 text-xl font-semibold">Export</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Download a JSON snapshot of your profile and up to 500 most recently updated pastes (paste body text included).
              Large attachments are not expanded inline — see export notes in the file.
            </p>
          </div>
          <Button disabled={exportLoading} type="button" variant="outline" onClick={() => void handleExport()}>
            {exportLoading ? "Preparing…" : "Download data export"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-destructive">Danger zone</p>
            <h2 className="mt-2 text-xl font-semibold text-destructive">Delete account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Permanently removes your user row and related auth data. Pastes you own become unassigned (content may remain
              depending on visibility). You cannot be on a <span className="text-foreground">shared team</span> or lead a
              team with other members — resolve that first.
            </p>
          </div>
          <form className="space-y-4" onSubmit={(e) => void handleDeleteAccount(e)}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="delete-confirm">
                Type <span className="font-mono text-foreground">DELETE MY ACCOUNT</span> to confirm
              </label>
              <Input
                autoComplete="off"
                id="delete-confirm"
                onChange={(e) => setDeletePhrase(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                value={deletePhrase}
              />
            </div>
            {initial.hasPassword ? (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="delete-password">
                  Account password
                </label>
                <Input
                  autoComplete="current-password"
                  id="delete-password"
                  onChange={(e) => setDeletePassword(e.target.value)}
                  type="password"
                  value={deletePassword}
                />
              </div>
            ) : null}
            {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
            <Button disabled={deleteLoading} type="submit" variant="destructive">
              {deleteLoading ? "Deleting…" : "Delete my account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
