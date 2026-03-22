import { getFfmpegWorkerPlan } from "@/lib/convert/ffmpeg-plan";
import { isClientRasterPair } from "@/lib/convert/image-formats";
import { normalizeFormatSlug, parseConversionPath, type ParsedConversionPath } from "@/lib/convert/parse-path";
import { isSharpRasterPair } from "@/lib/convert/sharp-formats";

export type ConversionImplementation =
  | "client-image-raster"
  | "server-image-sharp"
  | "client-pdf-extract"
  | "client-data-lab"
  | "client-markdown-html"
  | "client-text-html"
  | "worker-ffmpeg"
  | "worker";

export type ResolvedConversion = ParsedConversionPath & {
  implementation: ConversionImplementation;
  /** In-app URL path + query (starts with /tools/…) */
  appHref: string | null;
  /** Human label */
  label: string;
};

function titleCaseToken(s: string): string {
  if (!s) {
    return s;
  }
  return s.toUpperCase();
}

function pairLabel(from: string, to: string): string {
  return `${titleCaseToken(from)} → ${titleCaseToken(to)}`;
}

const PDF_EXPORT_FOR_TARGET: Record<string, "png-zip" | "jpeg-zip" | "txt-zip" | "docx"> = {
  png: "png-zip",
  jpg: "jpeg-zip",
  jpeg: "jpeg-zip",
  jfif: "jpeg-zip",
  jpe: "jpeg-zip",
  webp: "png-zip",
  txt: "txt-zip",
  text: "txt-zip",
  docx: "docx"
};

function resolvePdfExtract(from: string, to: string, canonical: string): ResolvedConversion | null {
  if (from !== "pdf") {
    return null;
  }
  const mode = PDF_EXPORT_FOR_TARGET[to];
  if (!mode) {
    return null;
  }
  return {
    from,
    to,
    canonical,
    implementation: "client-pdf-extract",
    appHref: `/tools/pdf-extract?export=${mode}`,
    label: pairLabel("pdf", to)
  };
}

function resolveDataLab(from: string, to: string, canonical: string): ResolvedConversion | null {
  if (from === "csv" && to === "json") {
    return {
      from,
      to,
      canonical,
      implementation: "client-data-lab",
      appHref: "/tools/data-lab#csv-to-json",
      label: pairLabel(from, to)
    };
  }
  if (from === "json" && to === "csv") {
    return {
      from,
      to,
      canonical,
      implementation: "client-data-lab",
      appHref: "/tools/data-lab#json-to-csv",
      label: pairLabel(from, to)
    };
  }
  if (from === "tsv" && to === "json") {
    return {
      from,
      to,
      canonical,
      implementation: "client-data-lab",
      appHref: "/tools/data-lab#tsv-to-json",
      label: pairLabel(from, to)
    };
  }
  if (from === "json" && to === "tsv") {
    return {
      from,
      to,
      canonical,
      implementation: "client-data-lab",
      appHref: "/tools/data-lab#json-to-tsv",
      label: pairLabel(from, to)
    };
  }
  return null;
}

function resolveMarkdownHtml(from: string, to: string, canonical: string): ResolvedConversion | null {
  if (to !== "html") {
    return null;
  }
  if (from === "md" || from === "markdown") {
    return {
      from,
      to,
      canonical,
      implementation: "client-markdown-html",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }
  return null;
}

function resolveTextHtml(from: string, to: string, canonical: string): ResolvedConversion | null {
  if (from === "txt" && to === "html") {
    return {
      from,
      to,
      canonical,
      implementation: "client-text-html",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }
  if (from === "html" && to === "txt") {
    return {
      from,
      to,
      canonical,
      implementation: "client-text-html",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }
  return null;
}

/**
 * Map a Convertio pair segment to a WOX-Bin client tool, server route, or worker bucket.
 */
export function resolveConversionPair(pathOrCanonical: string): ResolvedConversion | null {
  const parsed = parseConversionPath(pathOrCanonical);
  if (!parsed) {
    return null;
  }
  const { from, to, canonical } = parsed;

  const pdf = resolvePdfExtract(from, to, canonical);
  if (pdf) {
    return pdf;
  }

  const data = resolveDataLab(from, to, canonical);
  if (data) {
    return data;
  }

  const md = resolveMarkdownHtml(from, to, canonical);
  if (md) {
    return md;
  }

  const tx = resolveTextHtml(from, to, canonical);
  if (tx) {
    return tx;
  }

  if (isClientRasterPair(from, to)) {
    return {
      from,
      to,
      canonical,
      implementation: "client-image-raster",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }

  if (isSharpRasterPair(from, to)) {
    return {
      from,
      to,
      canonical,
      implementation: "server-image-sharp",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }

  if (getFfmpegWorkerPlan(from, to)) {
    return {
      from,
      to,
      canonical,
      implementation: "worker-ffmpeg",
      appHref: `/tools/c/${canonical}`,
      label: pairLabel(from, to)
    };
  }

  return {
    from,
    to,
    canonical,
    implementation: "worker",
    appHref: null,
    label: pairLabel(from, to)
  };
}

/** Runs only in the browser (no file upload to our servers). */
export function isImplementedInBrowser(r: ResolvedConversion): boolean {
  return (
    r.implementation === "client-image-raster" ||
    r.implementation === "client-pdf-extract" ||
    r.implementation === "client-data-lab" ||
    r.implementation === "client-markdown-html" ||
    r.implementation === "client-text-html"
  );
}

/** Supported inside WOX-Bin (browser, sharp, or FFmpeg worker when infra is up). */
export function isImplementedInWoxBin(r: ResolvedConversion): boolean {
  return (
    isImplementedInBrowser(r) ||
    r.implementation === "server-image-sharp" ||
    r.implementation === "worker-ffmpeg"
  );
}

export { normalizeFormatSlug, parseConversionPath };
