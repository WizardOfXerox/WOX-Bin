"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { AlertCircle, Flame, KeyRound, ShieldBan, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { value: "1-day", label: "1 day" },
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "never", label: "Never" }
] as const;

const UTC_DATE_OPTIONS = { timeZone: "UTC" } satisfies Intl.DateTimeFormatOptions;

type Snapshot = {
  slug: string;
  status: "active" | "deleted" | "hidden";
  viewCount: number;
  burnAfterRead: boolean;
  createdAt: string;
  expiresAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
  lastViewedAt: string | null;
};

export function EncryptedSecretManageClient({ slug }: { slug: string }) {
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7-days");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadSnapshot = useEffectEvent(async (nextToken = token) => {
    if (!nextToken.trim()) {
      setError("Enter the management token first.");
      return;
    }

    setLoading(true);
    setError("");
    const response = await fetch(`/api/public/secrets/${encodeURIComponent(slug)}/manage`, {
      headers: {
        "x-manage-token": nextToken.trim()
      },
      cache: "no-store"
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | Snapshot | null;
    if (!response.ok || !body || !("slug" in body)) {
      setError(body && "error" in body ? body.error ?? "Could not load the secret status." : "Could not load the secret status.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setStatus("");
    setLoading(false);
  });

  useEffect(() => {
    const fragmentToken = window.location.hash.replace(/^#/, "").trim();
    if (!fragmentToken) {
      return;
    }

    setToken(fragmentToken);
    void loadSnapshot(fragmentToken);
    // Omit `loadSnapshot` from deps: it is from useEffectEvent and must not be listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: "revoke" | "burn_now" | "update_expiry") {
    if (!token.trim()) {
      setError("Enter the management token first.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    const response = await fetch(`/api/public/secrets/${encodeURIComponent(slug)}/manage`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        token: token.trim(),
        action,
        expiresPreset: action === "update_expiry" ? expiry : undefined
      })
    });
    const body = (await response.json().catch(() => null)) as { error?: string; status?: string } | null;
    if (!response.ok) {
      setError(body?.error ?? "Could not update the secret link.");
      setBusy(false);
      return;
    }

    if (action === "update_expiry") {
      setStatus("Expiry updated.");
      await loadSnapshot(token);
    } else {
      setSnapshot((current) =>
        current
          ? {
              ...current,
              status: "deleted",
              deletedAt: new Date().toISOString()
            }
          : current
      );
      setStatus(action === "burn_now" ? "Secret burned." : "Secret revoked.");
    }

    setBusy(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Secret control</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Manage encrypted secret link</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Use the separate management token to check status, change expiry, or revoke the share without opening it.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Management token</label>
            <Input
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste the manage token"
              type="password"
              value={token}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={!token.trim() || loading} onClick={() => void loadSnapshot()} type="button" variant="outline">
              <KeyRound className="size-4" />
              {loading ? "Loading..." : "Load status"}
            </Button>
            <Button disabled={!token.trim() || busy} onClick={() => void runAction("burn_now")} type="button" variant="secondary">
              <Flame className="size-4" />
              Burn now
            </Button>
            <Button disabled={!token.trim() || busy} onClick={() => void runAction("revoke")} type="button" variant="destructive">
              <ShieldBan className="size-4" />
              Revoke link
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Update expiry</label>
              <select
                className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                onChange={(event) => setExpiry(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])}
                value={expiry}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={!token.trim() || busy} onClick={() => void runAction("update_expiry")} type="button">
                <TimerReset className="size-4" />
                Save expiry
              </Button>
            </div>
          </div>

          {error ? (
            <p aria-live="assertive" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
              {status}
            </p>
          ) : null}

          {snapshot ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</p>
                <p className="mt-2 text-sm text-foreground">{snapshot.status}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Opens</p>
                <p className="mt-2 text-sm text-foreground">{snapshot.viewCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                <p className="mt-2 text-sm text-foreground">{formatDate(snapshot.createdAt, UTC_DATE_OPTIONS)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Expires</p>
                <p className="mt-2 text-sm text-foreground">
                  {snapshot.expiresAt ? formatDate(snapshot.expiresAt, UTC_DATE_OPTIONS) : "Never"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last opened</p>
                <p className="mt-2 text-sm text-foreground">
                  {snapshot.lastViewedAt ? formatDate(snapshot.lastViewedAt, UTC_DATE_OPTIONS) : "Not yet opened"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Burn rule</p>
                <p className="mt-2 text-sm text-foreground">{snapshot.burnAfterRead ? "Burn after first read" : "Manual revoke only"}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Keep this separate</p>
              <p className="text-sm text-muted-foreground">The recipient should never receive the manage token.</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            This page gives you sender-side status and emergency controls without needing to open the actual secret link.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
