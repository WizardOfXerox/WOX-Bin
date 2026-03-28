"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Flame, LockKeyhole, ShieldCheck } from "lucide-react";

import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";
import { Badge } from "@/components/ui/badge";
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

type SecretCreateResponse = {
  slug: string;
  shareUrl: string;
  manageUrl: string;
  manageToken: string;
  expiresAt: string | null;
};

export function EncryptedSecretClient() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [expiresPreset, setExpiresPreset] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7-days");
  const [burnAfterRead, setBurnAfterRead] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [copied, setCopied] = useState<"share" | "manage" | null>(null);

  const sizeLabel = useMemo(() => `${new Blob([content]).size.toLocaleString()} bytes`, [content]);

  async function copyValue(kind: "share" | "manage") {
    const value = kind === "share" ? shareUrl : manageUrl;
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function createSecret() {
    setBusy(true);
    setError("");
    setShareUrl("");
    setManageUrl("");

    try {
      if (!content.trim()) {
        setError("Add secret content first.");
        return;
      }

      const key = createShareKey();
      const encrypted = await encryptJsonWithKey(key, {
        title: title.trim() || "Encrypted secret",
        content
      });

      const response = await fetch("/api/public/secrets", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          payloadCiphertext: encrypted.ciphertext,
          payloadIv: encrypted.iv,
          burnAfterRead,
          expiresPreset,
          turnstileToken: readTurnstileToken()
        })
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | SecretCreateResponse | null;
      if (!response.ok || !body || !("shareUrl" in body)) {
        setError(body && "error" in body ? body.error ?? "Could not create the encrypted secret." : "Could not create the encrypted secret.");
        return;
      }

      setShareUrl(`${body.shareUrl}#${key}`);
      setManageUrl(`${body.manageUrl}#${body.manageToken}`);
    } finally {
      resetTurnstileFields();
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-amber-500/12 via-transparent to-rose-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">Zero-knowledge secret</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Encrypt the secret in your browser, then share only the unlock link.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              WOX-Bin stores ciphertext only. The decrypting key lives in the URL fragment, and the sender gets a separate
              management link to revoke or burn the share later.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Title</label>
                <Input onChange={(event) => setTitle(event.target.value)} placeholder="Incident handoff" value={title} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Expiry</label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
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
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Secret content</label>
              <Textarea
                className="min-h-[20rem] font-mono text-[13px]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste credentials, incident notes, or a one-time handoff here."
                value={content}
              />
              <p className="text-xs text-muted-foreground">Current size: {sizeLabel}</p>
            </div>

            <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
              <input
                checked={burnAfterRead}
                className="mt-1 size-4 accent-primary"
                onChange={(event) => setBurnAfterRead(event.target.checked)}
                type="checkbox"
              />
              <span className="leading-snug">
                Burn after first read
                <span className="mt-1 block text-xs text-muted-foreground">
                  After the first successful open, the server copy is deleted.
                </span>
              </span>
            </label>

            <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button disabled={busy || !content.trim()} onClick={() => void createSecret()} type="button">
              {busy ? "Encrypting..." : "Create encrypted secret link"}
            </Button>

            {shareUrl ? (
              <div className="space-y-4 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Secret link</p>
                  <code className="mt-2 block break-all text-xs text-primary/90">{shareUrl}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Manage link</p>
                  <code className="mt-2 block break-all text-xs text-primary/90">{manageUrl}</code>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void copyValue("share")} type="button">
                    {copied === "share" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "share" ? "Copied share link" : "Copy share link"}
                  </Button>
                  <Button onClick={() => void copyValue("manage")} type="button" variant="outline">
                    {copied === "manage" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "manage" ? "Copied manage link" : "Copy manage link"}
                  </Button>
                  <Button asChild type="button" variant="secondary">
                    <a href={shareUrl} rel="noreferrer noopener" target="_blank">
                      Open secret
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">What changes here</p>
                <p className="text-sm text-muted-foreground">This is the encrypted path that the old roadmap was still missing.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                The server stores ciphertext only, not your readable secret.
              </li>
              <li className="flex gap-2">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Burn-after-read and sender-side revoke live on top of the same share.
              </li>
              <li className="flex gap-2">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Keep the manage link separate from the recipient link.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
