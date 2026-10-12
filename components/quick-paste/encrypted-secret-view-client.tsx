"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Copy, Eye, EyeOff, Key, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decryptJsonWithKey, deriveKeyWithSalt } from "@/lib/privacy-crypto";
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
  const [isPassphraseMode, setIsPassphraseMode] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [salt, setSalt] = useState("");
  const [decrypted, setDecrypted] = useState<DecryptedSecret | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewCount, setViewCount] = useState(share.viewCount);
  const [lastViewedAt, setLastViewedAt] = useState(share.lastViewedAt);
  const [recordedView, setRecordedView] = useState(false);

  const syncViewCount = useEffectEvent(async () => {
    if (recordedView) return;
    try {
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
    } catch {
      // view count sync is best effort
    }
  });

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
      void syncViewCount();
    } catch {
      setError("That key could not unlock this secret.");
    } finally {
      setBusy(false);
    }
  });

  const unlockWithPassphrase = useEffectEvent(async () => {
    const trimmedPass = passphrase.trim();
    if (!trimmedPass) {
      setError("Enter the secret passphrase first.");
      return;
    }
    if (!salt.trim()) {
      setError("Missing key derivation salt. Re-check the share link.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("");

    try {
      const derivedKey = await deriveKeyWithSalt(trimmedPass, salt.trim());
      const payload = await decryptJsonWithKey<DecryptedSecret>(derivedKey, {
        ciphertext: share.payloadCiphertext,
        iv: share.payloadIv
      });
      setDecrypted(payload);
      void syncViewCount();
    } catch {
      setError("Incorrect passphrase or corrupt secret payload.");
    } finally {
      setBusy(false);
    }
  });

  useEffect(() => {
    const fragmentKey = window.location.hash.replace(/^#/, "").trim();
    if (!fragmentKey) {
      return;
    }

    if (fragmentKey.startsWith("p:")) {
      setIsPassphraseMode(true);
      setSalt(fragmentKey.slice(2));
    } else {
      setKey(fragmentKey);
      void unlockSecret(fragmentKey);
    }
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
            {isPassphraseMode ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lock className="size-4 text-primary" /> Passphrase required
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This secret is protected by a passphrase. Enter the passphrase to derive the decrypt key locally.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="secret-passphrase">
                    Secret passphrase
                  </label>
                  <div className="relative">
                    <Input
                      autoFocus
                      className="pr-10"
                      id="secret-passphrase"
                      onChange={(event) => setPassphrase(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && passphrase.trim() && !busy) {
                          void unlockWithPassphrase();
                        }
                      }}
                      placeholder="Enter passphrase..."
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      tabIndex={-1}
                      type="button"
                    >
                      {showPassphrase ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {!salt ? (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground" htmlFor="secret-salt">
                      Derivation salt (optional if in URL)
                    </label>
                    <Input
                      id="secret-salt"
                      onChange={(event) => setSalt(event.target.value)}
                      placeholder="Salt from fragment"
                      value={salt}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button disabled={!passphrase.trim() || busy} onClick={() => void unlockWithPassphrase()} type="button">
                    <Unlock className="size-4" />
                    {busy ? "Deriving key..." : "Unlock secret"}
                  </Button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => {
                      setIsPassphraseMode(false);
                      setError("");
                    }}
                    type="button"
                  >
                    Have a raw key instead?
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="secret-key">
                    Secret key
                  </label>
                  <Input
                    autoFocus
                    id="secret-key"
                    onChange={(event) => setKey(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && key.trim() && !busy) {
                        void unlockSecret();
                      }
                    }}
                    placeholder="Paste the fragment key"
                    value={key}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Button disabled={!key.trim() || busy} onClick={() => void unlockSecret()} type="button">
                    <Unlock className="size-4" />
                    {busy ? "Decrypting..." : "Unlock secret"}
                  </Button>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    onClick={() => {
                      setIsPassphraseMode(true);
                      setError("");
                    }}
                    type="button"
                  >
                    Protected by passphrase?
                  </button>
                </div>
              </>
            )}

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
