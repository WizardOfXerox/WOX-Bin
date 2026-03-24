"use client";

import { useRef, useState } from "react";
import { Download, ImageIcon, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropSurface } from "@/components/ui/file-drop-surface";

type ScrubResult = {
  filename: string;
  blob: Blob;
  previewUrl: string;
  originalPreviewUrl: string;
  metadata: Record<string, unknown> | null;
  scrubbedMetadata: Record<string, unknown> | null;
  originalSize: number;
  scrubbedSize: number;
};

async function readMetadata(fileOrBlob: Blob) {
  const exifr = await import("exifr");
  const parsed = await exifr.parse(fileOrBlob, true).catch(() => null);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  return parsed as Record<string, unknown>;
}

async function blobToImage(blob: Blob) {
  const src = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image could not be loaded."));
      element.src = src;
    });
    return { image, src };
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}

async function scrubImage(file: File): Promise<ScrubResult> {
  const originalPreviewUrl = URL.createObjectURL(file);
  const metadata = await readMetadata(file);
  const { image, src } = await blobToImage(file);

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(src);
    throw new Error("Canvas is not available in this browser.");
  }

  context.drawImage(image, 0, 0);

  const targetMime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) {
          resolve(value);
          return;
        }
        reject(new Error("Could not export scrubbed image."));
      },
      targetMime,
      targetMime === "image/png" ? undefined : 0.92
    );
  });

  URL.revokeObjectURL(src);
  const previewUrl = URL.createObjectURL(blob);
  const scrubbedMetadata = await readMetadata(blob);

  return {
    filename: file.name.replace(/(\.[^.]+)?$/, targetMime === "image/png" ? ".png" : targetMime === "image/webp" ? ".webp" : ".jpg"),
    blob,
    previewUrl,
    originalPreviewUrl,
    metadata,
    scrubbedMetadata,
    originalSize: file.size,
    scrubbedSize: blob.size
  };
}

export function ScrubToolClient() {
  const [result, setResult] = useState<ScrubResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Scrub currently supports images only (JPG, PNG, WebP, and similar browser-decodable files).");
      return;
    }

    setBusy(true);
    setError("");
    try {
      if (result) {
        URL.revokeObjectURL(result.previewUrl);
        URL.revokeObjectURL(result.originalPreviewUrl);
      }
      const next = await scrubImage(file);
      setResult(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Metadata scrub failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!result) {
      return;
    }
    const href = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = result.filename;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Browser-side metadata scrub
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Remove image metadata without uploading the file.</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Drag in a photo or image export, inspect the metadata that the browser can read, then download a scrubbed
            copy that has been redrawn locally through canvas to strip EXIF and similar embedded metadata.
          </p>
        </CardContent>
      </Card>

      <FileDropSurface
        activeClassName="scale-[1.01]"
        className="rounded-[1.5rem]"
        onFiles={handleFiles}
        overlayMessage="Drop an image to scrub metadata"
      >
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => fileInputRef.current?.click()} type="button">
                <ImageIcon className="size-4" />
                Choose image
              </Button>
              <Button disabled={!result || busy} onClick={() => void downloadResult()} type="button" variant="outline">
                <Download className="size-4" />
                Download scrubbed copy
              </Button>
              <Button disabled={busy} onClick={() => setResult(null)} type="button" variant="ghost">
                <RefreshCw className="size-4" />
                Reset
              </Button>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))}
                ref={fileInputRef}
                type="file"
              />
            </div>

            {busy ? <p className="text-sm text-muted-foreground">Scrubbing image and reading metadata…</p> : null}
            {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

            {result ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Original</p>
                  <div className="overflow-hidden rounded-[1.25rem] border border-border bg-background/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Original upload preview" className="max-h-[22rem] w-full object-contain" src={result.originalPreviewUrl} />
                  </div>
                  <p className="text-xs text-muted-foreground">Size {Math.round(result.originalSize / 1024)} KB</p>
                  <pre className="max-h-72 overflow-auto rounded-[1.25rem] border border-border bg-background/70 p-4 text-xs text-muted-foreground">
                    {JSON.stringify(result.metadata ?? { metadata: "No readable metadata found." }, null, 2)}
                  </pre>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Scrubbed output</p>
                  <div className="overflow-hidden rounded-[1.25rem] border border-border bg-background/70">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Scrubbed image preview" className="max-h-[22rem] w-full object-contain" src={result.previewUrl} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Size {Math.round(result.scrubbedSize / 1024)} KB · metadata{" "}
                    {result.scrubbedMetadata && Object.keys(result.scrubbedMetadata).length ? "still detected" : "cleared"}
                  </p>
                  <pre className="max-h-72 overflow-auto rounded-[1.25rem] border border-border bg-background/70 p-4 text-xs text-muted-foreground">
                    {JSON.stringify(result.scrubbedMetadata ?? { metadata: "No readable metadata found after scrub." }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Drop an image here or choose one from disk to preview its metadata and generate a scrubbed version.
              </div>
            )}
          </CardContent>
        </Card>
      </FileDropSurface>
    </div>
  );
}
