"use client";

import { Loader2, Scissors } from "lucide-react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { useCallback, useId, useState } from "react";
import { zipSync } from "fflate";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

/** Keep ZIP builds bounded for typical browser tab memory. */
const MAX_PAGES = 250;

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export default function PdfSplitClient({ className }: { className?: string }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onFiles = useCallback((incoming: File[]) => {
    const pdf = incoming.find((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    setFile(pdf ?? null);
    setErr(null);
    setInfo(null);
  }, []);

  const splitAllPages = useCallback(async () => {
    if (!file) {
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const n = src.getPageCount();
      if (n === 0) {
        throw new Error("PDF has no pages.");
      }
      if (n > MAX_PAGES) {
        throw new Error(`This PDF has ${n} pages. For browser memory, split is limited to ${MAX_PAGES} pages. Use a desktop tool or split in batches.`);
      }

      const base = file.name.replace(/\.pdf$/i, "") || "document";
      const record: Record<string, Uint8Array> = {};

      for (let i = 0; i < n; i++) {
        const out = await PDFDocument.create();
        const [copied] = await out.copyPages(src, [i]);
        out.addPage(copied);
        const bytes = await out.save();
        const idx = String(i + 1).padStart(String(n).length, "0");
        record[`${base}-page-${idx}.pdf`] = new Uint8Array(bytes);
      }

      const zipped = zipSync(record, { level: 6 });
      downloadBlob(new Blob([new Uint8Array(zipped)], { type: "application/zip" }), `${base}-split-pages.zip`);
      setInfo(`Created ${n} PDFs in a ZIP archive.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Split failed (encrypted PDF?)");
    } finally {
      setBusy(false);
    }
  }, [file]);

  return (
    <div className={cn(TOOLS_CLIENT_NARROW, className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">PDF split</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Split PDF into pages</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Each page becomes its own PDF, packaged in a <span className="font-mono text-xs">.zip</span> (fflate). Runs with pdf-lib in your
          browser. Password-protected PDFs are not supported. Maximum <span className="font-medium text-foreground">{MAX_PAGES}</span> pages
          per run.
        </p>
      </header>

      <FileDropSurface
        className="glass-panel min-h-[min(140px,28dvh)] rounded-xl p-4 sm:min-h-[160px] sm:p-6"
        onFiles={onFiles}
        overlayMessage="Drop one PDF"
      >
        <div className="space-y-4">
          <label htmlFor={inputId}>
            <span className="sr-only">PDF</span>
            <Input
              accept="application/pdf,.pdf"
              className="max-w-md cursor-pointer"
              id={inputId}
              onChange={(e) => e.target.files?.[0] && onFiles([e.target.files[0]])}
              type="file"
            />
          </label>
          {file ? <p className="text-muted-foreground text-sm">{file.name}</p> : <p className="text-muted-foreground text-sm">Choose one PDF file.</p>}
          <Button className="min-h-10 touch-manipulation sm:min-h-9" disabled={!file || busy} onClick={() => void splitAllPages()} type="button">
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Scissors className="mr-2 size-4" />}
            Download ZIP (one PDF per page)
          </Button>
          {err ? <p className="text-destructive text-sm">{err}</p> : null}
          {info ? <p className="text-muted-foreground text-sm">{info}</p> : null}
        </div>
      </FileDropSurface>

      <p className="text-muted-foreground text-center text-xs">
        Merge PDFs:{" "}
        <Link className="text-foreground underline" href="/tools/pdf-merge">
          /tools/pdf-merge
        </Link>
      </p>
    </div>
  );
}
