"use client";

import { Download, ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { CLIENT_IMAGE_DECODE, CLIENT_IMAGE_ENCODE } from "@/lib/convert/image-formats";
import { normalizeFormatSlug } from "@/lib/convert/parse-path";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

type EncodeFormat = "png" | "jpeg" | "webp";

function mimeForEncode(f: EncodeFormat): string {
  if (f === "png") {
    return "image/png";
  }
  if (f === "jpeg") {
    return "image/jpeg";
  }
  return "image/webp";
}

function extForEncode(f: EncodeFormat): string {
  return f === "jpeg" ? "jpg" : f;
}

function canvasEncode(canvas: HTMLCanvasElement, format: EncodeFormat, jpegQuality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const type = mimeForEncode(format);
    canvas.toBlob((b) => resolve(b), type, format === "jpeg" ? jpegQuality : undefined);
  });
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) {
        throw new Error("No 2D context");
      }
      ctx.drawImage(img, 0, 0);
      return await createImageBitmap(c);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export type ImageConvertClientProps = {
  /** Normalized slugs, e.g. jpeg → png */
  initialFrom?: string;
  initialTo?: string;
  className?: string;
};

export default function ImageConvertClient({ initialFrom, initialTo, className }: ImageConvertClientProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputPreviewUrl, setOutputPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!outputBlob) {
      setOutputPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }
    const u = URL.createObjectURL(outputBlob);
    setOutputPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return u;
    });
    return () => {
      URL.revokeObjectURL(u);
    };
  }, [outputBlob]);

  const decodeFormats = useMemo(() => [...CLIENT_IMAGE_DECODE].sort(), []);
  const encodeFormats = useMemo(() => [...CLIENT_IMAGE_ENCODE].sort(), []);

  const [fromFmt, setFromFmt] = useState(() => normalizeFormatSlug(initialFrom || "png"));
  const [toFmt, setToFmt] = useState<EncodeFormat>(() => {
    const t = normalizeFormatSlug(initialTo || "webp");
    return t === "png" || t === "jpeg" || t === "webp" ? t : "webp";
  });

  const onFiles = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) {
      return;
    }
    setFile(f);
    setError(null);
    setOutputBlob(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return url;
    });
  }, []);

  const runConvert = useCallback(async () => {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    setOutputBlob(null);
    try {
      const bmp = await fileToImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas not available");
      }
      ctx.drawImage(bmp, 0, 0);
      if (typeof bmp.close === "function") {
        bmp.close();
      }
      const blob = await canvasEncode(canvas, toFmt, jpegQuality);
      if (!blob) {
        throw new Error(`This browser cannot encode ${toFmt.toUpperCase()} (try PNG).`);
      }
      setOutputBlob(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  }, [file, toFmt, jpegQuality]);

  const download = useCallback(() => {
    if (!outputBlob || !file) {
      return;
    }
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(outputBlob);
    a.download = `${base}.${extForEncode(toFmt)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, [outputBlob, file, toFmt]);

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
        <span className="font-medium text-foreground">Image</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Image format converter</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Decode common raster/SVG inputs, re-encode to <span className="font-mono text-xs">PNG</span>,{" "}
          <span className="font-mono text-xs">JPEG</span>, or <span className="font-mono text-xs">WebP</span>. Animated GIFs use the
          first frame. Exotic RAW/HEIC may fail unless the browser supports them.
        </p>
      </header>

      <FileDropSurface
        className="glass-panel min-h-[min(180px,32dvh)] rounded-xl p-3 sm:min-h-[200px] sm:p-4"
        onFiles={onFiles}
        overlayClassName="rounded-xl"
        overlayMessage="Drop an image"
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Expected input</span>
              <select
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => setFromFmt(normalizeFormatSlug(e.target.value))}
                value={fromFmt}
              >
                {decodeFormats.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground text-[10px]">Hint only — any decodable file works.</span>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Output</span>
              <select
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => setToFmt(e.target.value as EncodeFormat)}
                value={toFmt}
              >
                {encodeFormats.map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {toFmt === "jpeg" ? (
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground text-xs font-medium">JPEG quality</span>
              <Input
                max={100}
                min={10}
                onChange={(e) => setJpegQuality(Number(e.target.value) / 100)}
                type="range"
                value={Math.round(jpegQuality * 100)}
              />
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={inputId}>
              <span className="sr-only">Pick image</span>
              <Input accept="image/*" className="max-w-xs cursor-pointer" id={inputId} onChange={(e) => e.target.files && onFiles([...e.target.files])} type="file" />
            </label>
            <Button className="min-h-10 touch-manipulation sm:min-h-9" disabled={!file || busy} onClick={() => void runConvert()} type="button">
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Converting…
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 size-4" />
                  Convert
                </>
              )}
            </Button>
            <Button disabled={!outputBlob} onClick={download} type="button" variant="secondary">
              <Download className="mr-2 size-4" />
              Download
            </Button>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          {previewUrl ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">Input preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="max-h-64 w-full rounded-md border object-contain" src={previewUrl} />
              </div>
              {outputPreviewUrl ? (
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium">Output preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="max-h-64 w-full rounded-md border object-contain" src={outputPreviewUrl} />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-center text-sm">Drop a file or choose one above.</p>
          )}
        </div>
      </FileDropSurface>
    </div>
  );
}
