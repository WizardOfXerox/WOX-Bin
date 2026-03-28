"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FileLock2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createShareKey, encryptBytesWithKey, encryptJsonWithKey } from "@/lib/privacy-crypto";

const EXPIRY_OPTIONS = [
  { value: "24", label: "1 day" },
  { value: "168", label: "7 days" },
  { value: "720", label: "30 days" }
] as const;

type VaultCreateResponse = {
  slug: string;
  shareUrl: string;
  rawUrl: string;
  manageUrl: string;
  manageToken: string;
  expiresAt: string | null;
};

export function EncryptedFileVaultClient() {
  const [file, setFile] = useState<File | null>(null);
  const [expires, setExpires] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("168");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [copied, setCopied] = useState<"share" | "manage" | null>(null);

  async function copyValue(kind: "share" | "manage") {
    const value = kind === "share" ? shareUrl : manageUrl;
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function createVault() {
    setBusy(true);
    setError("");
    setShareUrl("");
    setManageUrl("");

    try {
      if (!file) {
        setError("Choose a file first.");
        return;
      }

      const key = createShareKey();
      const encryptedBytes = await encryptBytesWithKey(key, await file.arrayBuffer());
      const uploadBytes = new Uint8Array(encryptedBytes.ciphertext);
      const encryptedMeta = await encryptJsonWithKey(key, {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size
      });

      const formData = new FormData();
      formData.set("file", new File([uploadBytes], "encrypted.bin", { type: "application/octet-stream" }));
      formData.set("expires", expires);
      formData.set("metadataCiphertext", encryptedMeta.ciphertext);
      formData.set("metadataIv", encryptedMeta.iv);
      formData.set("payloadIv", encryptedBytes.iv);

      const response = await fetch("/api/public/vaults", {
        method: "POST",
        body: formData
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | VaultCreateResponse | null;
      if (!response.ok || !body || !("shareUrl" in body)) {
        setError(body && "error" in body ? body.error ?? "Could not create the encrypted file vault." : "Could not create the encrypted file vault.");
        return;
      }

      setShareUrl(`${body.shareUrl}#${key}`);
      setManageUrl(`${body.manageUrl}#${body.manageToken}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-sky-500/12 via-transparent to-cyan-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">Encrypted file vault</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Encrypt a file locally, upload ciphertext, and hand off only the unlock link.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This flow keeps the original file name and MIME type inside encrypted metadata. WOX-Bin stores only encrypted
              bytes plus the sender’s management token.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Choose file</label>
                <Input
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <p className="text-xs text-muted-foreground">
                  Max 4 MB. Selected: {file ? `${file.name} (${file.size.toLocaleString()} bytes)` : "none"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Expiry</label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                  onChange={(event) => setExpires(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])}
                  value={expires}
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button disabled={busy || !file} onClick={() => void createVault()} type="button">
              <Upload className="size-4" />
              {busy ? "Encrypting..." : "Create encrypted vault link"}
            </Button>

            {shareUrl ? (
              <div className="space-y-4 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Vault link</p>
                  <code className="mt-2 block break-all text-xs text-primary/90">{shareUrl}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Manage link</p>
                  <code className="mt-2 block break-all text-xs text-primary/90">{manageUrl}</code>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void copyValue("share")} type="button">
                    {copied === "share" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "share" ? "Copied vault link" : "Copy vault link"}
                  </Button>
                  <Button onClick={() => void copyValue("manage")} type="button" variant="outline">
                    {copied === "manage" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "manage" ? "Copied manage link" : "Copy manage link"}
                  </Button>
                  <Button asChild type="button" variant="secondary">
                    <a href={shareUrl} rel="noreferrer noopener" target="_blank">
                      Open vault
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <FileLock2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Why this exists</p>
              <p className="text-sm text-muted-foreground">The old roadmap called out encrypted file handoff as the next step after object storage.</p>
            </div>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            Use this instead of plain public file drops when the filename or bytes themselves should stay unreadable to the
            server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
