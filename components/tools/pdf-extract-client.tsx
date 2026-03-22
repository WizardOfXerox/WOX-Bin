"use client";

import type { Zippable } from "fflate";
import { ChevronLeft, ChevronRight, FileText, FolderOpen, ImageIcon, Loader2, Maximize2, Minus, Plus, Rows3, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { dpiToRenderScale, DPI_PRESETS } from "@/lib/pdf-extract/dpi";
import { formatPageRangeHint, parsePageRange } from "@/lib/pdf-extract/page-range";
import { PDFJS_CDN_LEGACY_MAIN, PDFJS_CDN_LEGACY_WORKER } from "@/lib/pdfjs-cdn";
import {
  defaultPdfExtractSettings,
  loadPdfExtractSettings,
  type ExportPackageMode,
  savePdfExtractSettings,
  type PdfExtractStoredSettings
} from "@/lib/pdf-extract/settings-storage";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

/** Narrow type for the PDF.js namespace loaded from CDN (avoids bundling `pdfjs-dist`). */
type PdfJsFromCdn = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (opts: { data: Uint8Array }) => { promise: Promise<PdfDocumentProxy> };
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageProxy>;
  destroy?: () => void;
};

type PdfRenderTask = { promise: Promise<void>; cancel?: () => void };

/** PDF.js forbids overlapping render() on the same canvas — cancel + await before starting another. */
async function drainPdfCanvasRender(ref: MutableRefObject<PdfRenderTask | null>): Promise<void> {
  const t = ref.current;
  ref.current = null;
  if (!t) {
    return;
  }
  t.cancel?.();
  try {
    await t.promise;
  } catch {
    /* RenderingCancelledException or similar */
  }
}

type PdfPageProxy = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => PdfRenderTask;
  getTextContent: () => Promise<{ items: unknown[] }>;
  cleanup: () => void;
};

/** Scale to fit the preview container (PDF.js page size at scale 1). */
function fitScaleForContainer(
  container: HTMLDivElement | null,
  pageW: number,
  pageH: number,
  fitMode: "width" | "page"
): number | null {
  if (!container || pageW <= 0 || pageH <= 0) {
    return null;
  }
  const pad = 24;
  const cw = Math.max(40, container.clientWidth - pad);
  const ch = Math.max(40, container.clientHeight - pad);
  if (fitMode === "width") {
    return cw / pageW;
  }
  return Math.min(cw / pageW, ch / pageH);
}

type PdfSourceItem = { id: string; file: File; name: string };

type ImageFormat = "png" | "jpeg";

let pdfjsPromise: Promise<PdfJsFromCdn> | null = null;

async function loadPdfJs(): Promise<PdfJsFromCdn> {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* webpackIgnore: true */ PDFJS_CDN_LEGACY_MAIN).then((m) => {
      const pdfjs = m as PdfJsFromCdn;
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_CDN_LEGACY_WORKER;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function slugifyBase(name: string): string {
  const base = name.replace(/\.pdf$/i, "").trim() || "document";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "pdf-export";
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, jpegQuality: number): Promise<Blob> {
  const type = format === "png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not encode image."));
        }
      },
      type,
      format === "jpeg" ? jpegQuality : undefined
    );
  });
}

function textFromPdfTextContent(items: { str?: string }[]): string {
  return items.map((i) => (typeof i.str === "string" ? i.str : "")).join("");
}

