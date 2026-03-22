"use client";

import { Loader2, Merge } from "lucide-react";
import Link from "next/link";
import { PDFDocument } from "pdf-lib";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

export default function PdfMergeClient({ className }: { className?: string }) {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    setFiles((prev) => [...prev, ...pdfs]);
    setErr(null);
  }, []);

  const merge = useCallback(async () => {
    if (files.length < 2) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const out = await PDFDocument.create();
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const src = await PDFDocument.load(buf);
        const copied = await out.copyPages(src, src.getPageIndices());
        copied.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "merged.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Merge failed (encrypted PDF?)");
    } finally {
      setBusy(false);
    }
  }, [files]);

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
        <span className="font-medium text-foreground">PDF merge</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Merge PDFs</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Concatenate multiple PDFs in order with pdf-lib. Encrypted/password PDFs may fail. Split one PDF into pages:{" "}
          <Link className="text-foreground underline" href="/tools/pdf-split">
            /tools/pdf-split
          </Link>
          .
        </p>
      </header>

      <FileDropSurface
        className="glass-panel min-h-[min(140px,28dvh)] rounded-xl p-4 sm:min-h-[160px] sm:p-6"
        onFiles={onFiles}
        overlayMessage="Drop PDFs"
      >
        <div className="space-y-4">
          <label htmlFor={inputId}>
            <span className="sr-only">PDFs</span>
            <Input
              accept="application/pdf,.pdf"
              className="max-w-md cursor-pointer"
              id={inputId}
              multiple
              onChange={(e) => e.target.files && onFiles([...e.target.files])}
              type="file"
            />
          </label>
          {files.length > 0 ? (
            <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
              {files.map((f) => (
                <li key={f.name + f.size}>{f.name}</li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">Add at least two PDF files.</p>
          )}
          <div className="flex flex-wrap gap-2 touch-manipulation">
            <Button className="min-h-10 sm:min-h-9" disabled={files.length < 2 || busy} onClick={() => void merge()} type="button">
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Merge className="mr-2 size-4" />}
              Download merged.pdf
            </Button>
            <Button className="min-h-10 sm:min-h-9" disabled={files.length === 0} onClick={() => setFiles([])} type="button" variant="ghost">
              Clear
            </Button>
          </div>
        </div>
      </FileDropSurface>

      {err ? <p className="text-destructive text-sm">{err}</p> : null}

      <p className="text-muted-foreground text-center text-xs">
        For page images &amp; text export see <Link href="/tools/pdf-extract">PDF page extractor</Link>.
      </p>
    </div>
  );
}
