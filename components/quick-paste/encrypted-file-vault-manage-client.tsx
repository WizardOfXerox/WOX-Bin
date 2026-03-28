"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { AlertCircle, KeyRound, ShieldBan, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { value: "24", label: "1 day" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" }
] as const;

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const UTC_DATE_OPTIONS = { timeZone: "UTC" } satisfies Intl.DateTimeFormatOptions;

type DropMeta = {
  slug: string;
  kind: "text" | "file";
  filename: string | null;
  mimeType: string;
  sizeBytes: number;
  encrypted: boolean;
  payloadCiphertext: string | null;
  payloadIv: string | null;
  metadataCiphertext: string | null;
  metadataIv: string | null;
  burnAfterRead: boolean;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  canManage: boolean;
};

export function EncryptedFileVaultManageClient({ slug }: { slug: string }) {
  const [token, setToken] = useState("");
  const [meta, setMeta] = useState<DropMeta | null>(null);
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("168");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadMeta = useEffectEvent(async (nextToken = token) => {
    if (!nextToken.trim()) {
      setError("Enter the management token first.");
      return;
    }

    setLoading(true);
    setError("");
    const response = await fetch(`/api/public/drops/${encodeURIComponent(slug)}`, {
      headers: {
        "x-manage-token": nextToken.trim()
      },
      cache: "no-store"
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | DropMeta | null;
    if (!response.ok || !body || !("slug" in body)) {
      setError(body && "error" in body ? body.error ?? "Could not load the vault status." : "Could not load the vault status.");
      setLoading(false);
      return;
    }

    setMeta(body);
    setStatus("");
    setLoading(false);
  });

  useEffect(() => {
    const fragmentToken = window.location.hash.replace(/^#/, "").trim();
    if (!fragmentToken) {
      return;
    }

    setToken(fragmentToken);
    void loadMeta(fragmentToken);
    // Omit `loadMeta` from deps: it is from useEffectEvent and must not be listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: "revoke" | "update_expiry") {
    if (!token.trim()) {
      setError("Enter the management token first.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    const response = await fetch(`/api/public/drops/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        token: token.trim(),
        action,
        expires: action === "update_expiry" ? expiry : undefined
      })
    });
    const body = (await response.json().catch(() => null)) as { error?: string; expiresAt?: string } | null;
    if (!response.ok) {
      setError(body?.error ?? "Could not update the vault.");
      setBusy(false);
      return;
    }

    if (action === "revoke") {
      setMeta((current) => (current ? null : current));
      setStatus("Vault revoked.");
    } else {
      setStatus("Expiry updated.");
      await loadMeta(token);
    }

    setBusy(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vault control</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Manage encrypted file vault</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Use the sender token to inspect expiry and revoke the vault without sharing the decrypting key.
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
            <Button disabled={!token.trim() || loading} onClick={() => void loadMeta()} type="button" variant="outline">
              <KeyRound className="size-4" />
              {loading ? "Loading..." : "Load status"}
            </Button>
            <Button disabled={!token.trim() || busy} onClick={() => void runAction("revoke")} type="button" variant="destructive">
              <ShieldBan className="size-4" />
              Revoke vault
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

          {meta ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Type</p>
                <p className="mt-2 text-sm text-foreground">{meta.encrypted ? "Encrypted vault" : "Plain drop"}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Opens</p>
                <p className="mt-2 text-sm text-foreground">{meta.viewCount}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                <p className="mt-2 text-sm text-foreground">{formatDate(meta.createdAt, UTC_DATE_OPTIONS)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Expires</p>
                <p className="mt-2 text-sm text-foreground">
                  {meta.expiresAt ? formatDate(meta.expiresAt, UTC_DATE_OPTIONS) : "Never"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Encrypted bytes</p>
                <p className="mt-2 text-sm text-foreground">{NUMBER_FORMATTER.format(meta.sizeBytes)} bytes</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last opened</p>
                <p className="mt-2 text-sm text-foreground">
                  {meta.lastViewedAt ? formatDate(meta.lastViewedAt, UTC_DATE_OPTIONS) : "Not yet opened"}
                </p>
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
              <p className="font-medium text-foreground">Sender-side only</p>
              <p className="text-sm text-muted-foreground">Keep the vault token away from recipients.</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            The recipient only needs the vault URL with its fragment key. The management token is for revoke and expiry control.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