function capDocxImageDims(width: number, height: number, maxW = 720): { width: number; height: number } {
  if (width <= maxW) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const r = maxW / width;
  return { width: Math.round(maxW), height: Math.round(height * r) };
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) {
    return false;
  }
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export default function PdfExtractClient() {
  const searchParams = useSearchParams();
  const inputId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageSize1Ref = useRef({ w: 0, h: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRenderTaskRef = useRef<PdfRenderTask | null>(null);

  const [items, setItems] = useState<PdfSourceItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"files" | "pages">("files");

  const [pdfDoc, setPdfDoc] = useState<PdfDocumentProxy | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [previewScale, setPreviewScale] = useState(1);
  const [fitMode, setFitMode] = useState<"none" | "width" | "page">("width");

  const [settings, setSettings] = useState<PdfExtractStoredSettings>(() =>
    typeof window !== "undefined" ? loadPdfExtractSettings() : { ...defaultPdfExtractSettings }
  );

  /* Deep-link export preset from /tools/c/pdf-* routes: ?export=png-zip|jpeg-zip|txt-zip|docx */
  useEffect(() => {
    const exp = searchParams.get("export");
    if (exp === "png-zip" || exp === "jpeg-zip" || exp === "txt-zip" || exp === "docx") {
      setSettings((s) => ({ ...s, exportMode: exp }));
    }
  }, [searchParams]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [queueLog, setQueueLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    if (arr.length === 0) {
      return;
    }
    setItems((prev) => [
      ...prev,
      ...arr.map((file) => ({
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name
      }))
    ]);
    setError(null);
    setPdfLoadError(null);
  }, []);

  /* Fix active id when adding files: set to first new item */
  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !items.some((i) => i.id === activeId)) {
      setActiveId(items[items.length - 1]!.id);
    }
  }, [items, activeId]);

  useEffect(() => {
    savePdfExtractSettings(settings);
  }, [settings]);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  /* Load PDF for active file */
  useEffect(() => {
    let cancelled = false;
    let inFlight: PdfDocumentProxy | null = null;

    setPdfLoadError(null);
    setCurrentPage(1);
    pageSize1Ref.current = { w: 0, h: 0 };

    if (!activeItem) {
      setPdfDoc(null);
      return;
    }

    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const data = new Uint8Array(await activeItem.file.arrayBuffer());
        inFlight = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          inFlight.destroy?.();
          return;
        }
        const loaded = inFlight;
        inFlight = null;
        setPdfDoc(loaded);
      } catch (e) {
        if (!cancelled) {
          setPdfLoadError(e instanceof Error ? e.message : "Could not open PDF.");
          setPdfDoc(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      inFlight?.destroy?.();
    };
  }, [activeItem]);

  const recomputeFit = useCallback(() => {
    const container = containerRef.current;
    const { w: pw, h: ph } = pageSize1Ref.current;
    if (fitMode === "none" || !container || pw <= 0 || ph <= 0) {
      return;
    }
    const s = fitScaleForContainer(container, pw, ph, fitMode);
    if (s != null) {
      setPreviewScale(s);
    }
  }, [fitMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => {
      if (fitMode === "width" || fitMode === "page") {
        recomputeFit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitMode, recomputeFit]);

  /* Main preview render — scale for fit modes is computed synchronously so the first frame
   * isn’t drawn with a stale `previewScale` (fixes glitched layout until zoom/page change).
   * Always drain the previous PdfRenderTask before render() — PDF.js errors if the same canvas
   * is used while a prior render is still active (e.g. rapid scale updates, Strict Mode). */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await drainPdfCanvasRender(previewRenderTaskRef);
      if (cancelled) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas || !pdfDoc) {
        return;
      }

      const pageIndex = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
      if (pageIndex !== currentPage) {
        setCurrentPage(pageIndex);
      }

      const page = await pdfDoc.getPage(pageIndex);
      if (cancelled) {
        page.cleanup();
        return;
      }

      const vp1 = page.getViewport({ scale: 1 });
      pageSize1Ref.current = { w: vp1.width, h: vp1.height };

      let scaleForDraw = previewScale;
      if (fitMode === "width" || fitMode === "page") {
        const fitted = fitScaleForContainer(containerRef.current, vp1.width, vp1.height, fitMode);
        if (fitted != null) {
          scaleForDraw = fitted;
        }
      }

      const viewport = page.getViewport({ scale: scaleForDraw });
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        page.cleanup();
        return;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (cancelled) {
        page.cleanup();
        return;
      }

      const rt = page.render({ canvas, canvasContext: ctx, viewport });
      previewRenderTaskRef.current = rt;

      try {
        await rt.promise;
      } catch {
        /* RenderTask.cancel() rejects — treat as aborted. */
      } finally {
        if (previewRenderTaskRef.current === rt) {
          previewRenderTaskRef.current = null;
        }
      }

      if (cancelled) {
        page.cleanup();
        return;
      }

      page.cleanup();

      if (fitMode === "width" || fitMode === "page") {
        setPreviewScale((prev) => (Math.abs(prev - scaleForDraw) > 1e-5 ? scaleForDraw : prev));
      }
    })();

    return () => {
      cancelled = true;
      const t = previewRenderTaskRef.current;
      if (t) {
        t.cancel?.();
        void t.promise.catch(() => {
          /* swallow unhandled rejection from cancel */
        });
      }
    };
  }, [pdfDoc, currentPage, previewScale, fitMode]);

  useEffect(() => {
    if ((fitMode === "width" || fitMode === "page") && pdfDoc) {
      recomputeFit();
    }
  }, [currentPage, pdfDoc, fitMode, recomputeFit]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentPage((p) => (pdfDoc ? Math.min(pdfDoc.numPages, p + 1) : p));
  }, [pdfDoc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        return;
      }
      if (e.ctrlKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
      }
      if (e.key === "End" && pdfDoc) {
        e.preventDefault();
        setCurrentPage(pdfDoc.numPages);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext, pdfDoc]);

  const runExport = useCallback(async () => {
    if (items.length === 0) {
      return;
    }

    const targets = settings.exportScope === "all" ? items : activeItem ? [activeItem] : [];

    if (targets.length === 0) {
      setError("Add a PDF, or switch export scope to “All loaded files”.");
      return;
    }

    setError(null);
    setBusy(true);
    setQueueLog([]);
    setProgress("Loading PDF engine…");

    const pushLog = (line: string) => {
      setQueueLog((q) => [...q.slice(-40), line]);
    };

    try {
      const pdfjs = await loadPdfJs();
      const { strToU8, zipSync } = await import("fflate");

      const exportScale = dpiToRenderScale(settings.exportDpi);
      const jpegQ = settings.jpegQualityPercent / 100;
      const imageFormat: ImageFormat = settings.exportMode === "jpeg-zip" ? "jpeg" : "png";
      const ext = imageFormat === "png" ? "png" : "jpg";

      const archive: Zippable = {};

      const renderPageToCanvas = async (page: PdfPageProxy, scale: number) => {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas 2D context not available.");
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        return canvas;
      };

      for (const item of targets) {
        const base = slugifyBase(item.name);
        const prefix = targets.length > 1 ? `${base}/` : "";

        setProgress(`Opening ${item.name}…`);
        pushLog(`Open: ${item.name}`);
        const data = new Uint8Array(await item.file.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data }).promise;

        const pages = parsePageRange(settings.pageRange, pdf.numPages);
        if (pages.length === 0) {
          pdf.destroy?.();
          throw new Error("No pages match the page range. Try “all” or e.g. 1-3, 5.");
        }

        const textParts: string[] = [];

        if (settings.exportMode === "docx") {
          const {
            Document,
            Packer,
            Paragraph,
            ImageRun,
            TextRun,
            PageBreak,
            AlignmentType
          } = await import("docx");
          const docChildren: InstanceType<typeof Paragraph>[] = [];

          for (let idx = 0; idx < pages.length; idx += 1) {
            const p = pages[idx]!;
            setProgress(`DOCX ${item.name} — page ${idx + 1} / ${pages.length}…`);
            const page = await pdf.getPage(p);
            const canvas = await renderPageToCanvas(page, exportScale);
            const blob = await canvasToBlob(canvas, "png", jpegQ);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const dims = capDocxImageDims(canvas.width, canvas.height);

            if (idx > 0) {
              docChildren.push(new Paragraph({ children: [new PageBreak()] }));
            }

            docChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    type: "png",
                    data: bytes,
                    transformation: { width: dims.width, height: dims.height }
                  })
                ]
              })
            );

            if (settings.includeTextInDocx) {
              const textContent = await page.getTextContent();
              const txt = textFromPdfTextContent(textContent.items as { str?: string }[]).trim();
              if (txt) {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: txt })]
                  })
                );
              }
            }

            page.cleanup();
            pushLog(`  Page ${p} → DOCX block`);
          }

          const doc = new Document({
            sections: [
              {
                children: docChildren
              }
            ],
            title: base
          });

          const blobOut = await Packer.toBlob(doc);
          const key =
            targets.length > 1 ? `${prefix}${base}-export.docx` : `${base}-export.docx`;
          archive[key] = [new Uint8Array(await blobOut.arrayBuffer()), { level: 0 as const }];
          pdf.destroy?.();
          continue;
        }

        for (let i = 0; i < pages.length; i += 1) {
          const p = pages[i]!;
          setProgress(`${item.name} — page ${i + 1} / ${pages.length}…`);
          const page = await pdf.getPage(p);

          if (settings.exportMode === "png-zip" || settings.exportMode === "jpeg-zip") {
            const canvas = await renderPageToCanvas(page, exportScale);
            const blob = await canvasToBlob(canvas, imageFormat, jpegQ);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            archive[`${prefix}${base}-page-${String(p).padStart(3, "0")}.${ext}`] = [bytes, { level: 0 as const }];
            pushLog(`  Page ${p} → ${ext.toUpperCase()}`);
          }

          if (settings.exportMode === "txt-zip" || settings.includePerPageText) {
            const textContent = await page.getTextContent();
            const text = textFromPdfTextContent(textContent.items as { str?: string }[]);
            if (text.trim()) {
              archive[`${prefix}${base}-page-${String(p).padStart(3, "0")}.txt`] = strToU8(text);
            }
            if (settings.combinedTextFile) {
              textParts.push(`--- Page ${p} ---\n${text}`);
            }
          }

          page.cleanup();
        }

        if (settings.combinedTextFile && textParts.length > 0) {
          archive[`${prefix}${base}-all-pages.txt`] = strToU8(textParts.join("\n\n"));
        }

        pdf.destroy?.();
      }

      const archiveKeys = Object.keys(archive);
      if (settings.exportMode === "docx" && archiveKeys.length === 1) {
        const onlyKey = archiveKeys[0]!;
        const entry = archive[onlyKey];
        if (entry && Array.isArray(entry)) {
          const u8 = entry[0] as Uint8Array;
          const out = new Blob([new Uint8Array(u8)], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          });
          const url = URL.createObjectURL(out);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${slugifyBase(targets[0]!.name)}-export.docx`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setProgress("Done — DOCX downloaded.");
        pushLog("Complete.");
        return;
      }

      setProgress("Building ZIP…");
      pushLog("Zipping…");
      const zipped = zipSync(archive, { level: 0 });
      const out = new Blob([new Uint8Array(zipped)], { type: "application/zip" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      const zipName =
        targets.length > 1 ? `pdf-extract-batch-${targets.length}-files.zip` : `${slugifyBase(targets[0]!.name)}-extract.zip`;
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(url);
      setProgress(`Done — ${targets.length} file(s).`);
      pushLog("Complete.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed.";
      setError(msg);
      setProgress(null);
      pushLog(`Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [items, activeItem, settings]);

  return (
    <div className={TOOLS_CLIENT_WIDE}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation text-foreground hover:underline" href="/">
          Home
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="touch-manipulation hover:underline" href="/archive">
          Archive
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">PDF extract</span>
      </nav>

      <FileDropSurface
        activeClassName="rounded-xl ring-2 ring-primary/20"
        className="flex flex-col gap-6"
        disabled={busy}
        onFiles={(files) => addFiles(files)}
        overlayClassName="rounded-xl"
        overlayMessage="Drop PDF files here"
      >
      <header className={cn(TOOLS_CLIENT_HEADER, "space-y-2 sm:space-y-3")}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          Browser tool
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">PDF page extractor</h1>
        <p className="text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7">
          Preview PDFs, pick pages and DPI, then export PNG / JPEG / TXT (ZIP) or a single DOCX — inspired by{" "}
          <a
            className="text-foreground underline-offset-4 hover:underline"
            href="https://github.com/amvprosox/prosecs-pdf-extractor"
            rel="noopener noreferrer"
            target="_blank"
          >
            Prosecs PDF Extractor
          </a>
          , running locally in your browser (nothing uploaded to our servers).{" "}
          <span className="font-medium text-foreground/90">Drag &amp; drop PDFs</span> onto this panel to import.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,240px)_1fr]">
        {/* Sidebar */}
        <aside className="glass-panel flex flex-col overflow-hidden">
          <div className="flex border-b border-border">
            <button
              className={cn(
                "min-h-10 flex-1 touch-manipulation px-3 py-2 text-xs font-medium transition sm:min-h-0",
                sidebarTab === "files" ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setSidebarTab("files")}
              type="button"
            >
              Files
            </button>
            <button
              className={cn(
                "min-h-10 flex-1 touch-manipulation px-3 py-2 text-xs font-medium transition sm:min-h-0",
                sidebarTab === "pages" ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              disabled={!pdfDoc}
              onClick={() => setSidebarTab("pages")}
              type="button"
            >
              Pages
            </button>
          </div>

          {sidebarTab === "files" ? (
            <div className="flex max-h-[min(420px,50vh)] flex-col gap-2 overflow-y-auto p-3">
              <Button
                className="w-full gap-2"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="secondary"
              >
                <FolderOpen className="size-4" />
                Open PDFs
              </Button>
              <p className="text-muted-foreground text-[10px] leading-relaxed">Ctrl+O · Drag &amp; drop PDFs here</p>
              {items.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-xs">No files yet</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((it) => (
                    <li key={it.id}>
                      <div
                        className={cn(
                          "flex items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition",
                          it.id === activeId ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/40"
                        )}
                      >
                        <button
                          className="min-w-0 flex-1 truncate text-left font-medium"
                          onClick={() => {
                            setActiveId(it.id);
                            setSidebarTab("pages");
                          }}
                          type="button"
                        >
                          {it.name}
                        </button>
                        <button
                          aria-label={`Remove ${it.name}`}
                          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          disabled={busy}
                          onClick={() => {
                            setItems((prev) => prev.filter((x) => x.id !== it.id));
                          }}
                          type="button"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="max-h-[min(420px,50vh)] overflow-y-auto p-2">
              {!pdfDoc ? (
                <p className="text-muted-foreground p-4 text-center text-xs">Load a PDF to see thumbnails</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pn) => (
                    <li key={pn}>
                      <ThumbnailButton
                        isActive={pn === currentPage}
                        onSelect={() => {
                          setCurrentPage(pn);
                          setSidebarTab("pages");
                        }}
                        pageNum={pn}
                        pdfDoc={pdfDoc}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-col gap-4">
          <input
            accept="application/pdf,.pdf"
            aria-label="Import PDF files"
            className="hidden"
            disabled={busy}
            multiple
            onChange={(e) => {
              const fl = e.target.files;
              if (fl?.length) {
                addFiles(fl);
              }
              e.target.value = "";
            }}
            ref={fileInputRef}
            type="file"
          />

          <section className="glass-panel flex min-h-[320px] flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <Button
                disabled={!pdfDoc || busy || currentPage <= 1}
                onClick={goPrev}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {pdfDoc ? (
                  <>
                    {currentPage} / {pdfDoc.numPages}
                  </>
                ) : (
                  "—"
                )}
              </span>
              <Button
                disabled={!pdfDoc || busy || !pdfDoc || currentPage >= pdfDoc.numPages}
                onClick={goNext}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronRight className="size-4" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <Button
                disabled={!pdfDoc || busy}
                onClick={() => {
                  setFitMode("width");
                  recomputeFit();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Rows3 className="mr-1 size-3.5" />
                Fit width
              </Button>
              <Button
                disabled={!pdfDoc || busy}
                onClick={() => {
                  setFitMode("page");
                  recomputeFit();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Maximize2 className="mr-1 size-3.5" />
                Fit page
              </Button>
              <Button
                disabled={!pdfDoc || busy}
                onClick={() => {
                  setFitMode("none");
                  setPreviewScale((s) => Math.max(0.25, s / 1.15));
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Minus className="size-4" />
              </Button>
              <Button
                disabled={!pdfDoc || busy}
                onClick={() => {
                  setFitMode("none");
                  setPreviewScale((s) => Math.min(6, s * 1.15));
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Plus className="size-4" />
              </Button>
              <span className="text-muted-foreground ml-auto text-[10px] tabular-nums">
                Preview scale {previewScale.toFixed(2)}×
              </span>
            </div>

            <div
              className="relative flex min-h-[min(240px,38dvh)] flex-1 items-center justify-center overflow-auto bg-muted/20 p-2 sm:min-h-[280px] sm:p-3"
              ref={containerRef}
            >
              {!activeItem ? (
                <div className="text-muted-foreground flex max-w-sm flex-col items-center gap-3 p-6 text-center text-sm">
                  <FileText className="size-10 opacity-40" />
                  <p>Drop PDFs here or use Open PDFs / the file input below.</p>
                  <label htmlFor={inputId}>
                    <span className="sr-only">PDF files</span>
                    <Input
                      accept="application/pdf,.pdf"
                      className="cursor-pointer"
                      disabled={busy}
                      id={inputId}
                      multiple
                      onChange={(e) => {
                        const fl = e.target.files;
                        if (fl?.length) {
                          addFiles(fl);
                        }
                      }}
                      type="file"
                    />
                  </label>
                </div>
              ) : pdfLoadError ? (
                <p className="text-destructive px-4 text-sm">{pdfLoadError}</p>
              ) : !pdfDoc ? (
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              ) : (
                <canvas className="max-w-full shadow-md" ref={canvasRef} />
              )}
            </div>
          </section>

          <section className="glass-panel space-y-4 px-5 py-5">
            <h2 className="text-sm font-semibold tracking-tight">Export</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground text-xs font-medium">Package</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["png-zip", "ZIP PNG", ImageIcon],
                      ["jpeg-zip", "ZIP JPEG", ImageIcon],
                      ["txt-zip", "ZIP TXT", FileText],
                      ["docx", "DOCX", FileText]
                    ] as const
                  ).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium transition",
                        settings.exportMode === mode ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                      )}
                      disabled={busy}
                      onClick={() => setSettings((s) => ({ ...s, exportMode: mode as ExportPackageMode }))}
                      type="button"
                    >
                      <Icon className="size-3.5 opacity-70" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-xs font-medium">Export resolution (DPI)</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DPI_PRESETS.map((p) => (
                    <button
                      key={p.dpi}
                      className={cn(
                        "rounded-md border px-2 py-2 text-left text-[11px] transition",
                        settings.exportDpi === p.dpi ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                      )}
                      disabled={busy || settings.exportMode === "txt-zip"}
                      onClick={() => setSettings((s) => ({ ...s, exportDpi: p.dpi }))}
                      type="button"
                    >
                      <span className="block font-medium text-foreground">{p.label}</span>
                      <span className="text-muted-foreground">{p.sub}</span>
                    </button>
                  ))}
                </div>
                {settings.exportMode === "txt-zip" ? (
                  <p className="text-muted-foreground mt-1 text-[10px]">DPI applies to image modes only.</p>
                ) : null}
              </div>
            </div>

            {settings.exportMode === "jpeg-zip" ? (
              <div>
                <label className="text-muted-foreground text-xs font-medium" htmlFor="jpeg-q">
                  JPEG quality ({settings.jpegQualityPercent}%)
                </label>
                <input
                  className="mt-2 h-2 w-full max-w-md cursor-pointer accent-primary"
                  disabled={busy}
                  id="jpeg-q"
                  max={100}
                  min={10}
                  onChange={(e) => setSettings((s) => ({ ...s, jpegQualityPercent: Number(e.target.value) }))}
                  type="range"
                  value={settings.jpegQualityPercent}
                />
              </div>
            ) : null}

            <div>
              <label className="text-muted-foreground text-xs font-medium" htmlFor="page-range">
                Pages to export
              </label>
              <Input
                className="mt-2 max-w-md font-mono text-sm"
                disabled={busy}
                id="page-range"
                onChange={(e) => setSettings((s) => ({ ...s, pageRange: e.target.value }))}
                placeholder="all"
                value={settings.pageRange}
              />
              <p className="text-muted-foreground mt-1 text-[10px]">{formatPageRangeHint()}</p>
            </div>

            <div className="flex flex-col gap-2">
              {settings.exportMode !== "docx" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    checked={settings.includePerPageText}
                    disabled={busy || settings.exportMode === "txt-zip"}
                    onChange={(e) => setSettings((s) => ({ ...s, includePerPageText: e.target.checked }))}
                    type="checkbox"
                  />
                  Include per-page .txt (with PNG/JPEG ZIP)
                </label>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    checked={settings.includeTextInDocx}
                    disabled={busy}
                    onChange={(e) => setSettings((s) => ({ ...s, includeTextInDocx: e.target.checked }))}
                    type="checkbox"
                  />
                  Append extracted text under each page image in DOCX
                </label>
              )}
              {settings.exportMode !== "docx" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    checked={settings.combinedTextFile}
                    disabled={busy}
                    onChange={(e) => setSettings((s) => ({ ...s, combinedTextFile: e.target.checked }))}
                    type="checkbox"
                  />
                  Also add combined <span className="font-mono text-xs">all-pages.txt</span>
                </label>
              ) : null}
            </div>

            <div>
              <span className="text-muted-foreground text-xs font-medium">Scope</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                    settings.exportScope === "active" ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                  )}
                  disabled={busy}
                  onClick={() => setSettings((s) => ({ ...s, exportScope: "active" }))}
                  type="button"
                >
                  Current file only
                </button>
                <button
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                    settings.exportScope === "all" ? "border-primary bg-primary/10" : "border-border text-muted-foreground"
                  )}
                  disabled={busy || items.length < 2}
                  onClick={() => setSettings((s) => ({ ...s, exportScope: "all" }))}
                  type="button"
                >
                  All loaded files
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            {progress ? (
              <p aria-live="polite" className="text-muted-foreground text-sm">
                {progress}
              </p>
            ) : null}

            {queueLog.length > 0 ? (
              <div className="bg-muted/30 max-h-28 overflow-y-auto rounded-md border border-border p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                {queueLog.map((line, i) => (
                  <div key={`${i}-${line.slice(0, 24)}`}>{line}</div>
                ))}
              </div>
            ) : null}

            <Button disabled={items.length === 0 || busy || (!!pdfLoadError && settings.exportScope === "active")} onClick={() => void runExport()} type="button">
              {busy ? "Working…" : settings.exportMode === "docx" ? "Download DOCX / ZIP" : "Download ZIP"}
            </Button>
          </section>
        </div>
      </div>
      </FileDropSurface>

      <div className="text-muted-foreground space-y-1 px-1 text-center text-[11px] leading-relaxed">
        <p>
          Shortcuts: <span className="font-mono">←</span> / <span className="font-mono">→</span> pages ·{" "}
          <span className="font-mono">Home</span> / <span className="font-mono">End</span> ·{" "}
          <span className="font-mono">Ctrl+O</span> open
        </p>
        <p>
          Large PDFs or DOCX with many images can exhaust memory. Password-protected PDFs are not supported. PDF.js loads from{" "}
          <span className="font-mono text-[10px]">cdn.jsdelivr.net</span>.
        </p>
      </div>
    </div>
  );
}

