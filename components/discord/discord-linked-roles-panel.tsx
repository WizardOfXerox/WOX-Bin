"use client";

import { signIn } from "next-auth/react";
import { RefreshCw, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DiscordLinkedRolesUserSnapshot } from "@/lib/discord/linked-roles";

type Props = {
  initialSnapshot: DiscordLinkedRolesUserSnapshot;
};

function statusPill(enabled: boolean, label: string) {
  return (
    <span
      className={
        enabled
          ? "rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100"
          : "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground"
      }
    >
      {label}
    </span>
  );
}

export function DiscordLinkedRolesPanel({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState<"refresh" | "sync" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refreshSnapshot() {
    setBusy("refresh");
    setError(null);
    try {
      const response = await fetch("/api/discord/linked-roles", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        snapshot?: DiscordLinkedRolesUserSnapshot;
      } | null;
      if (!response.ok || !payload?.snapshot) {
        throw new Error(payload?.error ?? "Could not refresh Discord linked-role status.");
      }
      setSnapshot(payload.snapshot);
      setNotice("Linked-role status refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh Discord linked-role status.");
    } finally {
      setBusy(null);
    }
  }

  async function syncLinkedRoles() {
    setBusy("sync");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/discord/linked-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        snapshot?: DiscordLinkedRolesUserSnapshot;
      } | null;
      if (!response.ok || !payload?.snapshot) {
        throw new Error(payload?.error ?? "Discord linked-role sync failed.");
      }
      setSnapshot(payload.snapshot);
      setNotice(payload.message ?? "Discord linked roles synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discord linked-role sync failed.");
    } finally {
      setBusy(null);
    }
  }

  const canSync =
    snapshot.signedIn &&
    snapshot.connected &&
    snapshot.hasRoleConnectionsWriteScope &&
    snapshot.appConfigured &&
    snapshot.botTokenConfigured;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserCheck className="h-4 w-4 text-primary" />
                Account verification
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Connect your Discord account to WOX-Bin, then sync the metadata Discord can use for linked-role
                requirements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusPill(snapshot.signedIn, snapshot.signedIn ? "Signed in" : "Signed out")}
              {statusPill(snapshot.connected, snapshot.connected ? "Discord connected" : "Not connected")}
              {statusPill(
                snapshot.hasRoleConnectionsWriteScope,
                snapshot.hasRoleConnectionsWriteScope ? "Sync scope granted" : "Reconnect for sync scope"
              )}
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">WOX-Bin account</p>
              {snapshot.user ? (
                <div className="mt-3 space-y-2">
                  <p className="font-medium text-foreground">
                    {snapshot.user.displayName ?? snapshot.user.username ?? snapshot.user.email ?? "WOX-Bin user"}
                  </p>
                  <p>Plan: <span className="text-foreground">{snapshot.user.plan}</span></p>
                  <p>Role: <span className="text-foreground">{snapshot.user.role}</span></p>
                  <p>Email verified: <span className="text-foreground">{snapshot.user.emailVerified ? "Yes" : "No"}</span></p>
                  <p>Profile ready: <span className="text-foreground">{snapshot.user.onboardingComplete ? "Yes" : "No"}</span></p>
                  <p>Teams: <span className="text-foreground">{snapshot.user.teamCount}</span></p>
                </div>
              ) : (
                <p className="mt-3">Sign in to inspect your WOX-Bin account status.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Discord account</p>
              {snapshot.discordAccount ? (
                <div className="mt-3 space-y-2">
                  <p className="font-medium text-foreground">
                    {snapshot.discordAccount.globalName ?? snapshot.discordAccount.username ?? "Connected account"}
                  </p>
                  <p>Discord ID: <span className="font-mono text-foreground">{snapshot.discordAccount.providerAccountId}</span></p>
                  <p>Sync scope: <span className="text-foreground">{snapshot.hasRoleConnectionsWriteScope ? "Granted" : "Missing"}</span></p>
                </div>
              ) : (
                <p className="mt-3">
                  Connect Discord first so WOX-Bin can write linked-role metadata with the <code>role_connections.write</code> scope.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!snapshot.signedIn ? (
              <Button type="button" onClick={() => signIn(undefined, { callbackUrl: "/discord/linked-roles" })}>
                Sign in to verify
              </Button>
            ) : null}
            {snapshot.signedIn && !snapshot.connected && snapshot.oauthReady && snapshot.user?.email ? (
              <Button type="button" onClick={() => signIn("discord", { callbackUrl: "/discord/linked-roles" })}>
                Connect Discord
              </Button>
            ) : null}
            {snapshot.signedIn ? (
              <Button type="button" variant="outline" onClick={() => void refreshSnapshot()} disabled={busy !== null}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {busy === "refresh" ? "Refreshing…" : "Refresh status"}
              </Button>
            ) : null}
            {snapshot.signedIn ? (
              <Button type="button" variant="secondary" onClick={() => void syncLinkedRoles()} disabled={!canSync || busy !== null}>
                <Sparkles className="mr-2 h-4 w-4" />
                {busy === "sync" ? "Syncing…" : "Sync linked roles"}
              </Button>
            ) : null}
          </div>

          {!snapshot.oauthReady ? (
            <p className="text-sm text-amber-500/90">
              Discord OAuth is not configured on this deployment yet. Add <code>AUTH_DISCORD_ID</code> and{" "}
              <code>AUTH_DISCORD_SECRET</code> to enable account linking.
            </p>
          ) : null}
          {snapshot.connected && !snapshot.hasRoleConnectionsWriteScope ? (
            <p className="text-sm text-amber-500/90">
              Your Discord connection is missing <code>role_connections.write</code>. Disconnect Discord from account
              settings, reconnect it, then try syncing again.
            </p>
          ) : null}
          {snapshot.connected && (!snapshot.appConfigured || !snapshot.botTokenConfigured) ? (
            <p className="text-sm text-amber-500/90">
              The site still needs <code>DISCORD_APPLICATION_ID</code> and <code>DISCORD_BOT_TOKEN</code> on the server
              before linked-role metadata can be synchronized.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Linked-role mapping
            </div>
            <div className="space-y-3">
              {snapshot.metadataRecords.map((record) => {
                const currentValue = snapshot.metadataValues?.[record.key as keyof typeof snapshot.metadataValues];

                return (
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3" key={record.key}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{record.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{record.description}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
                        {record.key}
                      </span>
                    </div>
                    <p className="mt-3 font-mono text-xs text-foreground">{currentValue ?? "n/a"}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium">Last synced connection</p>
            {snapshot.remoteConnection ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Platform: <span className="text-foreground">{snapshot.remoteConnection.platformName ?? "WOX-Bin"}</span>
                </p>
                <p>
                  Username:{" "}
                  <span className="text-foreground">{snapshot.remoteConnection.platformUsername ?? "Not set"}</span>
                </p>
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Remote metadata</p>
                  <pre className="mt-3 overflow-x-auto text-xs text-foreground">
                    {JSON.stringify(snapshot.remoteConnection.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                No linked-role connection is stored for this app yet. Sync once after connecting Discord and the current
                WOX-Bin metadata will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
