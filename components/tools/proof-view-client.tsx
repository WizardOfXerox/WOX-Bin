"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileDigit, ShieldEllipsis, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sha256Hex, sha256Text } from "@/lib/privacy-crypto";
import { formatDate } from "@/lib/utils";

type Props = {
  proof: {
    slug: string;
    label: string;
    algorithm: string;
    digestHex: string;
    note: string | null;
    createdAt: string;
  };
};

export function ProofViewClient({ proof }: Props) {
  const [mode, setMode] = useState<"text" | "file">("text");
  const [textValue, setTextValue] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [verification, setVerification] = useState<"match" | "mismatch" | "idle">("idle");
  const [computedDigest, setComputedDigest] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selectedFileRef = useRef<File | null>(null);

  async function verifyCurrent() {
    let digest = "";
    if (mode === "text") {
      if (!textValue.trim()) {
        return;
      }
      digest = await sha256Text(textValue);
    } else if (selectedFileRef.current) {
      digest = await sha256Hex(await selectedFileRef.current.arrayBuffer());
    } else {
      return;
    }

    setComputedDigest(digest);
    setVerification(digest === proof.digestHex ? "match" : "mismatch");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldEllipsis className="size-4" />
            Proof receipt
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{proof.label}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Recorded {formatDate(proof.createdAt)} · algorithm {proof.algorithm.toUpperCase()}
          </p>
          {proof.note ? <p className="text-sm leading-7 text-muted-foreground">{proof.note}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">Stored digest</p>
            <code className="block break-all rounded-[1.25rem] border border-border bg-background/70 px-4 py-3 text-sm">
              {proof.digestHex}
            </code>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode("text")} type="button" variant={mode === "text" ? "secondary" : "outline"}>
                Verify text
              </Button>
              <Button onClick={() => setMode("file")} type="button" variant={mode === "file" ? "secondary" : "outline"}>
                Verify file
              </Button>
            </div>

            {mode === "text" ? (
              <Textarea onChange={(event) => setTextValue(event.target.value)} placeholder="Paste the text you want to compare." value={textValue} />
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
                <Button onClick={() => fileRef.current?.click()} type="button" variant="outline">
                  <FileDigit className="size-4" />
                  Choose file
                </Button>
                <p className="text-sm text-muted-foreground">{selectedFileName || "No file selected yet."}</p>
              </div>
            )}

            <Button onClick={() => void verifyCurrent()} type="button">
              Verify against receipt
            </Button>

            {computedDigest ? (
              <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Computed digest</p>
                <code className="mt-2 block break-all text-xs">{computedDigest}</code>
              </div>
            ) : null}

            {verification === "match" ? (
              <p className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                <CheckCircle2 className="size-4" />
                This input matches the proof receipt exactly.
              </p>
            ) : null}

            {verification === "mismatch" ? (
              <p className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">
                <XCircle className="size-4" />
                The digest does not match this proof receipt.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
