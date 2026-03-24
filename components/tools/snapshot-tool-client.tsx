"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createShareKey, encryptJsonWithKey } from "@/lib/privacy-crypto";

const EXPIRY_OPTIONS = [
  { value: "1-day", label: "1 day" },
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "never", label: "Never" }
] as const;

export function SnapshotToolClient() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresPreset, setExpiresPreset] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7-days");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const sizeLabel = useMemo(() => `${new Blob([content]).size} bytes`, [content]);

  async function createSnapshot() {
    setBusy(true);
    setError("");
    setShareUrl("");
    try {
      if (!content.trim()) {
        setError("Add snapshot content first.");
        return;
      }
      const key = createShareKey();
      const encrypted = await encryptJsonWithKey(key, {
        title: title.trim() || "Untitled snapshot",
        content
      });

      const response = await fetch("/api/privacy/snapshots", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          payloadCiphertext: encrypted.ciphertext,
          payloadIv: encrypted.iv,
          expiresPreset
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error || "Snapshot could not be created.");
        return;
      }

      setShareUrl(`${payload.url}#${key}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lock className="size-4" />
            Encrypted snapshot
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Freeze a secure text snapshot and share only the decrypting link.</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            The snapshot payload is encrypted in your browser before upload. WOX-Bin stores only ciphertext. The share
            key lives in the URL fragment and never reaches the server.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="snapshot-title">
                Title
              </label>
              <Input id="snapshot-title" onChange={(event) => setTitle(event.target.value)} placeholder="Incident notes" value={title} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="snapshot-expiry">
                Expiry
              </label>
              <select
                className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                id="snapshot-expiry"
                onChange={(event) => setExpiresPreset(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])}
                value={expiresPreset}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="snapshot-content">
              Snapshot content
            </label>
            <Textarea id="snapshot-content" onChange={(event) => setContent(event.target.value)} placeholder="Paste the text you want to freeze." value={content} />
            <p className="text-xs text-muted-foreground">Current size: {sizeLabel}</p>
          </div>

          <Button disabled={busy} onClick={() => void createSnapshot()} type="button">
            Create encrypted snapshot
          </Button>

          {shareUrl ? (
            <div className="space-y-3 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
              <p className="text-sm font-medium">Snapshot ready</p>
              <code className="block break-all text-xs text-primary/90">{shareUrl}</code>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void copyLink()} type="button">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <a href={shareUrl} rel="noreferrer noopener" target="_blank">
                    Open snapshot
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
