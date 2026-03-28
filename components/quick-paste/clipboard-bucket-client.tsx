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
import { createShareKey, decryptJsonWithKey, encryptJsonWithKey } from "@/lib/privacy-crypto";
import { formatDate, normalizeOptionalSlug } from "@/lib/utils";

type ClipboardBucketResponse = {
  slug: string;
  content: string;
  expiresAt: string | null;
  burnAfterRead: boolean;
  viewCount: number;
  canManage: boolean;
  encrypted: boolean;
  payloadCiphertext: string | null;
  payloadIv: string | null;
  lastViewedAt: string | null;
};

type ClipboardBucketMissingResponse = {
  slug: string;
  missing: true;
};

const EXPIRY_PRESETS = [
  { value: "1", label: "1 hour" },
  { value: "24", label: "24 hours" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" }
] as const;

const UTC_DATE_OPTIONS = { timeZone: "UTC" } satisfies Intl.DateTimeFormatOptions;

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

function isMissingBucketResponse(
  value: ClipboardBucketResponse | ClipboardBucketMissingResponse | { error?: string } | null
): value is ClipboardBucketMissingResponse {
  return Boolean(value && "missing" in value && value.missing);
}

function isClipboardBucketResponse(
  value: ClipboardBucketResponse | ClipboardBucketMissingResponse | { error?: string } | null
): value is ClipboardBucketResponse {
  return Boolean(value && "canManage" in value);
}

export function ClipboardBucketClient({ slug }: { slug: string }) {
  const normalizedSlug = useMemo(() => normalizeOptionalSlug(slug).slice(0, 48), [slug]);
  const [bucket, setBucket] = useState<ClipboardBucketResponse | null>(null);
  const [content, setContent] = useState("");
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [expiresHours, setExpiresHours] = useState<(typeof EXPIRY_PRESETS)[number]["value"]>("24");
  const [manageToken, setManageToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [encryptedMode, setEncryptedMode] = useState(false);
  const [shareKey, setShareKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
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

    const fragmentKey = window.location.hash.replace(/^#/, "").trim();
    if (fragmentKey) {
      setShareKey(fragmentKey);
      setKeyInput(fragmentKey);
    }

    const storedToken = window.localStorage.getItem(tokenStorageKey(normalizedSlug)) ?? "";
    void loadBucket(storedToken, fragmentKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSlug]);

  async function decryptClipboardPayload(
    response: ClipboardBucketResponse,
    secretKey: string
  ) {
    if (!response.payloadCiphertext || !response.payloadIv) {
      throw new Error("Encrypted bucket payload is unavailable.");
    }

    const payload = await decryptJsonWithKey<{ content: string }>(secretKey, {
      ciphertext: response.payloadCiphertext,
      iv: response.payloadIv
    });
    return payload.content;
  }

  async function loadBucket(token = "", fragmentKey = shareKey || keyInput) {
    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/public/clipboard/${encodeURIComponent(normalizedSlug)}`, {
      headers: token ? { "x-manage-token": token } : undefined,
      cache: "no-store"
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | ClipboardBucketResponse
      | ClipboardBucketMissingResponse
      | null;

    if (response.ok && isMissingBucketResponse(body)) {
      window.localStorage.removeItem(tokenStorageKey(normalizedSlug));
      setBucket(null);
      setMissing(true);
      setManageToken("");
      setContent("");
      setBurnAfterRead(false);
      setExpiresHours("24");
      setEncryptedMode(false);
      setStatus(`"${normalizedSlug}" is free to claim.`);
      setLoading(false);
      return null;
    }

    if (!response.ok || !isClipboardBucketResponse(body)) {
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
    setEncryptedMode(body.encrypted);
    setBurnAfterRead(body.burnAfterRead);
    setExpiresHours(selectExpiryPreset(body.expiresAt));

    if (body.encrypted) {
      if (fragmentKey.trim()) {
        try {
          const decrypted = await decryptClipboardPayload(body, fragmentKey.trim());
          setContent(decrypted);
          setShareKey(fragmentKey.trim());
          setKeyInput(fragmentKey.trim());
          setStatus("Unlocked clipboard bucket with the fragment key.");
        } catch {
          setContent("");
          setStatus("Clipboard bucket is encrypted. Paste the fragment key to read or edit it.");
        }
      } else {
        setContent("");
        setStatus("Clipboard bucket is encrypted. Paste the fragment key to read or edit it.");
      }
    } else {
      setContent(body.content);
      if (!body.canManage) {
        setStatus(null);
      }
    }

    setLoading(false);
    return body;
  }

  async function saveBucket() {
    setSaving(true);
    setError(null);
    setStatus(null);

    let payloadCiphertext: string | null = null;
    let payloadIv: string | null = null;
    let nextKey = shareKey || keyInput;

    if (encryptedMode) {
      if (!content.trim()) {
        setError("Encrypted clipboard buckets still need content.");
        setSaving(false);
        return;
      }
      if (!nextKey.trim()) {
        nextKey = createShareKey();
      }
      const encrypted = await encryptJsonWithKey(nextKey, {
        content
      });
      payloadCiphertext = encrypted.ciphertext;
      payloadIv = encrypted.iv;
    }

    const response = await fetch(`/api/public/clipboard/${encodeURIComponent(normalizedSlug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content,
        burnAfterRead,
        expires: expiresHours,
        token: manageToken || undefined,
        encrypted: encryptedMode,
        payloadCiphertext,
        payloadIv
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

    if (encryptedMode && nextKey.trim() && typeof window !== "undefined") {
      setShareKey(nextKey.trim());
      setKeyInput(nextKey.trim());
      window.history.replaceState(null, "", `/c/${normalizedSlug}#${nextKey.trim()}`);
    } else if (!encryptedMode && typeof window !== "undefined") {
      setShareKey("");
      setKeyInput("");
      window.history.replaceState(null, "", `/c/${normalizedSlug}`);
    }

    setStatus(body.created ? "Clipboard bucket created." : "Clipboard bucket updated.");
    await loadBucket(nextToken, nextKey.trim());
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

    await loadBucket(token);
  }

  async function unlockEncryptedContent() {
    const nextKey = keyInput.trim();
    if (!bucket?.encrypted || !nextKey) {
      setError("Enter the fragment key first.");
      return;
    }

    try {
      const decrypted = await decryptClipboardPayload(bucket, nextKey);
      setContent(decrypted);
      setShareKey(nextKey);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/c/${normalizedSlug}#${nextKey}`);
      }
      setError(null);
      setStatus("Unlocked clipboard bucket.");
    } catch {
      setError("That fragment key could not unlock this clipboard bucket.");
    }
  }

  async function copyBucketUrl() {
    const suffix = encryptedMode && shareKey ? `#${shareKey}` : "";
    await navigator.clipboard.writeText(`${window.location.origin}/c/${normalizedSlug}${suffix}`);
    setStatus("Copied clipboard bucket URL.");
  }

  async function copyBucketContent() {
    await navigator.clipboard.writeText(content);
    setStatus("Copied clipboard bucket content.");
  }

  async function copyManageToken() {
    await navigator.clipboard.writeText(manageToken);
    setStatus("Copied the manage token.");
  }

  const isManageable = missing || bucket?.canManage;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-emerald-500/12 via-transparent to-cyan-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">{missing ? "Available key" : bucket?.canManage ? "Manage mode" : "Read-only"}</Badge>
            <h1 className="mt-4 break-all text-3xl font-semibold tracking-tight sm:text-4xl">{normalizedSlug}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Use this short key for temporary cross-device handoff. The creator gets a local manage token for edits and
              deletion, and you can optionally keep the content client-side encrypted with a fragment key.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            {!missing && !bucket?.canManage ? (
              <div className="rounded-[1.25rem] border border-border bg-muted/20 px-4 py-4">
                <p className="text-sm font-medium text-foreground">Read-only view</p>
                <p className="mt-1 text-sm text-muted-foreground">
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
                  {missing ? "Free to claim" : bucket?.burnAfterRead ? "One-time or self-destructing" : bucket?.encrypted ? "Encrypted" : "Active"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Views</p>
                <p className="mt-2 text-sm text-foreground">{bucket?.viewCount ?? 0}</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Expires</p>
                <p className="mt-2 text-sm text-foreground">
                  {bucket?.expiresAt ? formatDate(bucket.expiresAt, UTC_DATE_OPTIONS) : missing ? "When you create it" : "No expiry"}
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
              <input
                checked={encryptedMode}
                className="mt-1 size-4 accent-primary"
                disabled={!isManageable}
                onChange={(event) => setEncryptedMode(event.target.checked)}
                type="checkbox"
              />
              <span className="leading-snug">
                Encrypt this bucket in the browser
                <span className="mt-1 block text-xs text-muted-foreground">
                  Keeps the bucket content as ciphertext on the server and puts the decrypting key in the URL fragment.
                </span>
              </span>
            </label>

            {encryptedMode ? (
              <div className="space-y-3 rounded-[1.25rem] border border-border bg-muted/20 px-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Fragment key</label>
                  <Input
                    onChange={(event) => setKeyInput(event.target.value)}
                    placeholder="Paste the fragment key or leave blank to generate one"
                    value={keyInput}
                  />
                </div>
                {bucket?.encrypted && !content ? (
                  <Button onClick={() => void unlockEncryptedContent()} type="button" variant="outline">
                    <KeyRound className="h-4 w-4" />
                    Unlock encrypted bucket
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Content</label>
              <Textarea
                className="min-h-[22rem] font-mono text-[13px]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste text, commands, notes, or a temporary handoff message."
                readOnly={!isManageable}
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

            <div className="flex flex-wrap gap-3">
              <Button disabled={!normalizedSlug || saving || !content.trim() || !isManageable} onClick={() => void saveBucket()} type="button">
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
                Encrypted buckets keep the plaintext out of server storage, but recipients still need the fragment key.
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
              <span>Quick share hub</span>
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
