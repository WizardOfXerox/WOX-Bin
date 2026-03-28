"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, type ChangeEvent, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUiLanguage } from "@/components/providers/ui-language-provider";

export type AccountProfileInitial = {
  email: string | null;
  username: string | null;
  displayName: string | null;
  image: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  smtpConfigured: boolean;
  googleConnected: boolean;
  googleOAuthAvailable: boolean;
  discordConnected: boolean;
  discordOAuthAvailable: boolean;
  totpAvailable: boolean;
  totpEnabled: boolean;
  totpEnabledAt: string | null;
  totpLastUsedAt: string | null;
  avatarUploadEnabled: boolean;
};

type Props = {
  initial: AccountProfileInitial;
};

export function AccountSettingsClient({ initial }: Props) {
  const { t } = useUiLanguage();
  const { update } = useSession();
  const [username, setUsername] = useState(initial.username ?? "");
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [image, setImage] = useState(initial.image ?? "");
  const [avatarUploadMessage, setAvatarUploadMessage] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [googleConnected, setGoogleConnected] = useState(initial.googleConnected);
  const [discordConnected, setDiscordConnected] = useState(initial.discordConnected);
  const [totpEnabled, setTotpEnabled] = useState(initial.totpEnabled);
  const [totpEnabledAt, setTotpEnabledAt] = useState(initial.totpEnabledAt);
  const [totpLastUsedAt, setTotpLastUsedAt] = useState(initial.totpLastUsedAt);
  const [savedProfile, setSavedProfile] = useState({
    username: initial.username ?? "",
    displayName: initial.displayName ?? "",
    image: initial.image ?? ""
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [discordProviderLoading, setDiscordProviderLoading] = useState(false);
  const [discordProviderError, setDiscordProviderError] = useState<string | null>(null);
  const [discordProviderStatus, setDiscordProviderStatus] = useState<string | null>(null);

  const [totpSetup, setTotpSetup] = useState<{
    setupId: string;
    secret: string;
    qrSvg: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpDisableCode, setTotpDisableCode] = useState("");
  const [totpDisableRecoveryCode, setTotpDisableRecoveryCode] = useState("");
  const [totpRecoveryRegenerateCode, setTotpRecoveryRegenerateCode] = useState("");
  const [totpRecoveryRegenerateRecoveryCode, setTotpRecoveryRegenerateRecoveryCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpStatus, setTotpStatus] = useState<string | null>(null);
  const [totpRecoveryCodes, setTotpRecoveryCodes] = useState<string[]>([]);

  const [deletePhrase, setDeletePhrase] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function readAvatarAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }
        reject(new Error("Could not read that image."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Could not read that image."));
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const normalizedType = file.type.trim().toLowerCase();
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(normalizedType)) {
      setAvatarUploadMessage("Use PNG, JPG, WebP, GIF, or AVIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadMessage("Profile image must be 5 MB or smaller.");
      return;
    }

    try {
      const dataUrl = await readAvatarAsDataUrl(file);
      setImage(dataUrl);
      setAvatarUploadMessage(`${file.name} selected. Save profile to publish it.`);
      setError(null);
      setStatus(null);
    } catch (uploadError) {
      setAvatarUploadMessage(uploadError instanceof Error ? uploadError.message : "Could not read that image.");
    }
  }

  function handleRemoveAvatar() {
    setImage("");
    setAvatarUploadMessage("Avatar will be removed when you save.");
    setError(null);
    setStatus(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    const payload: { username?: string; displayName?: string; image?: string } = {};
    const trimmedUser = username.trim().toLowerCase();
    const trimmedDisplay = displayName.trim();
    const trimmedImage = image.trim();
    if (trimmedUser !== savedProfile.username.toLowerCase()) {
      payload.username = trimmedUser;
    }
    if (trimmedDisplay !== savedProfile.displayName) {
      payload.displayName = trimmedDisplay;
    }
    if (trimmedImage !== savedProfile.image) {
      payload.image = trimmedImage;
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
      image?: string | null;
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
    if (body.image !== undefined) {
      setImage(body.image ?? "");
    }
    setAvatarUploadMessage(null);
    setSavedProfile({
      username: typeof body.username === "string" ? body.username : trimmedUser,
      displayName: body.displayName !== undefined ? body.displayName ?? "" : trimmedDisplay,
      image: body.image !== undefined ? body.image ?? "" : trimmedImage
    });

    await update({
      user: {
        username: typeof body.username === "string" ? body.username : trimmedUser,
        displayName: body.displayName !== undefined ? body.displayName ?? null : trimmedDisplay || null,
        name:
          (body.displayName !== undefined ? body.displayName ?? null : trimmedDisplay || null) ??
          (typeof body.username === "string" ? body.username : trimmedUser) ??
          null,
        image: body.image !== undefined ? body.image ?? null : trimmedImage || null
      }
    });
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordStatus(null);

    const creatingPassword = !hasPassword;
    const nextPassword = passwordNext;

    if (hasPassword && !passwordCurrent) {
      setPasswordError("Current password is required.");
      setPasswordLoading(false);
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      setPasswordLoading(false);
      return;
    }

    if (nextPassword !== passwordConfirm) {
      setPasswordError("New password and confirmation do not match.");
      setPasswordLoading(false);
      return;
    }

    const response = await fetch("/api/settings/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: hasPassword ? passwordCurrent : undefined,
        newPassword: nextPassword
      })
    });

    const body = (await response.json().catch(() => null)) as {
      error?: string;
      hasPassword?: boolean;
      revokedOtherSessions?: boolean;
    } | null;

    if (!response.ok) {
      setPasswordError(body?.error ?? "Could not update password.");
      setPasswordLoading(false);
      return;
    }

    setHasPassword(body?.hasPassword ?? true);
    setPasswordCurrent("");
    setPasswordNext("");
    setPasswordConfirm("");
    setProviderError(null);
    setProviderStatus(null);
    setDiscordProviderError(null);
    setDiscordProviderStatus(null);
    setPasswordStatus(
      body?.revokedOtherSessions
        ? creatingPassword
          ? "Password created. Other sessions were signed out."
          : "Password updated. Other sessions were signed out."
        : creatingPassword
          ? "Password created."
          : "Password updated."
    );
    setPasswordLoading(false);
  }

  async function handleDisconnectGoogle() {
    if (!hasPassword) {
      setProviderError("Create a password before disconnecting Google.");
      setProviderStatus(null);
      return;
    }

    setProviderLoading(true);
    setProviderError(null);
    setProviderStatus(null);

    const response = await fetch("/api/settings/account/providers/google", {
      method: "DELETE"
    });

    const body = (await response.json().catch(() => null)) as {
      error?: string;
      googleConnected?: boolean;
      revokedOtherSessions?: boolean;
    } | null;

    if (!response.ok) {
      setProviderError(body?.error ?? "Could not disconnect Google.");
      setProviderLoading(false);
      return;
    }

    setGoogleConnected(body?.googleConnected ?? false);
    setProviderStatus(
      body?.revokedOtherSessions
        ? "Google disconnected. Other sessions were signed out."
        : "Google disconnected."
    );
    setProviderLoading(false);
  }

  async function handleDisconnectDiscord() {
    if (!hasPassword) {
      setDiscordProviderError("Create a password before disconnecting Discord.");
      setDiscordProviderStatus(null);
      return;
    }

    setDiscordProviderLoading(true);
    setDiscordProviderError(null);
    setDiscordProviderStatus(null);

    const response = await fetch("/api/settings/account/providers/discord", {
      method: "DELETE"
    });

    const body = (await response.json().catch(() => null)) as {
      error?: string;
      discordConnected?: boolean;
      revokedOtherSessions?: boolean;
    } | null;

    if (!response.ok) {
      setDiscordProviderError(body?.error ?? "Could not disconnect Discord.");
      setDiscordProviderLoading(false);
      return;
    }

    setDiscordConnected(body?.discordConnected ?? false);
    setDiscordProviderStatus(
      body?.revokedOtherSessions
        ? "Discord disconnected. Other sessions were signed out."
        : "Discord disconnected."
    );
    setDiscordProviderLoading(false);
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
        password: hasPassword ? deletePassword : undefined
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

  function copyRecoveryCodes() {
    if (!totpRecoveryCodes.length) {
      return;
    }
    void navigator.clipboard.writeText(totpRecoveryCodes.join("\n"));
    setTotpStatus("Recovery codes copied. Store them somewhere safe.");
  }

  function downloadRecoveryCodes() {
    if (!totpRecoveryCodes.length) {
      return;
    }
    const blob = new Blob([totpRecoveryCodes.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wox-bin-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleStartTotpSetup() {
    if (!initial.totpAvailable) {
      setTotpError("Authenticator sign-in is not ready on this deployment yet. Try again after the latest database update is applied.");
      setTotpStatus(null);
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    setTotpStatus(null);
    const response = await fetch("/api/settings/account/totp/setup", {
      method: "POST"
    });
    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          setupId?: string;
          secret?: string;
          qrSvg?: string;
        }
      | null;
    setTotpLoading(false);
    if (!response.ok || !body?.setupId || !body.secret || !body.qrSvg) {
      setTotpError(body?.error ?? "Could not start authenticator setup.");
      return;
    }
    setTotpSetup({
      setupId: body.setupId,
      secret: body.secret,
      qrSvg: body.qrSvg
    });
    setTotpCode("");
    setTotpRecoveryCodes([]);
    setTotpStatus("Scan the QR code, then enter the 6-digit code from your authenticator app.");
  }

  async function handleEnableTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!totpSetup) {
      setTotpError("Start setup first.");
      return;
    }
    setTotpLoading(true);
    setTotpError(null);
    setTotpStatus(null);

    const response = await fetch("/api/settings/account/totp/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setupId: totpSetup.setupId,
        code: totpCode
      })
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: string; recoveryCodes?: string[]; revokedOtherSessions?: boolean }
      | null;

    setTotpLoading(false);
    if (!response.ok) {
      setTotpError(body?.error ?? "Could not enable authenticator sign-in.");
      return;
    }

    setTotpEnabled(true);
    setTotpEnabledAt(new Date().toISOString());
    setTotpLastUsedAt(new Date().toISOString());
    setTotpSetup(null);
    setTotpCode("");
    setTotpRecoveryCodes(body?.recoveryCodes ?? []);
    setTotpStatus(
      body?.revokedOtherSessions
        ? "Authenticator app enabled. Other sessions were signed out."
        : "Authenticator app enabled."
    );
  }

  async function handleDisableTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTotpLoading(true);
    setTotpError(null);
    setTotpStatus(null);

    const response = await fetch("/api/settings/account/totp", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: hasPassword ? totpPassword : undefined,
        code: hasPassword ? undefined : totpDisableCode,
        recoveryCode: hasPassword ? undefined : totpDisableRecoveryCode
      })
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: string; revokedOtherSessions?: boolean }
      | null;

    setTotpLoading(false);
    if (!response.ok) {
      setTotpError(body?.error ?? "Could not disable authenticator sign-in.");
      return;
    }

    setTotpEnabled(false);
    setTotpEnabledAt(null);
    setTotpLastUsedAt(null);
    setTotpPassword("");
    setTotpDisableCode("");
    setTotpDisableRecoveryCode("");
    setTotpRecoveryCodes([]);
    setTotpStatus(
      body?.revokedOtherSessions
        ? "Authenticator app disabled. Other sessions were signed out."
        : "Authenticator app disabled."
    );
  }

  async function handleRegenerateRecoveryCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTotpLoading(true);
    setTotpError(null);
    setTotpStatus(null);
    const response = await fetch("/api/settings/account/totp/recovery-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: totpRecoveryRegenerateCode,
        recoveryCode: totpRecoveryRegenerateRecoveryCode || undefined
      })
    });
    const body = (await response.json().catch(() => null)) as { error?: string; recoveryCodes?: string[] } | null;
    setTotpLoading(false);
    if (!response.ok) {
      setTotpError(body?.error ?? "Could not regenerate recovery codes.");
      return;
    }
    setTotpRecoveryCodes(body?.recoveryCodes ?? []);
    setTotpRecoveryRegenerateCode("");
    setTotpRecoveryRegenerateRecoveryCode("");
    setTotpStatus("Recovery codes regenerated. Replace any previously saved copies.");
  }

  const showVerifyBanner = initial.smtpConfigured && initial.email && !initial.emailVerified;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold">{t("settings.account.profileHeading")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.account.profileDescription")}
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
              <Input className="bg-muted/40" disabled id="account-email" readOnly value={initial.email ?? "—"} />
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

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <UserAvatar
                  className="shadow-sm"
                  image={image}
                  label={displayName || username || initial.email}
                  size="xl"
                  username={username}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="account-image-upload">
                    Profile image
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Upload PNG, JPG, WebP, GIF, or AVIF up to 5 MB. Uploaded avatars are stored on your account and
                    served back through a short image URL so sessions stay small.
                  </p>
                  {initial.avatarUploadEnabled ? (
                    <Input
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      id="account-image-upload"
                      onChange={(event) => void handleAvatarFileChange(event)}
                      type="file"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Avatar uploads are disabled on this deployment right now.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={!image} type="button" variant="outline" onClick={handleRemoveAvatar}>
                      Remove avatar
                    </Button>
                  </div>
                  {avatarUploadMessage ? <p className="text-xs text-muted-foreground">{avatarUploadMessage}</p> : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {hasPassword ? (
                <p>
                  Password sign-in is enabled on this account. Use the security section below to change it or keep Google
                  linked as a second sign-in method.
                </p>
              ) : (
                <p>
                  No password on file yet. If you want to disconnect Google later, create a password first and keep that
                  credential on the account.
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
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t("settings.account.languageHeading")}</p>
            <h2 className="mt-2 text-xl font-semibold">{t("common.language")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.account.languageDescription")}
            </p>
          </div>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Security</p>
            <h2 className="mt-2 text-xl font-semibold">{t("settings.account.securityHeading")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("settings.account.securityDescription")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasPassword ? "Enabled for direct sign-in." : "Not set yet."}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {hasPassword ? "Active" : "Required for Google disconnect"}
                </span>
              </div>

              <form className="mt-4 space-y-3" onSubmit={(e) => void handlePasswordSubmit(e)}>
                {hasPassword ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="account-password-current">
                      Current password
                    </label>
                    <Input
                      autoComplete="current-password"
                      id="account-password-current"
                      onChange={(e) => setPasswordCurrent(e.target.value)}
                      type="password"
                      value={passwordCurrent}
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="account-password-next">
                    {hasPassword ? "New password" : "Create password"}
                  </label>
                  <Input
                    autoComplete="new-password"
                    id="account-password-next"
                    onChange={(e) => setPasswordNext(e.target.value)}
                    type="password"
                    value={passwordNext}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="account-password-confirm">
                    Confirm password
                  </label>
                  <Input
                    autoComplete="new-password"
                    id="account-password-confirm"
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    type="password"
                    value={passwordConfirm}
                  />
                </div>

                {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
                {passwordStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{passwordStatus}</p> : null}

                <Button disabled={passwordLoading} type="submit">
                  {passwordLoading
                    ? hasPassword
                      ? "Updating…"
                      : "Creating…"
                    : hasPassword
                      ? "Change password"
                      : "Create password"}
                </Button>
              </form>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Google</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {googleConnected
                      ? "Connected to this WOX-Bin account."
                      : initial.googleOAuthAvailable && initial.email
                        ? "Not connected yet."
                        : initial.googleOAuthAvailable
                          ? "Add an email to this account before linking Google."
                          : "Google sign-in is not enabled on this deployment."}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {googleConnected ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {googleConnected ? (
                  <p>
                    Disconnecting Google keeps the current session alive, but future Google sign-ins stop working. A
                    password must already exist before this can be removed.
                  </p>
                ) : initial.googleOAuthAvailable && initial.email ? (
                  <p>
                    To link Google to this account, continue with Google using the same email address already stored on
                    your WOX-Bin account.
                  </p>
                ) : initial.googleOAuthAvailable ? (
                  <p>Google linking needs an account email first. This deployment cannot attach Google to an email-less user.</p>
                ) : (
                  <p>Ask the site operator to configure Google OAuth if you want Google sign-in on this deployment.</p>
                )}

                <div className="flex flex-wrap gap-3">
                  {!googleConnected && initial.googleOAuthAvailable && initial.email ? (
                    <Button type="button" variant="outline" onClick={() => signIn("google", { callbackUrl: "/settings/account" })}>
                      Connect Google
                    </Button>
                  ) : null}

                  {googleConnected ? (
                    <Button
                      disabled={providerLoading || !hasPassword}
                      type="button"
                      variant="outline"
                      onClick={() => void handleDisconnectGoogle()}
                    >
                      {providerLoading ? "Disconnecting…" : "Disconnect Google"}
                    </Button>
                  ) : null}
                </div>

                {!hasPassword && googleConnected ? (
                  <p className="text-xs text-amber-500/90">
                    Create a password in the left panel before Google can be disconnected.
                  </p>
                ) : null}

                {providerError ? <p className="text-sm text-destructive">{providerError}</p> : null}
                {providerStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{providerStatus}</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Discord</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {discordConnected
                      ? "Connected to this WOX-Bin account."
                      : initial.discordOAuthAvailable && initial.email
                        ? "Not connected yet."
                        : initial.discordOAuthAvailable
                          ? "Add an email to this account before linking Discord."
                          : "Discord account linking is not enabled on this deployment."}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {discordConnected ? "Connected" : "Not connected"}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {discordConnected ? (
                  <p>
                    This linked Discord account powers WOX-Bin linked-role verification. Keep a password on this account
                    so you can disconnect Discord safely later if needed.
                  </p>
                ) : initial.discordOAuthAvailable && initial.email ? (
                  <p>
                    Connect Discord using the same email on your WOX-Bin account, then open the linked-roles page to sync
                    your plan, verification state, and account age metadata back to Discord.
                  </p>
                ) : initial.discordOAuthAvailable ? (
                  <p>Discord linking needs an account email first. This deployment cannot attach Discord to an email-less user.</p>
                ) : (
                  <p>Ask the site operator to configure Discord OAuth if you want linked-role verification on this deployment.</p>
                )}

                <div className="flex flex-wrap gap-3">
                  {!discordConnected && initial.discordOAuthAvailable && initial.email ? (
                    <Button type="button" variant="outline" onClick={() => signIn("discord", { callbackUrl: "/settings/account" })}>
                      Connect Discord
                    </Button>
                  ) : null}

                  {discordConnected ? (
                    <Button
                      disabled={discordProviderLoading || !hasPassword}
                      type="button"
                      variant="outline"
                      onClick={() => void handleDisconnectDiscord()}
                    >
                      {discordProviderLoading ? "Disconnecting…" : "Disconnect Discord"}
                    </Button>
                  ) : null}

                  <Button type="button" variant="ghost" onClick={() => (window.location.href = "/discord/linked-roles")}>
                    Open linked roles
                  </Button>
                </div>

                {!hasPassword && discordConnected ? (
                  <p className="text-xs text-amber-500/90">
                    Create a password in the left panel before Discord can be disconnected.
                  </p>
                ) : null}

                {discordProviderError ? <p className="text-sm text-destructive">{discordProviderError}</p> : null}
                {discordProviderStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{discordProviderStatus}</p> : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("settings.account.totpTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {!initial.totpAvailable
                      ? "Authenticator sign-in will appear here after the latest database update is applied."
                      : totpEnabled
                      ? "A 6-digit authenticator code is required after your primary sign-in method."
                      : "Add an authenticator app as a second factor for password, Google, and magic-link sign-in."}
                </p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                {!initial.totpAvailable ? "Not ready" : totpEnabled ? "Enabled" : totpSetup ? "Setup in progress" : "Not enabled"}
              </span>
            </div>

            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              {!initial.totpAvailable ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  Authenticator sign-in needs the latest database schema on this deployment. Once applied, you can scan a QR code here and finish setup with a 6-digit code.
                </div>
              ) : null}

              {totpEnabledAt ? (
                <p>
                  Enabled {new Date(totpEnabledAt).toLocaleString()}
                  {totpLastUsedAt ? ` • last used ${new Date(totpLastUsedAt).toLocaleString()}` : ""}
                </p>
              ) : null}

              {initial.totpAvailable && !totpEnabled && !totpSetup ? (
                <Button disabled={totpLoading} onClick={() => void handleStartTotpSetup()} type="button" variant="outline">
                  {totpLoading ? "Preparing…" : t("settings.account.totpSetup")}
                </Button>
              ) : null}

              {totpSetup ? (
                <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-4">
                  <div className="rounded-2xl border border-border bg-white p-3 text-black" dangerouslySetInnerHTML={{ __html: totpSetup.qrSvg }} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Manual secret</p>
                    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 font-mono text-xs tracking-[0.18em] text-foreground">
                      {totpSetup.secret}
                    </div>
                  </div>
                  <form className="space-y-3" onSubmit={(event) => void handleEnableTotp(event)}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="totp-code">
                        Confirm authenticator code
                      </label>
                      <Input
                        autoComplete="one-time-code"
                        id="totp-code"
                        inputMode="numeric"
                        maxLength={8}
                        onChange={(event) => setTotpCode(event.target.value)}
                        placeholder="123456"
                        value={totpCode}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={totpLoading} type="submit">
                        {totpLoading ? "Enabling…" : t("settings.account.totpEnable")}
                      </Button>
                      <Button
                        disabled={totpLoading}
                        onClick={() => {
                          setTotpSetup(null);
                          setTotpCode("");
                          setTotpStatus(null);
                          setTotpError(null);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}

              {totpEnabled ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <form className="space-y-3 rounded-2xl border border-border bg-background/60 p-4" onSubmit={(event) => void handleDisableTotp(event)}>
                    <p className="text-sm font-medium text-foreground">{t("settings.account.totpDisable")}</p>
                    {hasPassword ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="totp-password">
                          Current password
                        </label>
                        <Input
                          autoComplete="current-password"
                          id="totp-password"
                          onChange={(event) => setTotpPassword(event.target.value)}
                          type="password"
                          value={totpPassword}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground" htmlFor="totp-disable-code">
                            Authenticator code
                          </label>
                          <Input
                            autoComplete="one-time-code"
                            id="totp-disable-code"
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(event) => setTotpDisableCode(event.target.value)}
                            placeholder="123456"
                            value={totpDisableCode}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground" htmlFor="totp-disable-recovery">
                            Or recovery code
                          </label>
                          <Input
                            autoCapitalize="characters"
                            id="totp-disable-recovery"
                            onChange={(event) => setTotpDisableRecoveryCode(event.target.value)}
                            placeholder="ABCDE-12345"
                            value={totpDisableRecoveryCode}
                          />
                        </div>
                      </>
                    )}
                    <Button disabled={totpLoading} type="submit" variant="outline">
                      {totpLoading ? "Disabling…" : t("settings.account.totpDisable")}
                    </Button>
                  </form>

                  <form className="space-y-3 rounded-2xl border border-border bg-background/60 p-4" onSubmit={(event) => void handleRegenerateRecoveryCodes(event)}>
                    <p className="text-sm font-medium text-foreground">{t("settings.account.totpRecovery")}</p>
                    <p className="text-xs text-muted-foreground">
                      Regenerating recovery codes invalidates any old ones. Use your authenticator app code or one remaining recovery code.
                    </p>
                    <Input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={8}
                      onChange={(event) => setTotpRecoveryRegenerateCode(event.target.value)}
                      placeholder="Authenticator code"
                      value={totpRecoveryRegenerateCode}
                    />
                    <Input
                      autoCapitalize="characters"
                      onChange={(event) => setTotpRecoveryRegenerateRecoveryCode(event.target.value)}
                      placeholder="Or recovery code"
                      value={totpRecoveryRegenerateRecoveryCode}
                    />
                    <Button disabled={totpLoading} type="submit" variant="outline">
                      {totpLoading ? "Regenerating…" : "Generate new recovery codes"}
                    </Button>
                  </form>
                </div>
              ) : null}

              {totpRecoveryCodes.length ? (
                <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
                  <p className="text-sm font-semibold text-amber-50">Save these recovery codes now</p>
                  <p className="text-xs text-amber-100/90">
                    Each code can be used once if you lose access to your authenticator app.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {totpRecoveryCodes.map((code) => (
                      <div key={code} className="rounded-lg border border-amber-400/25 bg-black/10 px-3 py-2 font-mono text-xs tracking-[0.18em]">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={copyRecoveryCodes} type="button" variant="secondary">
                      {t("settings.account.totpCopyRecovery")}
                    </Button>
                    <Button onClick={downloadRecoveryCodes} type="button" variant="outline">
                      {t("settings.account.totpDownloadRecovery")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {totpError ? <p className="text-sm text-destructive">{totpError}</p> : null}
              {totpStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{totpStatus}</p> : null}
            </div>
          </div>
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
            {hasPassword ? (
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
