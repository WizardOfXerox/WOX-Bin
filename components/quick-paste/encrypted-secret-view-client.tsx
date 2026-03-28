"use client";

import { useState } from "react";
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

export function EncryptedSecretViewClient({ share }: Props) {
  const [key, setKey] = useState(() => (typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "").trim()));
  const [decrypted, setDecrypted] = useState<DecryptedSecret | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function unlock() {
    setBusy(true);
    setError("");
    try {
      const payload = await decryptJsonWithKey<DecryptedSecret>(key.trim(), {
        ciphertext: share.payloadCiphertext,
        iv: share.payloadIv
      });
      setDecrypted(payload);
    } catch {
      setError("That key could not unlock this secret.");
    } finally {
      setBusy(false);
    }
  }

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
          <h1 className="text-3xl font-semibold tracking-tight">{decrypted?.title || share.title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Created {formatDate(share.createdAt)} · {share.viewCount.toLocaleString()} open{share.viewCount === 1 ? "" : "s"}
            {share.expiresAt ? ` · expires ${formatDate(share.expiresAt)}` : ""}
            {share.burnAfterRead ? " · burns after first read" : ""}
          </p>
          {share.lastViewedAt ? (
            <p className="text-xs text-muted-foreground">Last opened {formatDate(share.lastViewedAt)}.</p>
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
            <Button disabled={!key.trim() || busy} onClick={() => void unlock()} type="button">
              <Unlock className="size-4" />
              Unlock secret
            </Button>
            {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
