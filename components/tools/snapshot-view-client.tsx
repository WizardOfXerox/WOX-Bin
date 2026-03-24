"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { decryptJsonWithKey } from "@/lib/privacy-crypto";
import { formatDate } from "@/lib/utils";

type Props = {
  snapshot: {
    slug: string;
    payloadCiphertext: string;
    payloadIv: string;
    createdAt: string;
    expiresAt: string | null;
    viewCount: number;
  };
};

type DecryptedSnapshot = {
  title: string;
  content: string;
};

export function SnapshotViewClient({ snapshot }: Props) {
  const [key, setKey] = useState(() => (typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "").trim()));
  const [decrypted, setDecrypted] = useState<DecryptedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlockSnapshot() {
    setBusy(true);
    setError("");
    try {
      const payload = await decryptJsonWithKey<DecryptedSnapshot>(key.trim(), {
        ciphertext: snapshot.payloadCiphertext,
        iv: snapshot.payloadIv
      });
      setDecrypted(payload);
    } catch {
      setError("That key could not decrypt this snapshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lock className="size-4" />
            Snapshot
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{decrypted?.title || "Encrypted snapshot"}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Created {formatDate(snapshot.createdAt)} · {snapshot.viewCount.toLocaleString()} view
            {snapshot.viewCount === 1 ? "" : "s"}
            {snapshot.expiresAt ? ` · expires ${formatDate(snapshot.expiresAt)}` : ""}
          </p>
        </CardContent>
      </Card>

      {decrypted ? (
        <Card>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap break-words rounded-[1.25rem] border border-border bg-background/70 px-4 py-4 text-sm leading-7">
              {decrypted.content}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="snapshot-key">
                Snapshot key
              </label>
              <Input
                id="snapshot-key"
                onChange={(event) => setKey(event.target.value)}
                placeholder="Paste the fragment key"
                value={key}
              />
            </div>
            <Button disabled={!key.trim() || busy} onClick={() => void unlockSnapshot()} type="button">
              <Unlock className="size-4" />
              Unlock snapshot
            </Button>
            {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