function ThumbnailButton({
  pageNum,
  pdfDoc,
  isActive,
  onSelect
}: {
  pageNum: number;
  pdfDoc: PdfDocumentProxy;
  isActive: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const thumbRenderTaskRef = useRef<PdfRenderTask | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
        }
      },
      { root: null, rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      await drainPdfCanvasRender(thumbRenderTaskRef);
      if (cancelled) {
        return;
      }

      const page = await pdfDoc.getPage(pageNum);
      if (cancelled) {
        page.cleanup();
        return;
      }
      const thumbW = 120;
      const vp1 = page.getViewport({ scale: 1 });
      const scale = thumbW / vp1.width;
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        page.cleanup();
        return;
      }
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (cancelled) {
        page.cleanup();
        return;
      }

      const rt = page.render({ canvas, canvasContext: ctx, viewport });
      thumbRenderTaskRef.current = rt;
      try {
        await rt.promise;
      } catch {
        /* cancelled */
      } finally {
        if (thumbRenderTaskRef.current === rt) {
          thumbRenderTaskRef.current = null;
        }
      }

      if (cancelled) {
        page.cleanup();
        return;
      }

      page.cleanup();
    })();

    return () => {
      cancelled = true;
      const t = thumbRenderTaskRef.current;
      if (t) {
        t.cancel?.();
        void t.promise.catch(() => {});
      }
    };
  }, [visible, pdfDoc, pageNum]);

  return (
    <button
      className={cn(
        "w-full overflow-hidden rounded-md border p-1 transition",
        isActive ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
      )}
      onClick={onSelect}
      ref={wrapRef}
      type="button"
    >
      <canvas className="mx-auto block h-auto max-h-28 w-full bg-background object-contain" ref={canvasRef} />
      <span className="text-muted-foreground mt-1 block text-center text-[10px] tabular-nums">{pageNum}</span>
    </button>
  );
}
