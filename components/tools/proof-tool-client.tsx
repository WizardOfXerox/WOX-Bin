"use client";

import { useRef, useState } from "react";
import { Check, Copy, ExternalLink, FileDigit, ShieldEllipsis } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sha256Hex, sha256Text } from "@/lib/privacy-crypto";

export function ProofToolClient() {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [textValue, setTextValue] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [digest, setDigest] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selectedFileRef = useRef<File | null>(null);

  async function computeDigest() {
    setError("");
    setCreatedUrl("");
    if (mode === "text") {
      if (!textValue.trim()) {
        setError("Enter text first.");
        return "";
      }
      const next = await sha256Text(textValue);
      setDigest(next);
      return next;
    }

    if (!selectedFileRef.current) {
      setError("Choose a file first.");
      return "";
    }
    const buffer = await selectedFileRef.current.arrayBuffer();
    const next = await sha256Hex(buffer);
    setDigest(next);
    return next;
  }

  async function createProof() {
    setBusy(true);
    try {
      const digestHex = digest || (await computeDigest());
      if (!digestHex) {
        return;
      }
      const response = await fetch("/api/privacy/proofs", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          label: label.trim() || (mode === "file" ? selectedFileName || "Untitled proof" : "Untitled proof"),
          digestHex,
          note
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error || "Proof could not be created.");
        return;
      }
      setCreatedUrl(payload.url);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!createdUrl) {
      return;
    }
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldEllipsis className="size-4" />
            Proof receipts
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Hash something now, then share a timestamped verification page.</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            WOX-Bin computes the SHA-256 digest in your browser, then stores a lightweight proof receipt containing the
            digest, label, note, and timestamp. No file contents are uploaded.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMode("text")} type="button" variant={mode === "text" ? "secondary" : "outline"}>
              Text proof
            </Button>
            <Button onClick={() => setMode("file")} type="button" variant={mode === "file" ? "secondary" : "outline"}>
              File proof
            </Button>
          </div>

          {mode === "text" ? (
            <Textarea
              onChange={(event) => setTextValue(event.target.value)}
              placeholder="Paste the text you want to fingerprint."
              value={textValue}
            />
          ) : (
            <div className="space-y-3 rounded-[1.25rem] border border-border bg-background/60 p-4">
              <input
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  selectedFileRef.current = file;
                  setSelectedFileName(file?.name ?? "");
                }}
                ref={fileRef}
                type="file"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => fileRef.current?.click()} type="button" variant="outline">
                  <FileDigit className="size-4" />
                  Choose file
                </Button>
                <span className="text-sm text-muted-foreground">{selectedFileName || "No file selected yet."}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="proof-label">
                Label
              </label>
              <Input id="proof-label" onChange={(event) => setLabel(event.target.value)} placeholder="Release package v2.0.0" value={label} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="proof-note">
                Note
              </label>
              <Input id="proof-note" onChange={(event) => setNote(event.target.value)} placeholder="Optional context for the receipt" value={note} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => void computeDigest()} type="button" variant="outline">
              Compute SHA-256
            </Button>
            <Button disabled={busy} onClick={() => void createProof()} type="button">
              Create proof page
            </Button>
          </div>

          {digest ? (
            <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Digest</p>
              <code className="mt-2 block break-all text-sm text-foreground">{digest}</code>
            </div>
          ) : null}

          {createdUrl ? (
            <div className="space-y-3 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Proof receipt ready</p>
              <code className="block break-all text-xs text-primary/90">{createdUrl}</code>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void copyLink()} type="button">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <a href={createdUrl} rel="noreferrer noopener" target="_blank">
                    Open receipt
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
