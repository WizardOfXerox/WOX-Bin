"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Copy, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decryptJsonWithKey } from "@/lib/privacy-crypto";
import { formatDate } from "@/lib/utils";

type Props = {
  share: {
    slug: string;
    title: string;
    content: string;
    payloadCiphertext: string;
    payloadIv: string;
    createdAt: string;
    expiresAt: string | null;
    viewCount: number;
    burnAfterRead: boolean;
    lastViewedAt: string | null;
  };
};

type DecryptedSecret = {
  title: string;
  content: string;
};

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const UTC_DATE_OPTIONS = { timeZone: "UTC" } satisfies Intl.DateTimeFormatOptions;

export function EncryptedSecretViewClient({ share }: Props) {
  const [key, setKey] = useState("");
  const [decrypted, setDecrypted] = useState<DecryptedSecret | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewCount, setViewCount] = useState(share.viewCount);
  const [lastViewedAt, setLastViewedAt] = useState(share.lastViewedAt);
  const [recordedView, setRecordedView] = useState(false);

  const unlockSecret = useEffectEvent(async (candidate = key) => {
    const trimmedKey = candidate.trim();
    if (!trimmedKey) {
      setError("Paste the fragment key first.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const payload = await decryptJsonWithKey<DecryptedSecret>(trimmedKey, {
        ciphertext: share.payloadCiphertext,
        iv: share.payloadIv
      });
      setDecrypted(payload);

      if (!recordedView) {
        const response = await fetch(`/api/public/secrets/${encodeURIComponent(share.slug)}/view`, {
          method: "POST",
          cache: "no-store"
        });
        const body = (await response.json().catch(() => null)) as
          | { error?: string; viewCount?: number; lastViewedAt?: string | null }
          | null;

        if (response.ok && typeof body?.viewCount === "number") {
          setViewCount(body.viewCount);
          setLastViewedAt(body.lastViewedAt ?? null);
          setRecordedView(true);
        } else {
          setStatus("Secret unlocked, but the open counter could not be synced.");
        }
      }
    } catch {
      setError("That key could not unlock this secret.");
    } finally {
      setBusy(false);
    }
  });

  useEffect(() => {
    const fragmentKey = window.location.hash.replace(/^#/, "").trim();
    if (!fragmentKey) {
      return;
    }

    setKey(fragmentKey);
    void unlockSecret(fragmentKey);
    // Omit `unlockSecret` from deps: it is from useEffectEvent and must not be listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyContent() {
    if (!decrypted?.content) {
      return;
    }
    await navigator.clipboard.writeText(decrypted.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lock className="size-4" />
            Encrypted secret link
          </div>
          <h1 className="break-words text-3xl font-semibold tracking-tight">{decrypted?.title || share.title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Created {formatDate(share.createdAt, UTC_DATE_OPTIONS)} · {NUMBER_FORMATTER.format(viewCount)} open
            {viewCount === 1 ? "" : "s"}
            {share.expiresAt ? ` · expires ${formatDate(share.expiresAt, UTC_DATE_OPTIONS)}` : ""}
            {share.burnAfterRead ? " · burns after first read" : ""}
          </p>
          {lastViewedAt ? (
            <p className="text-xs text-muted-foreground">Last opened {formatDate(lastViewedAt, UTC_DATE_OPTIONS)}.</p>
          ) : null}
        </CardContent>
      </Card>

      {decrypted ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap break-words rounded-[1.25rem] border border-border bg-background/70 px-4 py-4 text-sm leading-7">
              {decrypted.content}
            </div>
            <Button onClick={() => void copyContent()} type="button" variant="outline">
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy secret"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="secret-key">
                Secret key
              </label>
              <Input
                id="secret-key"
                onChange={(event) => setKey(event.target.value)}
                placeholder="Paste the fragment key"
                value={key}
              />
            </div>
            <Button disabled={!key.trim() || busy} onClick={() => void unlockSecret()} type="button">
              <Unlock className="size-4" />
              Unlock secret
            </Button>
            {error ? (
              <p
                aria-live="assertive"
                className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
      {status ? (
        <p aria-live="polite" className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
