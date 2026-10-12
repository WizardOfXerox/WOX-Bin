"use client";

import { Check, CheckSquare, Download, FileArchive, ImageIcon, Loader2, RefreshCw, Sparkles, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { zipSync } from "fflate";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { buildIco, ICO_RESOLUTIONS, renderImageToSquarePng, type IcoResolution } from "@/lib/tools/ico";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

type GeneratedResolution = {
  size: IcoResolution;
  blob: Blob;
  previewUrl: string;
  bytes: Uint8Array;
};

const RESOLUTION_LABELS: Record<IcoResolution, { label: string; desc: string }> = {
  16: { label: "16 × 16", desc: "Classic browser tab favicon" },
  32: { label: "32 × 32", desc: "Retina tab / Windows taskbar" },
  48: { label: "48 × 48", desc: "Windows desktop icon" },
  64: { label: "64 × 64", desc: "High-DPI desktop & site icon" },
  128: { label: "128 × 128", desc: "Windows Explorer medium view" },
  256: { label: "256 × 256", desc: "Windows large icon / PWA asset" }
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function IcoToolClient({ className }: { className?: string }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; name: string } | null>(null);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [selectedResolutions, setSelectedResolutions] = useState<Set<IcoResolution>>(
    new Set<IcoResolution>([16, 32, 48, 64, 128, 256])
  );
  const [renders, setRenders] = useState<Map<IcoResolution, GeneratedResolution>>(new Map());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke previous blob URLs when unmounting or re-rendering
  useEffect(() => {
    return () => {
      for (const item of renders.values()) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [renders]);

  const toggleResolution = useCallback((size: IcoResolution) => {
    setSelectedResolutions((prev) => {
      const next = new Set(prev);
      if (next.has(size)) {
        if (next.size === 1) {
          return prev; // keep at least one
        }
        next.delete(size);
      } else {
        next.add(size);
      }
      return next;
    });
  }, []);

  const selectAllResolutions = useCallback(() => {
    setSelectedResolutions(new Set<IcoResolution>([16, 32, 48, 64, 128, 256]));
  }, []);

  const selectWebStandardResolutions = useCallback(() => {
    setSelectedResolutions(new Set<IcoResolution>([16, 32, 48]));
  }, []);

  // Process image and generate PNGs for each resolution
  const processImage = useCallback(
    async (uploadedFile: File, fit: "contain" | "cover") => {
      setGenerating(true);
      setError(null);

      const objectUrl = URL.createObjectURL(uploadedFile);
      try {
        const img = new Image();
        img.decoding = "async";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Unable to parse source image. Make sure the file is a valid image format."));
          img.src = objectUrl;
        });

        const naturalWidth = img.naturalWidth || 256;
        const naturalHeight = img.naturalHeight || 256;

        setImageMeta({
          width: naturalWidth,
          height: naturalHeight,
          name: uploadedFile.name
        });

        // Generate renders for all resolutions
        const newRenders = new Map<IcoResolution, GeneratedResolution>();
        for (const res of ICO_RESOLUTIONS) {
          const blob = await renderImageToSquarePng(img, naturalWidth, naturalHeight, res, fit);
          const buf = await blob.arrayBuffer();
          const preview = URL.createObjectURL(blob);

          newRenders.set(res, {
            size: res,
            blob,
            previewUrl: preview,
            bytes: new Uint8Array(buf)
          });
        }

        // Clean old preview URLs
        for (const old of renders.values()) {
          URL.revokeObjectURL(old.previewUrl);
        }

        setRenders(newRenders);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process image.");
      } finally {
        URL.revokeObjectURL(objectUrl);
        setGenerating(false);
      }
    },
    [renders]
  );

  const onFileInput = useCallback(
    (files: File[]) => {
      const selected = files[0];
      if (!selected) return;
      if (!selected.type.startsWith("image/") && !selected.name.match(/\.(png|jpe?g|webp|svg|bmp|gif|ico)$/i)) {
        setError("Please choose a valid image file (PNG, JPG, WebP, SVG, GIF, etc.).");
        return;
      }
      setFile(selected);
      void processImage(selected, fitMode);
    },
    [fitMode, processImage]
  );

  const onFitModeChange = useCallback(
    (mode: "contain" | "cover") => {
      setFitMode(mode);
      if (file) {
        void processImage(file, mode);
      }
    },
    [file, processImage]
  );

  const clearImage = useCallback(() => {
    for (const item of renders.values()) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setFile(null);
    setImageMeta(null);
    setRenders(new Map());
    setError(null);
  }, [renders]);

  // Active rendered items based on selected resolutions
  const activeEntries = useMemo(() => {
    const list: GeneratedResolution[] = [];
    for (const res of ICO_RESOLUTIONS) {
      if (selectedResolutions.has(res)) {
        const item = renders.get(res);
        if (item) list.push(item);
      }
    }
    return list;
  }, [renders, selectedResolutions]);

  // Compute packed ICO blob
  const icoBlob = useMemo(() => {
    if (activeEntries.length === 0) return null;
    try {
      const icoBytes = buildIco(
        activeEntries.map((e) => ({
          size: e.size,
          pngBytes: e.bytes
        }))
      );
      return new Blob([new Uint8Array(icoBytes)], { type: "image/x-icon" });
    } catch {
      return null;
    }
  }, [activeEntries]);

  const handleDownloadIco = useCallback(() => {
    if (!icoBlob) return;
    const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "favicon";
    downloadBlob(icoBlob, `${baseName}.ico`);
  }, [icoBlob, file]);

  const handleDownloadZip = useCallback(() => {
    if (activeEntries.length === 0) return;
    try {
      const baseName = file?.name ? file.name.replace(/\.[^/.]+$/, "") : "favicon";
      const record: Record<string, Uint8Array> = {};

      for (const entry of activeEntries) {
        record[`${baseName}-${entry.size}x${entry.size}.png`] = entry.bytes;
      }

      if (icoBlob) {
        // Also include the compiled .ico file inside the zip bundle
        const icoBytes = buildIco(
          activeEntries.map((e) => ({
            size: e.size,
            pngBytes: e.bytes
          }))
        );
        record[`${baseName}.ico`] = icoBytes;
      }

      const zipped = zipSync(record, { level: 6 });
      downloadBlob(new Blob([new Uint8Array(zipped)], { type: "application/zip" }), `${baseName}-icons.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ZIP archive.");
    }
  }, [activeEntries, file, icoBlob]);

  return (
    <div className={cn(TOOLS_CLIENT_WIDE, className)}>
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
        <span className="font-medium text-foreground">Favicon & ICO</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Browser · no upload
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/20">
            Multi-Resolution
          </Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Favicon / Multi-Resolution ICO Generator
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Build multi-resolution Windows and browser <span className="font-mono text-xs text-foreground">.ico</span> files directly in your browser. Pack standard resolutions (16×16 through 256×256) into a single file with live previews.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive sm:text-sm">
          {error}
        </div>
      ) : null}

      {!file ? (
        <FileDropSurface
          className="glass-panel min-h-[220px] rounded-2xl p-6 text-center sm:min-h-[260px] sm:p-10"
          onFiles={onFileInput}
          overlayMessage="Drop image here to create ICO"
        >
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-background/50 shadow-sm backdrop-blur-sm">
              <ImageIcon className="size-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                Drop your image here, or browse
              </h2>
              <p className="text-xs text-muted-foreground">
                Supports PNG, SVG, JPG, WebP, GIF, or BMP. Transparent backgrounds are preserved.
              </p>
            </div>
            <label
              className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              htmlFor={inputId}
            >
              Choose image
              <Input
                accept="image/*,.svg,.ico"
                className="hidden"
                id={inputId}
                onChange={(e) => {
                  if (e.target.files) onFileInput(Array.from(e.target.files));
                }}
                type="file"
              />
            </label>
          </div>
        </FileDropSurface>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{imageMeta?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Original: {imageMeta?.width} × {imageMeta?.height} px · {formatBytes(file.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="size-8 p-0"
                  onClick={clearImage}
                  size="sm"
                  title="Remove image and choose another"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                </Button>
                <label
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border/80 bg-background/50 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  htmlFor={inputId}
                >
                  <RefreshCw className="mr-1.5 size-3.5" />
                  Replace
                  <Input
                    accept="image/*,.svg,.ico"
                    className="hidden"
                    id={inputId}
                    onChange={(e) => {
                      if (e.target.files) onFileInput(Array.from(e.target.files));
                    }}
                    type="file"
                  />
                </label>
              </div>
            </div>

            {/* Scaling and Selection Controls */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Scaling & Aspect Ratio</span>
                <div className="flex gap-2">
                  <Button
                    className={cn(
                      "flex-1 text-xs",
                      fitMode === "contain" ? "bg-primary/20 text-foreground border-primary/40" : ""
                    )}
                    onClick={() => onFitModeChange("contain")}
                    size="sm"
                    type="button"
                    variant={fitMode === "contain" ? "default" : "outline"}
                  >
                    Contain (Preserve ratio)
                  </Button>
                  <Button
                    className={cn(
                      "flex-1 text-xs",
                      fitMode === "cover" ? "bg-primary/20 text-foreground border-primary/40" : ""
                    )}
                    onClick={() => onFitModeChange("cover")}
                    size="sm"
                    type="button"
                    variant={fitMode === "cover" ? "default" : "outline"}
                  >
                    Cover (Square crop)
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Resolution Presets</span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      className="text-primary hover:underline"
                      onClick={selectAllResolutions}
                      type="button"
                    >
                      All
                    </button>
                    <span className="text-border">·</span>
                    <button
                      className="text-primary hover:underline"
                      onClick={selectWebStandardResolutions}
                      type="button"
                    >
                      Web (16-48)
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ICO_RESOLUTIONS.map((res) => {
                    const isSelected = selectedResolutions.has(res);
                    return (
                      <button
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:border-border"
                        )}
                        key={res}
                        onClick={() => toggleResolution(res)}
                        type="button"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-3.5 text-primary" />
                        ) : (
                          <Square className="size-3.5 text-muted-foreground" />
                        )}
                        {res}×{res}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Resolutions Preview Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                Resolution Previews ({activeEntries.length} selected)
              </h2>
              {generating ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating slices...
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {ICO_RESOLUTIONS.map((res) => {
                const isSelected = selectedResolutions.has(res);
                const item = renders.get(res);
                const info = RESOLUTION_LABELS[res];

                return (
                  <div
                    className={cn(
                      "group glass-panel relative flex flex-col items-center justify-between rounded-xl p-3 text-center transition-all",
                      isSelected
                        ? "border-primary/40 bg-card/60 shadow-sm"
                        : "opacity-40 border-dashed hover:opacity-75"
                    )}
                    key={res}
                  >
                    <div className="flex w-full items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">{info.label}</span>
                      <button
                        aria-label={`Toggle ${res}x${res}`}
                        className="rounded p-0.5 hover:bg-muted"
                        onClick={() => toggleResolution(res)}
                        type="button"
                      >
                        {isSelected ? (
                          <Check className="size-3.5 text-primary" />
                        ) : (
                          <Square className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Preview box with checkerboard background */}
                    <div
                      className="my-3 flex size-20 items-center justify-center rounded-lg border border-white/5 bg-neutral-900/40 p-1.5"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
                        backgroundSize: "12px 12px",
                        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px"
                      }}
                    >
                      {item ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          alt={`${res}x${res} preview`}
                          className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          src={item.previewUrl}
                          style={{
                            width: Math.min(res, 64),
                            height: Math.min(res, 64)
                          }}
                        />
                      ) : (
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    <div className="w-full space-y-1">
                      <div className="text-[10px] text-muted-foreground leading-tight line-clamp-1" title={info.desc}>
                        {info.desc}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/80">
                        {item ? formatBytes(item.bytes.byteLength) : "--"}
                      </div>
                      {item && isSelected ? (
                        <button
                          className="mt-1 flex w-full items-center justify-center gap-1 rounded bg-secondary/80 py-1 text-[10px] font-medium text-secondary-foreground transition hover:bg-secondary"
                          onClick={() => downloadBlob(item.blob, `favicon-${res}x${res}.png`)}
                          type="button"
                        >
                          <Download className="size-2.5" />
                          PNG
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Download Footer */}
          <div className="glass-panel flex flex-col items-center justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:p-5">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-semibold">Packed ICO File</span>
                {icoBlob ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-2 font-mono">
                    {formatBytes(icoBlob.size)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Contains {activeEntries.length} standard resolution{activeEntries.length === 1 ? "" : "s"} ready for desktop and web.
              </p>
            </div>

            <div className="flex flex-wrap w-full sm:w-auto items-center justify-center gap-2">
              <Button
                className="flex-1 sm:flex-none text-xs"
                disabled={activeEntries.length === 0}
                onClick={handleDownloadZip}
                type="button"
                variant="outline"
              >
                <FileArchive className="mr-1.5 size-4" />
                Download PNGs (.zip)
              </Button>
              <Button
                className="flex-1 sm:flex-none text-xs"
                disabled={!icoBlob || activeEntries.length === 0}
                onClick={handleDownloadIco}
                type="button"
              >
                <Download className="mr-1.5 size-4" />
                Download favicon.ico
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
