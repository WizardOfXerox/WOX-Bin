"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Clipboard,
  Copy,
  ExternalLink,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeOptionalSlug } from "@/lib/utils";

type ClipboardBucketResponse = {
  slug: string;
  content: string;
  expiresAt: string | null;
  burnAfterRead: boolean;
  viewCount: number;
  canManage: boolean;
};

const EXPIRY_PRESETS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" }
] as const;

function tokenStorageKey(slug: string) {
  return `woxbin:clipboard-token:${slug}`;
}

function selectExpiryPreset(expiresAt: string | null) {
  if (!expiresAt) {
    return "24";
  }

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  const remainingHours = Math.max(1, Math.round(remainingMs / (60 * 60 * 1000)));
  const preset = EXPIRY_PRESETS.reduce((best, option) => {
    const currentDistance = Math.abs(Number(option.value) - remainingHours);
    const bestDistance = Math.abs(Number(best.value) - remainingHours);
    return currentDistance < bestDistance ? option : best;
  }, EXPIRY_PRESETS[1]);

  return preset.value;
}

export function ClipboardBucketClient({ slug }: { slug: string }) {
  const normalizedSlug = useMemo(() => normalizeOptionalSlug(slug).slice(0, 48), [slug]);
  const [bucket, setBucket] = useState<ClipboardBucketResponse | null>(null);
  const [content, setContent] = useState("");
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [expiresHours, setExpiresHours] = useState<(typeof EXPIRY_PRESETS)[number]["value"]>("24");
  const [manageToken, setManageToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!normalizedSlug || typeof window === "undefined") {
      setLoading(false);
      setMissing(true);
      return;
    }

    const storedToken = window.localStorage.getItem(tokenStorageKey(normalizedSlug)) ?? "";
    void loadBucket(storedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSlug]);

  async function loadBucket(token = "") {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/public/clipboard/${encodeURIComponent(normalizedSlug)}`, {
      headers: token ? { "x-manage-token": token } : undefined,
      cache: "no-store"
    });

    if (response.status === 404) {
      setBucket(null);
      setMissing(true);
      setManageToken("");
      setContent("");
      setBurnAfterRead(false);
      setExpiresHours("24");
      setLoading(false);
      return null;
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | ClipboardBucketResponse | null;
    if (!response.ok || !body || !("slug" in body)) {
      setError(body && "error" in body ? body.error ?? "Could not load the clipboard bucket." : "Could not load the clipboard bucket.");
      setLoading(false);
      return null;
    }

    if (body.canManage && token) {
      setManageToken(token);
      setTokenInput("");
      window.localStorage.setItem(tokenStorageKey(normalizedSlug), token);
    } else if (!body.canManage && token) {
      window.localStorage.removeItem(tokenStorageKey(normalizedSlug));
      setManageToken("");
    }

    setBucket(body);
    setMissing(false);
    setContent(body.content);
    setBurnAfterRead(body.burnAfterRead);
    setExpiresHours(selectExpiryPreset(body.expiresAt));
    setLoading(false);
    return body;
  }

  async function saveBucket() {
    setSaving(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/public/clipboard/${encodeURIComponent(normalizedSlug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content,
        burnAfterRead,
        expires: expiresHours,
        token: manageToken || undefined
      })
    });

    const body = (await response.json().catch(() => null)) as
      | {
          error?: string;
          slug?: string;
          url?: string;
          expiresAt?: string | null;
          created?: boolean;
          manageToken?: string | null;
        }
      | null;

    if (!response.ok || !body?.slug || !body.url) {
      setError(body?.error ?? "Could not save the clipboard bucket.");
      setSaving(false);
      return;
    }

    const nextToken = body.manageToken?.trim() || manageToken;
    if (nextToken) {
      setManageToken(nextToken);
      window.localStorage.setItem(tokenStorageKey(normalizedSlug), nextToken);
    }

    setStatus(body.created ? "Clipboard bucket created." : "Clipboard bucket updated.");
    await loadBucket(nextToken);
    setSaving(false);
  }

  async function deleteBucket() {
    if (!manageToken || !window.confirm(`Delete clipboard bucket "${normalizedSlug}"?`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/public/clipboard/${encodeURIComponent(normalizedSlug)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token: manageToken })
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(body?.error ?? "Could not delete the clipboard bucket.");
      setDeleting(false);
      return;
    }

    window.localStorage.removeItem(tokenStorageKey(normalizedSlug));
    setBucket(null);
    setMissing(true);
    setManageToken("");
    setContent("");
    setBurnAfterRead(false);
    setExpiresHours("24");
    setStatus("Clipboard bucket deleted.");
    setDeleting(false);
  }

  async function unlockEditing() {
    const token = tokenInput.trim();
    if (!token) {
      setError("Enter the manage token first.");
      return;
    }

    const nextBucket = await loadBucket(token);
    if (nextBucket?.canManage) {
      setStatus("Manage token accepted.");
      return;
    }

    setError("That token does not unlock this bucket.");
  }

  async function copyBucketUrl() {
    await navigator.clipboard.writeText(`${window.location.origin}/c/${normalizedSlug}`);
    setStatus("Bucket URL copied.");
  }

  async function copyBucketContent() {
    await navigator.clipboard.writeText(content);
    setStatus("Bucket content copied.");
  }

  async function copyManageToken() {
    if (!manageToken) {
      return;
    }
    await navigator.clipboard.writeText(manageToken);
    setStatus("Manage token copied.");
  }

  const isManageable = missing || Boolean(bucket?.canManage);
  const infoBadge = missing ? "Available key" : bucket?.canManage ? "Manage mode" : "Read-only";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-emerald-500/12 via-transparent to-cyan-500/12 px-6 py-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="px-3 py-1 text-xs">Clipboard bucket</Badge>
              <Badge className="border-border bg-transparent px-3 py-1 text-xs text-muted-foreground">{infoBadge}</Badge>
            </div>
            <h1 className="mt-4 break-all text-3xl font-semibold tracking-tight sm:text-4xl">{normalizedSlug}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Use this short key for temporary cross-device handoff. The creator gets a local manage token for edits and
              deletion. Readers only need the bucket URL.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            {loading ? <p className="text-sm text-muted-foreground">Loading bucket...</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

            {!normalizedSlug ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                This bucket key is invalid. Use letters, numbers, dashes, or underscores.
              </div>
            ) : null}

            {bucket && !bucket.canManage ? (
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-sm font-medium text-foreground">This bucket already exists.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can read and copy the content below. To edit or delete it, unlock manage mode with the original token.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Input
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder="Paste the manage token"
                    type="password"
                    value={tokenInput}
                  />
                  <Button onClick={() => void unlockEditing()} type="button" variant="outline">
                    <LockKeyhole className="h-4 w-4" />
                    Unlock editing
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Status</p>
                <p className="mt-2 text-sm text-foreground">
                  {missing ? "Free to claim" : bucket?.burnAfterRead ? "One-time or self-destructing" : "Active"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Views</p>
                <p className="mt-2 text-sm text-foreground">{bucket?.viewCount ?? 0}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Expires</p>
                <p className="mt-2 text-sm text-foreground">
                  {bucket?.expiresAt ? new Date(bucket.expiresAt).toLocaleString() : missing ? "When you create it" : "No expiry"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Content</label>
              <Textarea
                className="min-h-[22rem] font-mono text-[13px]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste text, commands, notes, or a temporary handoff message."
                readOnly={!missing && !bucket?.canManage}
                value={content}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Expiry</label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                  disabled={!isManageable}
                  onChange={(event) => setExpiresHours(event.target.value as (typeof EXPIRY_PRESETS)[number]["value"])}
                  value={expiresHours}
                >
                  {EXPIRY_PRESETS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                <input
                  checked={burnAfterRead}
                  className="mt-1 size-4 accent-primary"
                  disabled={!isManageable}
                  onChange={(event) => setBurnAfterRead(event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-snug">
                  Burn after read
                  <span className="mt-1 block text-xs text-muted-foreground">
                    The first reader without the manage token consumes and deletes the bucket.
                  </span>
                </span>
              </label>
            </div>

            {manageToken ? (
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Manage token stored on this device</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Keep a copy if you want to edit or delete the bucket from another browser.
                    </p>
                  </div>
                  <Button onClick={() => void copyManageToken()} type="button" variant="outline">
                    <KeyRound className="h-4 w-4" />
                    Copy token
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={!normalizedSlug || saving || !content.trim() || (!missing && !bucket?.canManage)} onClick={() => void saveBucket()} type="button">
                {saving ? "Saving..." : missing ? "Create bucket" : "Save bucket"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button disabled={loading || !content.trim()} onClick={() => void copyBucketContent()} type="button" variant="outline">
                <Copy className="h-4 w-4" />
                Copy content
              </Button>
              <Button disabled={!normalizedSlug} onClick={() => void copyBucketUrl()} type="button" variant="outline">
                <ExternalLink className="h-4 w-4" />
                Copy URL
              </Button>
              <Button disabled={loading} onClick={() => void loadBucket(manageToken)} type="button" variant="ghost">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                disabled={!bucket?.canManage || deleting}
                onClick={() => void deleteBucket()}
                type="button"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clipboard className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Bucket behavior</p>
                <p className="text-sm text-muted-foreground">This mode is designed for fast text transfer, not long-term storage.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Anyone with the link can read the bucket. Only the holder of the manage token can change or delete it.
              </li>
              <li className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                If you enable burn-after-read, the first normal read deletes the bucket after serving the content once.
              </li>
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                The manage token is stored only in this browser. Copy it before you switch devices.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Related routes</p>
            <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/clipboard">
              <span>Choose another bucket key</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/quick">
              <span>Quick paste</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/fragment">
              <span>Fragment share</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
