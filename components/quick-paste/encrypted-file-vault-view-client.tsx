"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Download, FileLock2, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decryptBytesWithKey, decryptJsonWithKey } from "@/lib/privacy-crypto";
import { formatDate } from "@/lib/utils";

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

type DecryptedMeta = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const UTC_DATE_OPTIONS = { timeZone: "UTC" } satisfies Intl.DateTimeFormatOptions;

export function EncryptedFileVaultViewClient({ slug }: { slug: string }) {
  const [meta, setMeta] = useState<DropMeta | null>(null);
  const [key, setKey] = useState("");
  const [pendingAutoUnlockKey, setPendingAutoUnlockKey] = useState("");
  const [decryptedMeta, setDecryptedMeta] = useState<DecryptedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fragmentKey = window.location.hash.replace(/^#/, "").trim();
    if (fragmentKey) {
      setKey(fragmentKey);
      setPendingAutoUnlockKey(fragmentKey);
    }

    void (async () => {
      const response = await fetch(`/api/public/drops/${encodeURIComponent(slug)}`, {
        cache: "no-store"
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | DropMeta | null;
      if (!response.ok || !body || !("slug" in body)) {
        setError(body && "error" in body ? body.error ?? "Could not load the encrypted vault." : "Could not load the encrypted vault.");
        setLoading(false);
        return;
      }
      setMeta(body);
      setLoading(false);
    })();
  }, [slug]);

  const unlockMeta = useEffectEvent(async (candidate = key) => {
    if (!meta?.metadataCiphertext || !meta.metadataIv) {
      setError("Vault metadata is unavailable.");
      return;
    }

    const trimmedKey = candidate.trim();
    if (!trimmedKey) {
      setError("Paste the fragment key first.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");
    try {
      const payload = await decryptJsonWithKey<DecryptedMeta>(trimmedKey, {
        ciphertext: meta.metadataCiphertext,
        iv: meta.metadataIv
      });
      setDecryptedMeta(payload);
      setStatus("Vault metadata unlocked.");
    } catch {
      setError("That key could not unlock this vault.");
    } finally {
      setBusy(false);
    }
  });

  useEffect(() => {
    if (!meta || !pendingAutoUnlockKey || decryptedMeta) {
      return;
    }

    void unlockMeta(pendingAutoUnlockKey);
    setPendingAutoUnlockKey("");
    // Omit `unlockMeta` from deps: it is from useEffectEvent and must not be listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decryptedMeta, meta, pendingAutoUnlockKey]);

  async function downloadFile() {
    if (!meta?.payloadIv || !decryptedMeta) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/x/${encodeURIComponent(slug)}?download=1`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Could not download the encrypted file.");
      }
      const encryptedBytes = new Uint8Array(await response.arrayBuffer());
      const plainBytes = await decryptBytesWithKey(key.trim(), {
        ciphertext: encryptedBytes,
        iv: meta.payloadIv
      });
      const blob = new Blob([new Uint8Array(plainBytes)], { type: decryptedMeta.mimeType || "application/octet-stream" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = decryptedMeta.filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(href), 2000);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not decrypt the vault file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <FileLock2 className="size-4" />
            Encrypted file vault
          </div>
          <h1 className="break-words text-3xl font-semibold tracking-tight">{decryptedMeta?.filename || "Encrypted file"}</h1>
          {meta ? (
            <p className="text-sm leading-7 text-muted-foreground">
              Created {formatDate(meta.createdAt, UTC_DATE_OPTIONS)} · {NUMBER_FORMATTER.format(meta.viewCount)} open
              {meta.viewCount === 1 ? "" : "s"}
              {meta.expiresAt ? ` · expires ${formatDate(meta.expiresAt, UTC_DATE_OPTIONS)}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading vault...</p> : null}
      {error ? (
        <p
          aria-live="assertive"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}

      {!loading && meta ? (
        decryptedMeta ? (
          <Card>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Filename</p>
                  <p className="mt-2 break-all text-sm text-foreground">{decryptedMeta.filename}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Type</p>
                  <p className="mt-2 break-all text-sm text-foreground">{decryptedMeta.mimeType}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border bg-muted/35 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Size</p>
                  <p className="mt-2 text-sm text-foreground">{NUMBER_FORMATTER.format(decryptedMeta.sizeBytes)} bytes</p>
                </div>
              </div>
              <Button disabled={busy} onClick={() => void downloadFile()} type="button">
                <Download className="size-4" />
                {busy ? "Decrypting..." : "Download decrypted file"}
              </Button>
              {meta.lastViewedAt ? (
                <p className="text-xs text-muted-foreground">
                  Last vault open recorded {formatDate(meta.lastViewedAt, UTC_DATE_OPTIONS)}.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="vault-key">
                  Vault key
                </label>
                <Input
                  id="vault-key"
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="Paste the fragment key"
                  value={key}
                />
              </div>
              <Button disabled={!key.trim() || busy} onClick={() => void unlockMeta()} type="button">
                <Unlock className="size-4" />
                Unlock vault
              </Button>
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}
