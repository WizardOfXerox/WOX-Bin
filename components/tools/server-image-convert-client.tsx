"use client";

import { AlertTriangle, Loader2, Server } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import type { SharpEncodeSlug } from "@/lib/convert/sharp-formats";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

const ENCODE_LABEL: Record<SharpEncodeSlug, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  avif: "AVIF",
  tiff: "TIFF",
  gif: "GIF",
  heif: "HEIF"
};

export type ServerImageConvertClientProps = {
  fromSlug: string;
  toSlug: string;
  pairLabel: string;
  className?: string;
};

export default function ServerImageConvertClient({ fromSlug, toSlug, pairLabel, className }: ServerImageConvertClientProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toNorm = toSlug.toLowerCase() === "jpg" ? "jpeg" : toSlug.toLowerCase();

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setErr(null);
  }, []);

  const run = useCallback(async () => {
    if (!file) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("to", toNorm);
      const res = await fetch("/api/convert/image", {
        method: "POST",
        body: fd
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, "") || "out"}.${toNorm === "jpeg" ? "jpg" : toNorm}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  }, [file, toNorm]);

  return (
    <div className={cn(TOOLS_CLIENT_NARROW, className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">{pairLabel}</span>
      </nav>

      <header className={cn(TOOLS_CLIENT_HEADER, "space-y-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Server · sharp</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{pairLabel}</h1>
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            This conversion runs on the <strong>WOX-Bin server</strong> using sharp (libvips). Your file is processed in memory for this
            request only — we don’t store it. For private-only work, use a browser tool when available (e.g. PNG/JPEG/WebP in{" "}
            <Link className="underline" href="/tools/image-convert">
              Image converter
            </Link>
            ).
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Expected input family: <span className="font-mono text-foreground/90">{fromSlug}</span> · Target:{" "}
          <span className="font-mono text-foreground/90">{ENCODE_LABEL[toNorm as SharpEncodeSlug] ?? toNorm}</span> · Max ~12 MB (configurable via{" "}
          <span className="font-mono">CONVERT_IMAGE_MAX_BYTES</span>).
        </p>
      </header>

      <FileDropSurface
        className="glass-panel min-h-[min(180px,32dvh)] rounded-xl p-4 sm:min-h-[200px] sm:p-6"
        onFiles={onFiles}
        overlayMessage="Drop image file"
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Many RAW/TIFF/HEIC/PSD-style inputs work when your server&apos;s libvips build supports them. If conversion fails, try another
            format or use the reference link on the worker placeholder page.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={inputId}>
              <span className="sr-only">File</span>
              <Input className="max-w-md cursor-pointer" id={inputId} onChange={(e) => e.target.files && onFiles([...e.target.files])} type="file" />
            </label>
            <Button className="min-h-10 touch-manipulation sm:min-h-9" disabled={!file || busy} onClick={() => void run()} type="button">
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Server className="mr-2 size-4" />
              )}
              Convert & download
            </Button>
          </div>
          {err ? <p className="text-destructive text-sm">{err}</p> : null}
        </div>
      </FileDropSurface>
    </div>
  );
}
