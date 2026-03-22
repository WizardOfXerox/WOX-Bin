"use client";

import { ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { resolveConversionPair } from "@/lib/convert/resolver";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_MEDIUM, TOOLS_CLIENT_NAV } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

const ImageConvertDynamic = dynamic(() => import("@/components/tools/image-convert-client"), {
  loading: () => (
    <div className="text-muted-foreground flex min-h-[30vh] items-center justify-center text-sm">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading…
    </div>
  ),
  ssr: false
});

const ServerImageDynamic = dynamic(() => import("@/components/tools/server-image-convert-client"), {
  loading: () => (
    <div className="text-muted-foreground flex min-h-[30vh] items-center justify-center text-sm">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading…
    </div>
  ),
  ssr: false
});

const MarkdownHtmlDynamic = dynamic(() => import("@/components/tools/markdown-html-client"), {
  loading: () => (
    <div className="text-muted-foreground flex min-h-[30vh] items-center justify-center text-sm">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading…
    </div>
  ),
  ssr: false
});

const TextHtmlDynamic = dynamic(() => import("@/components/tools/text-html-convert-client"), {
  loading: () => (
    <div className="text-muted-foreground flex min-h-[30vh] items-center justify-center text-sm">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading…
    </div>
  ),
  ssr: false
});

const WorkerFfmpegDynamic = dynamic(() => import("@/components/tools/worker-convert-client"), {
  loading: () => (
    <div className="text-muted-foreground flex min-h-[30vh] items-center justify-center text-sm">
      <Loader2 className="mr-2 size-5 animate-spin" />
      Loading…
    </div>
  ),
  ssr: false
});

export default function UniversalConvertClient({ pathSlug, className }: { pathSlug: string; className?: string }) {
  const resolved = useMemo(() => resolveConversionPair(pathSlug), [pathSlug]);

  if (!resolved) {
    return (
      <div className={cn("mx-auto max-w-xl px-3 py-10 text-center sm:px-4 sm:py-16", className)}>
        <p className="text-muted-foreground text-sm">
          Unrecognized conversion path. Use a slug like <code className="font-mono text-xs">jpeg-png</code> or{" "}
          <code className="font-mono text-xs">tiff-webp</code>.
        </p>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/tools/convert">Back to hub</Link>
        </Button>
      </div>
    );
  }

  if (resolved.implementation === "client-image-raster") {
    return (
      <div className={cn("w-full py-2 sm:py-4", className)}>
        <ImageConvertDynamic initialFrom={resolved.from} initialTo={resolved.to} />
      </div>
    );
  }

  if (resolved.implementation === "server-image-sharp") {
    return (
      <div className={cn("w-full py-2 sm:py-4", className)}>
        <ServerImageDynamic fromSlug={resolved.from} pairLabel={resolved.label} toSlug={resolved.to} />
      </div>
    );
  }

  if (resolved.implementation === "client-markdown-html") {
    return (
      <div className={cn("w-full py-2 sm:py-4", className)}>
        <MarkdownHtmlDynamic />
      </div>
    );
  }

  if (resolved.implementation === "client-text-html") {
    const mode = resolved.from === "html" ? "html-txt" : "txt-html";
    return (
      <div className={cn("w-full py-2 sm:py-4", className)}>
        <TextHtmlDynamic mode={mode} />
      </div>
    );
  }

  if (resolved.implementation === "worker-ffmpeg") {
    return (
      <div className={cn("w-full py-2 sm:py-4", className)}>
        <WorkerFfmpegDynamic pairLabel={resolved.label} pairPath={resolved.canonical} />
      </div>
    );
  }

  const convertioHref = `https://convertio.co/${resolved.canonical}/`;

  return (
    <div className={cn(TOOLS_CLIENT_MEDIUM, "py-2 sm:py-6", className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">{resolved.label}</span>
      </nav>

      <header className={cn(TOOLS_CLIENT_HEADER, "space-y-3")}>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{resolved.label}</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Not implemented in WOX-Bin yet — needs FFmpeg, LibreOffice, OCR, or other workers plus object storage. See{" "}
          <span className="font-mono text-[10px]">docs/CONVERSION-PLATFORM.md</span>.
        </p>
        <p className="text-muted-foreground text-xs">
          Already live: image (browser + sharp), PDF extract/merge, CSV/JSON, Markdown→HTML, text↔HTML, ZIP — browse{" "}
          <Link className="text-foreground underline" href="/tools/convert">
            /tools/convert
          </Link>
          .
        </p>
        <Button asChild className="min-h-10 w-full touch-manipulation gap-2 sm:min-h-9 sm:w-auto" variant="secondary">
          <a href={convertioHref} rel="noopener noreferrer" target="_blank">
            Open on Convertio (reference)
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/tools/convert">
            Back to hub
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </header>
    </div>
  );
}
