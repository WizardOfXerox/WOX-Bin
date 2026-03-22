"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toBlob, toCanvas, toJpeg, toSvg } from "html-to-image";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  CODE_IMAGE_DEFAULT_CANVAS_PAD,
  CODE_IMAGE_DEFAULT_SHADOW,
  CODE_IMAGE_FORMATS,
  CODE_IMAGE_PADDING,
  CODE_IMAGE_PRESETS,
  CODE_IMAGE_RADIUS,
  CODE_IMAGE_SCALES,
  CODE_IMAGE_WIDTHS,
  CODE_IMAGE_WINDOW_CHROME,
  type CodeImageExportFormat,
  type CodeImagePrismTheme,
  type CodeImageWindowChrome
} from "@/lib/code-image-design";
import { Prism } from "@/lib/prism-setup";
import { prismGrammarForLanguage } from "@/lib/prism-language";
import { cn, slugify } from "@/lib/utils";

import "prismjs/themes/prism-tomorrow.css";

const PRISM_THEME_CDN = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes";

const PLAYWRIGHT_EXPORT_UI =
  typeof process.env.NEXT_PUBLIC_CODE_IMAGE_PLAYWRIGHT_EXPORT === "string" &&
  ["1", "true", "yes"].includes(process.env.NEXT_PUBLIC_CODE_IMAGE_PLAYWRIGHT_EXPORT.toLowerCase());

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  language: string;
  /** Suggested download base name (e.g. paste title); extension added automatically */
  exportBasename?: string | null;
};

type CodeImageSettingsTab = "window" | "editor" | "misc";

function clampCanvasPad(n: number, fallback = CODE_IMAGE_DEFAULT_CANVAS_PAD.x): number {
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(240, Math.max(0, Math.round(n)));
}

function clampShadowPx(n: number, max: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(max, Math.max(0, Math.round(n)));
}

function initialExportBaseFromTitle(title: string | null | undefined): string {
  const t = title?.trim();
  if (!t) {
    return "woxbin-code";
  }
  const s = slugify(t).slice(0, 100);
  return s && s !== "paste" ? s : "woxbin-code";
}

function sanitizeExportBaseInput(raw: string): string {
  const noExt = raw.trim().replace(/\.(png|jpe?g|webp|svg)$/i, "");
  if (!noExt) {
    return "woxbin-code";
  }
  const s = slugify(noExt).slice(0, 100);
  return s && s !== "paste" ? s : "woxbin-code";
}

function exportFilename(base: string, format: CodeImageExportFormat): string {
  const ext = CODE_IMAGE_FORMATS.find((f) => f.value === format)?.ext ?? "png";
  return `${sanitizeExportBaseInput(base)}.${ext}`;
}

function useCodeImagePrismTheme(theme: CodeImagePrismTheme, active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = "wox-code-image-prism-theme";
    document.getElementById(id)?.remove();
    if (theme === "tomorrow") {
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `${PRISM_THEME_CDN}/prism-${theme}.min.css`;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [theme, active]);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const b64 = parts[1];
  const mime = meta.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    arr[i] = binary.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Same cap as html-to-image’s internal checkCanvasDimensions (see util.js). */
const HTML_TO_IMAGE_CANVAS_MAX = 16384;

/**
 * Chrome ~268M px² total; stay under to avoid allocation failures when stitching tall exports.
 * @see https://html2canvas.hertzen.com/faq.html
 */
const BROWSER_MAX_CANVAS_AREA = 240_000_000;

/**
 * html-to-image sets canvas size to cssWidth×cssHeight×pixelRatio. If either side exceeds the max,
 * it scales the whole canvas down proportionally — extremely tall captures become a unreadable narrow strip.
 * Lower pixel ratio instead so both dimensions stay under the limit while keeping aspect ratio.
 *
 * For a **single** raster pass (no vertical tiling), both width and height device pixels must be ≤ max side.
 * When we **tile vertically** (html2canvas strips), only **width** must fit in one tile; height is sliced.
 * Using min(..., 16384/h) for tall docs would force a tiny pixel ratio, skip tiling, and reproduce the
 * “paper-thin strip” — so use `maxSafePixelRatioForTiledExport` whenever tiling is in play.
 */
function maxSafePixelRatioSingleCanvas(cssWidth: number, cssHeight: number): number {
  const w = Math.max(1, Math.ceil(cssWidth));
  const h = Math.max(1, Math.ceil(cssHeight));
  return Math.min(HTML_TO_IMAGE_CANVAS_MAX / w, HTML_TO_IMAGE_CANVAS_MAX / h);
}

/** Full-width vertical tiles: only cssWidth × pr must stay under the canvas side limit. */
function maxSafePixelRatioForTiledExport(cssWidth: number): number {
  const w = Math.max(1, Math.ceil(cssWidth));
  return HTML_TO_IMAGE_CANVAS_MAX / w;
}

/**
 * Effective max pixel ratio for export: if height would exceed one tile, allow tile-friendly cap
 * (width-only) so we can stack strips at full sharpness; otherwise keep the stricter single-canvas cap.
 */
function maxSafePixelRatioForExport(cssWidth: number, cssHeight: number, desired: number): number {
  const w = Math.max(1, Math.ceil(cssWidth));
  const h = Math.max(1, Math.ceil(cssHeight));
  const wouldTileHeight = h * desired > HTML_TO_IMAGE_CANVAS_MAX || w * desired > HTML_TO_IMAGE_CANVAS_MAX;
  if (wouldTileHeight) {
    return maxSafePixelRatioForTiledExport(cssWidth);
  }
  return maxSafePixelRatioSingleCanvas(cssWidth, cssHeight);
}

function clampPixelRatioForExport(
  cssWidth: number,
  cssHeight: number,
  desired: number
): number {
  const safe = Math.min(desired, maxSafePixelRatioForExport(cssWidth, cssHeight, desired));
  return Math.max(1 / 512, safe);
}

/** Shrink pixel ratio so final bitmap (e.g. after vertical tiling) fits browser canvas area limits. */
function clampPixelRatioForTotalCanvasArea(cssWidth: number, cssHeight: number, pr: number): number {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const ow = w * pr;
  const oh = h * pr;
  if (ow * oh <= BROWSER_MAX_CANVAS_AREA) {
    return pr;
  }
  return pr * Math.sqrt(BROWSER_MAX_CANVAS_AREA / (ow * oh));
}

function needsVerticalTiling(cssWidth: number, cssHeight: number, pr: number): boolean {
  const w = Math.max(1, Math.ceil(cssWidth * pr));
  const h = Math.max(1, Math.ceil(cssHeight * pr));
  return w > HTML_TO_IMAGE_CANVAS_MAX || h > HTML_TO_IMAGE_CANVAS_MAX;
}

/**
 * Very tall/wide captures exceed one canvas side (~16k). html-to-image then shrinks *both* dimensions,
 * producing a paper-thin strip. Tile vertically at full width, then stitch (same idea as long-page screenshots).
 */
async function rasterizeTiledHtml2Canvas(
  node: HTMLElement,
  cssW: number,
  cssH: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  const maxSide = HTML_TO_IMAGE_CANVAS_MAX;
  const tileCssH = Math.max(1, Math.floor((maxSide - 2) / scale));
  const outW = Math.max(1, Math.floor(cssW * scale));
  const outH = Math.max(1, Math.floor(cssH * scale));
  const master = document.createElement("canvas");
  master.width = outW;
  master.height = outH;
  const ctx = master.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas for tiled export.");
  }

  let yCss = 0;
  let yDev = 0;
  let guard = 0;
  while (yCss < cssH && guard < 2000) {
    guard += 1;
    const sliceCssH = Math.min(tileCssH, cssH - yCss);
    const yOff = yCss;
    const tileCanvas = await html2canvas(node, {
      backgroundColor: null,
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: cssW,
      height: sliceCssH,
      windowWidth: cssW,
      windowHeight: sliceCssH,
      onclone: (_document, cloned) => {
        const el = cloned as HTMLElement;
        el.style.overflow = "hidden";
        el.style.height = `${sliceCssH}px`;
        el.style.maxHeight = `${sliceCssH}px`;
        el.style.boxSizing = "border-box";
        el.style.position = "relative";
        el.style.transform = `translateY(${-yOff}px)`;
        el.style.transformOrigin = "top left";
      }
    });
    const tw = tileCanvas.width;
    const th = tileCanvas.height;
    ctx.drawImage(tileCanvas, 0, 0, tw, th, 0, yDev, tw, th);
    yCss += sliceCssH;
    yDev += th;
  }
  return master;
}

async function rasterizeRasterToCanvas(
  node: HTMLElement,
  cssW: number,
  cssH: number,
  pr: number
): Promise<HTMLCanvasElement> {
  if (needsVerticalTiling(cssW, cssH, pr)) {
    return rasterizeTiledHtml2Canvas(node, cssW, cssH, pr);
  }
  return rasterizeWithHtml2Canvas(node, pr, { width: cssW, height: cssH });
}

type ExportSizeMode = "scale" | "width";

/**
 * Canva-style: target an output width in pixels (height scales). Still capped so both sides ≤ canvas max.
 */
function computeExportPixelRatio(
  cssWidth: number,
  cssHeight: number,
  mode: ExportSizeMode,
  scaleMultiplier: number,
  targetOutputWidthPx: number
): number {
  const w = Math.max(1, Math.ceil(cssWidth));
  const desired = mode === "scale" ? scaleMultiplier : targetOutputWidthPx / w;
  return clampPixelRatioForExport(cssWidth, cssHeight, desired);
}

function exportWidthSliderBounds(cssWidth: number, cssHeight: number): { min: number; max: number } {
  const w = Math.max(1, Math.round(cssWidth));
  const h = Math.max(1, Math.round(cssHeight));
  /*
   * Max raster width in px ≈ w × pr. For long files we tile vertically, so pr is limited by
   * canvas side (16384/w) and total stitched area — not by 16384/h (which would crush pr).
   */
  const maxPr = Math.min(
    maxSafePixelRatioForTiledExport(w),
    Math.sqrt(BROWSER_MAX_CANVAS_AREA / (w * h))
  );
  const maxW = Math.min(HTML_TO_IMAGE_CANVAS_MAX, Math.max(w, Math.floor(maxPr * w)));
  let minW = Math.max(64, Math.floor(w * 0.2));
  if (minW > maxW) {
    minW = maxW;
  }
  return { min: minW, max: maxW };
}

/**
 * html-to-image `toSvg` returns a data: URL (encodeURIComponent), not raw XML. Saving that string as .svg
 * makes Chrome report “Start tag expected, '&lt;' not found”.
 */
function svgExportDataUrlToXml(dataUrl: string): string {
  const s = dataUrl.trim();
  if (s.startsWith("<svg") || s.startsWith("<?xml")) {
    return s;
  }
  const comma = s.indexOf(",");
  if (comma < 0 || !s.startsWith("data:")) {
    throw new Error("SVG export returned an unexpected format (expected SVG markup or a data URL).");
  }
  const meta = s.slice(0, comma);
  let body = s.slice(comma + 1);
  if (/;base64/i.test(meta)) {
    const bin = atob(body.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  }
  body = body.replace(/\+/g, " ");
  return decodeURIComponent(body);
}

/** Let Radix dialog motion + layout settle before rasterizing (avoids blank / null exports). */
function flushCaptureLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Temporarily override inline styles; returned function restores previous values. */
function pushInlineStyles(el: HTMLElement | null, props: Record<string, string>): () => void {
  if (!el) {
    return () => {};
  }
  const entries = Object.entries(props).map(([prop, value]) => {
    const previous = el.style.getPropertyValue(prop);
    const priority = el.style.getPropertyPriority(prop);
    el.style.setProperty(prop, value);
    return { prop, previous, priority };
  });
  return () => {
    for (const { prop, previous, priority } of entries) {
      if (previous) {
        el.style.setProperty(prop, previous, priority || undefined);
      } else {
        el.style.removeProperty(prop);
      }
    }
  };
}

/**
 * Rasterizers often capture only the visible scrollport. Temporarily unclamp preview + dialog
 * so the capture root's scrollWidth/scrollHeight reflect the full snippet.
 */
type ExportLayoutOptions = {
  /** Exact frame width (px); omit when width follows content (auto + fit longest line). */
  fixedWidthPx: number | undefined;
  /**
   * Pin capture root to window width + canvas padding so html-to-image gets correct clientWidth
   * (fixed widths and intrinsic “auto-adjust” widths).
   */
  pinCaptureToWindow: boolean;
};

function beginExportLayoutUnclamp(
  captureRoot: HTMLElement,
  previewScroller: HTMLElement | null,
  windowEl: HTMLElement | null,
  layout: ExportLayoutOptions
): () => void {
  const dialogEl = captureRoot.closest('[role="dialog"]') as HTMLElement | null;
  const restores: Array<() => void> = [];

  restores.push(
    pushInlineStyles(previewScroller, {
      "max-height": "none",
      "min-height": "min-content",
      overflow: "visible",
      "overflow-x": "visible",
      "overflow-y": "visible"
    })
  );

  restores.push(
    pushInlineStyles(dialogEl, {
      "max-height": "none",
      overflow: "visible",
      "overflow-x": "visible",
      "overflow-y": "visible"
    })
  );

  if (windowEl && layout.fixedWidthPx != null) {
    restores.push(
      pushInlineStyles(windowEl, {
        width: `${layout.fixedWidthPx}px`,
        "max-width": "none",
        "min-width": `${layout.fixedWidthPx}px`,
        "box-sizing": "border-box"
      })
    );
  }

  /**
   * html-to-image sizes the SVG from getNodeWidth/Height = clientWidth/Height of the capture root.
   * Pin the capture box for fixed or intrinsic (max-content) window widths.
   */
  if (windowEl && layout.pinCaptureToWindow) {
    const cs = getComputedStyle(captureRoot);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const exportW = Math.ceil(windowEl.offsetWidth + pl + pr);
    restores.push(
      pushInlineStyles(captureRoot, {
        width: `${exportW}px`,
        "min-width": `${exportW}px`,
        "max-width": "none",
        height: "auto",
        "min-height": "min-content",
        "box-sizing": "border-box"
      })
    );
    void windowEl.offsetHeight;
    void captureRoot.offsetHeight;
  }

  return () => {
    for (let i = restores.length - 1; i >= 0; i -= 1) {
      restores[i]!();
    }
  };
}

/** Dimensions for html2canvas fallback (after export layout patches are applied). */
function measureCaptureNode(node: HTMLElement): { width: number; height: number } {
  const r = node.getBoundingClientRect();
  const width = Math.ceil(
    Math.max(node.scrollWidth, node.offsetWidth, node.clientWidth, r.width)
  );
  const height = Math.ceil(
    Math.max(node.scrollHeight, node.offsetHeight, node.clientHeight, r.height)
  );
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

async function rasterizeWithHtml2Canvas(
  node: HTMLElement,
  scale: number,
  dims: { width: number; height: number }
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(node, {
    backgroundColor: null,
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: dims.width,
    height: dims.height,
    windowWidth: dims.width,
    windowHeight: dims.height
  });
}

type HtmlToImageOpts = NonNullable<Parameters<typeof toBlob>[1]>;

export function CodeImageDialog({ open, onOpenChange, content, language, exportBasename }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const previewScrollerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fileBaseName, setFileBaseName] = useState("woxbin-code");
  const [presetId, setPresetId] = useState(CODE_IMAGE_PRESETS[0]!.id);
  const [format, setFormat] = useState<CodeImageExportFormat>("png");
  const [widthKey, setWidthKey] = useState("auto");
  const [scale, setScale] = useState(2);
  const [radiusKey, setRadiusKey] = useState("lg");
  const [paddingKey, setPaddingKey] = useState("comfort");
  const [showDots, setShowDots] = useState(true);
  const [windowShadow, setWindowShadow] = useState(true);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [webpQuality, setWebpQuality] = useState(0.92);
  const [settingsTab, setSettingsTab] = useState<CodeImageSettingsTab>("window");
  const [canvasPadX, setCanvasPadX] = useState<number>(CODE_IMAGE_DEFAULT_CANVAS_PAD.x);
  const [canvasPadY, setCanvasPadY] = useState<number>(CODE_IMAGE_DEFAULT_CANVAS_PAD.y);
  const [shadowOffsetY, setShadowOffsetY] = useState<number>(CODE_IMAGE_DEFAULT_SHADOW.offsetY);
  const [shadowBlur, setShadowBlur] = useState<number>(CODE_IMAGE_DEFAULT_SHADOW.blur);
  const [windowChrome, setWindowChrome] = useState<CodeImageWindowChrome>("mac");
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("Wox Bin");
  /** Carbon-style “Auto-adjust width”: grow frame to longest line when window width = Auto. */
  const [fitLongestLine, setFitLongestLine] = useState(true);
  /** Canva-style: set raster output by target width (px) vs 1×/2×/3× multiplier. */
  const [exportSizeMode, setExportSizeMode] = useState<ExportSizeMode>("width");
  const [exportTargetWidthPx, setExportTargetWidthPx] = useState(2400);
  const [preferPlaywrightExport, setPreferPlaywrightExport] = useState(false);

  useEffect(() => {
    if (open) {
      setFileBaseName(initialExportBaseFromTitle(exportBasename));
    }
  }, [open, exportBasename]);

  useCodeImagePrismTheme(
    useMemo(() => CODE_IMAGE_PRESETS.find((p) => p.id === presetId)?.prismTheme ?? "tomorrow", [presetId]),
    open
  );

  const preset = useMemo(
    () => CODE_IMAGE_PRESETS.find((p) => p.id === presetId) ?? CODE_IMAGE_PRESETS[0]!,
    [presetId]
  );

  const widthPx = useMemo(() => CODE_IMAGE_WIDTHS.find((w) => w.value === widthKey)?.px, [widthKey]);
  const radiusClass = useMemo(
    () => CODE_IMAGE_RADIUS.find((r) => r.value === radiusKey)?.className ?? "rounded-2xl",
    [radiusKey]
  );
  const codePadClass = useMemo(
    () => CODE_IMAGE_PADDING.find((p) => p.value === paddingKey)?.codeClass ?? "p-5 sm:p-6",
    [paddingKey]
  );

  const buildPreviewHtml = useCallback(() => {
    const grammar = prismGrammarForLanguage(language, content);
    const langObj = grammar !== "plain" ? Prism.languages[grammar] : null;
    const inner =
      langObj && grammar !== "plain"
        ? Prism.highlight(content, langObj, grammar)
        : content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const useFitLine = fitLongestLine && widthPx == null;
    const whiteSpace = useFitLine ? "pre" : "pre-wrap";
    const overflowWrap = useFitLine ? "normal" : "anywhere";
    const wordBreak = useFitLine ? "normal" : "break-word";

    return `<pre class="language-${grammar}" style="margin:0;max-width:100%;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;line-height:1.55;white-space:${whiteSpace};overflow-wrap:${overflowWrap};word-break:${wordBreak};"><code class="language-${grammar}">${inner}</code></pre>`;
  }, [content, language, fitLongestLine, widthPx]);

  const previewHtml = useMemo(() => buildPreviewHtml(), [buildPreviewHtml]);

  /** Live CSS box of the capture root in the preview (for slider bounds + estimated file pixels). */
  const [captureCssSize, setCaptureCssSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setCaptureCssSize(null);
      return;
    }
    const id = requestAnimationFrame(() => {
      const el = captureRef.current;
      if (!el) {
        return;
      }
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        setCaptureCssSize({ w, h });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [
    open,
    previewHtml,
    widthKey,
    fitLongestLine,
    widthPx,
    canvasPadX,
    canvasPadY,
    presetId,
    watermarkEnabled,
    watermarkText,
    windowShadow,
    shadowOffsetY,
    shadowBlur,
    paddingKey,
    radiusKey,
    showDots,
    windowChrome
  ]);

  useEffect(() => {
    if (!captureCssSize) {
      return;
    }
    const b = exportWidthSliderBounds(captureCssSize.w, captureCssSize.h);
    setExportTargetWidthPx((prev) => Math.min(b.max, Math.max(b.min, prev)));
  }, [captureCssSize]);

  const exportPixelPreview = useMemo(() => {
    if (!captureCssSize || format === "svg") {
      return null;
    }
    let pr = computeExportPixelRatio(
      captureCssSize.w,
      captureCssSize.h,
      exportSizeMode,
      scale,
      exportTargetWidthPx
    );
    pr = clampPixelRatioForTotalCanvasArea(captureCssSize.w, captureCssSize.h, pr);
    return {
      pr,
      outW: Math.round(captureCssSize.w * pr),
      outH: Math.round(captureCssSize.h * pr),
      usesTiling: needsVerticalTiling(captureCssSize.w, captureCssSize.h, pr)
    };
  }, [captureCssSize, exportSizeMode, exportTargetWidthPx, format, scale]);

  const exportWidthBounds = useMemo(() => {
    if (!captureCssSize) {
      return { min: 400, max: 8192 };
    }
    return exportWidthSliderBounds(captureCssSize.w, captureCssSize.h);
  }, [captureCssSize]);

  const cornerRadiusPxExport = useMemo(
    () => (radiusKey === "md" ? 12 : radiusKey === "xl" ? 24 : 16),
    [radiusKey]
  );
  const codePaddingPxExport = useMemo(
    () => (paddingKey === "cozy" ? 18 : paddingKey === "spacious" ? 32 : 24),
    [paddingKey]
  );

  const buildPlaywrightExportPayload = useCallback(() => {
    const pr = exportPixelPreview?.pr ?? scale;
    const deviceScaleFactor = Math.min(3, Math.max(1, pr));
    const viewportWidth = Math.min(
      4000,
      Math.max(320, Math.ceil((captureCssSize?.w ?? 900) + 120))
    );
    return {
      format: (format === "jpeg" ? "jpeg" : "png") as "png" | "jpeg",
      jpegQuality,
      deviceScaleFactor,
      viewportWidth,
      presetId,
      language,
      preCodeHtml: previewHtml,
      windowWidthPx: widthPx ?? null,
      canvasPadX,
      canvasPadY,
      showDots,
      watermarkText: watermarkEnabled ? (watermarkText.trim() || "Wox Bin") : null,
      cornerRadiusPx: cornerRadiusPxExport,
      codePaddingPx: codePaddingPxExport,
      fitLongestLine
    };
  }, [
    captureCssSize?.w,
    codePaddingPxExport,
    cornerRadiusPxExport,
    exportPixelPreview?.pr,
    fitLongestLine,
    format,
    jpegQuality,
    language,
    presetId,
    previewHtml,
    scale,
    showDots,
    watermarkEnabled,
    watermarkText,
    widthPx,
    canvasPadX,
    canvasPadY
  ]);

  const buildHtmlToImageOpts = useCallback(
    (lossyBg: string, pixelRatio: number): HtmlToImageOpts => ({
      pixelRatio,
      cacheBust: true,
      skipFonts: true,
      /* We clamp pixelRatio so canvas sides stay under HTML_TO_IMAGE_CANVAS_MAX; skip library rescale. */
      skipAutoScale: true,
      /* Radix dialog centers with translate; cloning can rasterize wrong without this */
      style: { transform: "none" },
      backgroundColor: format === "png" || format === "svg" ? "transparent" : lossyBg
    }),
    [format]
  );

  const runExport = useCallback(async () => {
    const node = captureRef.current;
    if (!node) {
      return null;
    }
    const windowEl = node.querySelector<HTMLElement>("[data-code-image-window]");
    const restoreLayout = beginExportLayoutUnclamp(node, previewScrollerRef.current, windowEl, {
      fixedWidthPx: widthPx,
      pinCaptureToWindow: widthPx != null || fitLongestLine
    });
    try {
      await flushCaptureLayout();
      const { width: capW, height: capH } = measureCaptureNode(node);
      let safePr = computeExportPixelRatio(capW, capH, exportSizeMode, scale, exportTargetWidthPx);
      safePr = clampPixelRatioForTotalCanvasArea(capW, capH, safePr);
      const useTiling = needsVerticalTiling(capW, capH, safePr);
      /* Do not pass options.width/height: html-to-image applies them to the clone and combined with
       wrong measurements produced paper-thin exports. Rely on capture root client size after unclamp. */
      const opts = buildHtmlToImageOpts(preset.flatExportBg, safePr);
      switch (format) {
        case "png": {
          let blob: Blob | null = null;
          if (!useTiling) {
            try {
              blob = await toBlob(node, opts);
            } catch {
              blob = null;
            }
          }
          if (!blob) {
            const canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
            blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob(resolve, "image/png");
            });
          }
          if (!blob) {
            throw new Error("Could not create PNG.");
          }
          return { kind: "blob" as const, blob, filename: exportFilename(fileBaseName, "png") };
        }
        case "jpeg": {
          let dataUrl = "";
          if (!useTiling) {
            try {
              dataUrl = await toJpeg(node, { ...opts, quality: jpegQuality });
            } catch {
              dataUrl = "";
            }
          }
          if (!dataUrl) {
            const canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
            dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
          }
          return {
            kind: "blob" as const,
            blob: dataUrlToBlob(dataUrl),
            filename: exportFilename(fileBaseName, "jpeg")
          };
        }
        case "webp": {
          let canvas: HTMLCanvasElement | null = null;
          if (!useTiling) {
            try {
              canvas = await toCanvas(node, opts);
            } catch {
              canvas = null;
            }
          }
          if (!canvas) {
            canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
          }
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/webp", webpQuality);
          });
          if (!blob) {
            throw new Error("Could not create WebP.");
          }
          return { kind: "blob" as const, blob, filename: exportFilename(fileBaseName, "webp") };
        }
        case "svg": {
          let dataUrl: string;
          try {
            dataUrl = await toSvg(node, opts);
          } catch (e) {
            throw new Error(
              e instanceof Error
                ? `SVG export failed: ${e.message}. Try PNG instead.`
                : "SVG export failed. Try PNG instead."
            );
          }
          const svg = svgExportDataUrlToXml(dataUrl);
          return {
            kind: "svg" as const,
            svg,
            filename: exportFilename(fileBaseName, "svg")
          };
        }
        default:
          return null;
      }
    } finally {
      restoreLayout();
    }
  }, [
    buildHtmlToImageOpts,
    fileBaseName,
    format,
    jpegQuality,
    preset.flatExportBg,
    scale,
    webpQuality,
    widthPx,
    fitLongestLine,
    exportSizeMode,
    exportTargetWidthPx
  ]);

  const download = useCallback(async () => {
    setBusy(true);
    setFeedback(null);
    try {
      if (
        PLAYWRIGHT_EXPORT_UI &&
        preferPlaywrightExport &&
        (format === "png" || format === "jpeg")
      ) {
        const res = await fetch("/api/workspace/code-image-export", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPlaywrightExportPayload())
        });
        if (!res.ok) {
          const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errJson?.error ?? `Server export failed (${res.status}).`);
        }
        const blob = await res.blob();
        triggerDownload(blob, exportFilename(fileBaseName, format));
        setFeedback("Download started (server / Playwright).");
        return;
      }

      const node = captureRef.current;
      if (!node) {
        setFeedback("Nothing to export.");
        return;
      }
      const result = await runExport();
      if (!result) {
        return;
      }
      if (result.kind === "blob") {
        triggerDownload(result.blob, result.filename);
        setFeedback("Download started.");
      } else {
        const blob = new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" });
        triggerDownload(blob, result.filename);
        setFeedback("SVG downloaded.");
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }, [buildPlaywrightExportPayload, fileBaseName, format, preferPlaywrightExport, runExport]);

  const copy = useCallback(async () => {
    if (!navigator.clipboard) {
      setFeedback("Clipboard not available in this context.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (
        PLAYWRIGHT_EXPORT_UI &&
        preferPlaywrightExport &&
        (format === "png" || format === "jpeg")
      ) {
        const res = await fetch("/api/workspace/code-image-export", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPlaywrightExportPayload())
        });
        if (!res.ok) {
          const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errJson?.error ?? `Server export failed (${res.status}).`);
        }
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setFeedback("Image copied (server / Playwright).");
        return;
      }

      const node = captureRef.current;
      if (!node) {
        return;
      }
      const windowEl = node.querySelector<HTMLElement>("[data-code-image-window]");
      const restoreLayout = beginExportLayoutUnclamp(node, previewScrollerRef.current, windowEl, {
        fixedWidthPx: widthPx,
        pinCaptureToWindow: widthPx != null || fitLongestLine
      });
      try {
      await flushCaptureLayout();
      const { width: capW, height: capH } = measureCaptureNode(node);
      let safePr = computeExportPixelRatio(capW, capH, exportSizeMode, scale, exportTargetWidthPx);
      safePr = clampPixelRatioForTotalCanvasArea(capW, capH, safePr);
      const useTiling = needsVerticalTiling(capW, capH, safePr);
      const opts = buildHtmlToImageOpts(preset.flatExportBg, safePr);
      if (format === "svg") {
        const dataUrl = await toSvg(node, opts);
        const svg = svgExportDataUrlToXml(dataUrl);
        await navigator.clipboard.writeText(svg);
        setFeedback("SVG copied to clipboard.");
        return;
      }

      if (format === "png") {
        let blob: Blob | null = null;
        if (!useTiling) {
          try {
            blob = await toBlob(node, opts);
          } catch {
            blob = null;
          }
        }
        if (!blob) {
          const canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
          blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/png");
          });
        }
        if (!blob) {
          throw new Error("Could not copy PNG.");
        }
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setFeedback("Image copied to clipboard.");
        return;
      }
      if (format === "jpeg") {
        let dataUrl = "";
        if (!useTiling) {
          try {
            dataUrl = await toJpeg(node, { ...opts, quality: jpegQuality });
          } catch {
            dataUrl = "";
          }
        }
        if (!dataUrl) {
          const canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
          dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
        }
        const blob = dataUrlToBlob(dataUrl);
        await navigator.clipboard.write([new ClipboardItem({ "image/jpeg": blob })]);
        setFeedback("JPEG copied to clipboard.");
        return;
      }
      let canvas: HTMLCanvasElement | null = null;
      if (!useTiling) {
        try {
          canvas = await toCanvas(node, opts);
        } catch {
          canvas = null;
        }
      }
      if (!canvas) {
        canvas = await rasterizeRasterToCanvas(node, capW, capH, safePr);
      }
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", webpQuality);
      });
      if (!blob) {
        throw new Error("Could not copy WebP.");
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        setFeedback("WebP copied to clipboard.");
      } catch {
        setFeedback("WebP copy not supported here — try PNG or download.");
      }
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Copy failed.");
      } finally {
        restoreLayout();
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Copy failed.");
    } finally {
      setBusy(false);
    }
  }, [
    buildHtmlToImageOpts,
    buildPlaywrightExportPayload,
    format,
    jpegQuality,
    preferPlaywrightExport,
    preset.flatExportBg,
    scale,
    webpQuality,
    widthPx,
    fitLongestLine,
    exportSizeMode,
    exportTargetWidthPx
  ]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const t = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const windowWidthStyle = useMemo((): CSSProperties => {
    if (widthPx != null) {
      /* True fixed frame width; preview column scrolls horizontally if narrower */
      return {
        width: widthPx,
        maxWidth: "none",
        minWidth: widthPx,
        boxSizing: "border-box",
        flexShrink: 0
      };
    }
    if (fitLongestLine) {
      /* Carbon-style auto-adjust: width follows longest line (capped). */
      return {
        width: "max-content",
        maxWidth: "min(1600px, 100%)",
        minWidth: 0,
        boxSizing: "border-box",
        flexShrink: 0
      };
    }
    /* Auto + no fit: use full preview column; code wraps */
    return { width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" };
  }, [widthPx, fitLongestLine]);

  const windowBoxShadow = useMemo(() => {
    if (!windowShadow) {
      return "none";
    }
    return `0 ${shadowOffsetY}px ${shadowBlur}px rgba(0,0,0,0.32)`;
  }, [windowShadow, shadowOffsetY, shadowBlur]);

  const useIntrinsicWidth = widthPx != null || fitLongestLine;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={
          /* Override Radix translate + zoom-in-95: they confuse html-to-image foreignObject sizing */
          "box-border max-h-[min(90vh,920px)] w-full max-w-[min(64rem,calc(100vw-1.5rem))] overflow-x-hidden overflow-y-auto left-4 right-4 top-6 translate-x-0 translate-y-0 mx-auto data-[state=open]:zoom-in-100 sm:left-4 sm:right-4"
        }
      >
        <DialogHeader>
          <DialogTitle>Export code image</DialogTitle>
          <DialogDescription>
            Layout inspired by{" "}
            <a className="text-primary underline-offset-2 hover:underline" href="https://carbon.now.sh/" rel="noreferrer" target="_blank">
              carbon.now.sh
            </a>
            : window, editor, export — then copy or download.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="flex min-h-0 min-w-0 flex-col gap-3 text-sm">
            <div className="flex gap-1 rounded-lg border border-border bg-muted/20 p-1" role="tablist">
              {(
                [
                  ["window", "Window"],
                  ["editor", "Editor"],
                  ["misc", "Misc"]
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                    settingsTab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setSettingsTab(id)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {settingsTab === "window" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-pad-x">
                        Padding (horiz) px
                      </label>
                      <Input
                        className="mt-1.5 font-mono text-xs"
                        id="code-image-pad-x"
                        inputMode="numeric"
                        min={0}
                        max={240}
                        onChange={(e) => {
                          const v = e.target.value === "" ? CODE_IMAGE_DEFAULT_CANVAS_PAD.x : Number(e.target.value);
                          setCanvasPadX(clampCanvasPad(v, CODE_IMAGE_DEFAULT_CANVAS_PAD.x));
                        }}
                        type="number"
                        value={canvasPadX}
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-pad-y">
                        Padding (vert) px
                      </label>
                      <Input
                        className="mt-1.5 font-mono text-xs"
                        id="code-image-pad-y"
                        inputMode="numeric"
                        min={0}
                        max={240}
                        onChange={(e) => {
                          const v = e.target.value === "" ? CODE_IMAGE_DEFAULT_CANVAS_PAD.y : Number(e.target.value);
                          setCanvasPadY(clampCanvasPad(v, CODE_IMAGE_DEFAULT_CANVAS_PAD.y));
                        }}
                        type="number"
                        value={canvasPadY}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-width">
                      Window width
                    </label>
                    <select
                      className="border-input bg-background mt-1.5 w-full rounded-md border px-2 py-2 text-sm"
                      id="code-image-width"
                      onChange={(e) => setWidthKey(e.target.value)}
                      value={widthKey}
                    >
                      {CODE_IMAGE_WIDTHS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                    <label className="mt-2 flex cursor-pointer items-center gap-2">
                      <input
                        checked={fitLongestLine}
                        disabled={widthKey !== "auto"}
                        onChange={(e) => setFitLongestLine(e.target.checked)}
                        type="checkbox"
                      />
                      <span className={cn("text-xs", widthKey !== "auto" && "text-muted-foreground")}>
                        Auto-adjust width (fit longest line)
                      </span>
                    </label>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                      When width is Auto and this is on, lines don’t wrap to the preview column — the frame grows like{" "}
                      <span className="whitespace-nowrap">Carbon</span>.
                    </p>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-radius">
                      Corner radius
                    </label>
                    <select
                      className="border-input bg-background mt-1.5 w-full rounded-md border px-2 py-2 text-sm"
                      id="code-image-radius"
                      onChange={(e) => setRadiusKey(e.target.value)}
                      value={radiusKey}
                    >
                      {CODE_IMAGE_RADIUS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-chrome">
                      Window controls
                    </label>
                    <label className="mt-2 flex cursor-pointer items-center gap-2">
                      <input checked={showDots} onChange={(e) => setShowDots(e.target.checked)} type="checkbox" />
                      <span className="text-xs">Show controls</span>
                    </label>
                    <select
                      className="border-input bg-background mt-2 w-full rounded-md border px-2 py-2 text-sm disabled:opacity-50"
                      disabled={!showDots}
                      id="code-image-chrome"
                      onChange={(e) => setWindowChrome(e.target.value as CodeImageWindowChrome)}
                      value={windowChrome}
                    >
                      {CODE_IMAGE_WINDOW_CHROME.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input checked={windowShadow} onChange={(e) => setWindowShadow(e.target.checked)} type="checkbox" />
                      <span className="text-xs font-medium">Drop shadow</span>
                    </label>
                    {windowShadow ? (
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-muted-foreground text-[11px]" htmlFor="code-image-sh-y">
                            Offset Y (px)
                          </label>
                          <Input
                            className="mt-1 font-mono text-xs"
                            id="code-image-sh-y"
                            inputMode="numeric"
                            min={0}
                            max={80}
                            onChange={(e) => setShadowOffsetY(clampShadowPx(Number(e.target.value), 80))}
                            type="number"
                            value={shadowOffsetY}
                          />
                        </div>
                        <div>
                          <label className="text-muted-foreground text-[11px]" htmlFor="code-image-sh-blur">
                            Blur (px)
                          </label>
                          <Input
                            className="mt-1 font-mono text-xs"
                            id="code-image-sh-blur"
                            inputMode="numeric"
                            min={0}
                            max={120}
                            onChange={(e) => setShadowBlur(clampShadowPx(Number(e.target.value), 120))}
                            type="number"
                            value={shadowBlur}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {settingsTab === "editor" ? (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Frame preset</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CODE_IMAGE_PRESETS.map((p) => (
                        <button
                          className={cn(
                            "rounded-lg border p-1.5 text-left transition hover:opacity-95",
                            presetId === p.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                          )}
                          key={p.id}
                          onClick={() => setPresetId(p.id)}
                          title={p.description}
                          type="button"
                        >
                          <div
                            className="relative h-8 w-full overflow-hidden rounded-md border border-white/10"
                            style={p.outerStyle}
                          >
                            <div
                              className="absolute bottom-0.5 left-1 right-1 top-2 rounded-sm border opacity-95"
                              style={{
                                background: p.codeBg,
                                borderColor: p.titleBarBorder
                              }}
                            />
                          </div>
                          <span className="mt-1 block truncate text-[10px] font-medium leading-tight">{p.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-muted-foreground mt-1.5 text-[11px]">{preset.description}</p>
                  </div>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-padding">
                      Code padding (inside window)
                    </label>
                    <select
                      className="border-input bg-background mt-1.5 w-full rounded-md border px-2 py-2 text-sm"
                      id="code-image-padding"
                      onChange={(e) => setPaddingKey(e.target.value)}
                      value={paddingKey}
                    >
                      {CODE_IMAGE_PADDING.map((pad) => (
                        <option key={pad.value} value={pad.value}>
                          {pad.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              {settingsTab === "misc" ? (
                <>
                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-format">
                      Format
                    </label>
                    <select
                      className="border-input bg-background mt-1.5 w-full rounded-md border px-2 py-2 text-sm"
                      id="code-image-format"
                      onChange={(e) => setFormat(e.target.value as CodeImageExportFormat)}
                      value={format}
                    >
                      {CODE_IMAGE_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    {PLAYWRIGHT_EXPORT_UI && (format === "png" || format === "jpeg") ? (
                      <div className="mt-3 rounded-md border border-border bg-muted/15 p-2.5">
                        <label className="flex cursor-pointer items-start gap-2">
                          <input
                            checked={preferPlaywrightExport}
                            className="mt-0.5"
                            onChange={(e) => setPreferPlaywrightExport(e.target.checked)}
                            type="checkbox"
                          />
                          <span className="text-xs leading-snug">
                            <span className="font-medium">Server render (Playwright)</span> — headless Chromium,
                            full-page capture (Canva-style). Best for very long files. Requires{" "}
                            <code className="rounded bg-muted px-1 text-[10px]">CODE_IMAGE_PLAYWRIGHT_EXPORT=1</code> on
                            the server and{" "}
                            <code className="rounded bg-muted px-1 text-[10px]">npx playwright install chromium</code>.
                            See <span className="font-mono text-[10px]">docs/CODE_IMAGE_SERVER.md</span>.
                          </span>
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-filename">
                      File name
                    </label>
                    <Input
                      className="mt-1.5"
                      id="code-image-filename"
                      onChange={(e) => setFileBaseName(e.target.value)}
                      placeholder="woxbin-code"
                      spellCheck={false}
                      value={fileBaseName}
                    />
                    <p className="text-muted-foreground mt-1 text-xs">
                      Extension added automatically ({CODE_IMAGE_FORMATS.find((f) => f.value === format)?.ext ?? "png"}).
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Raster size (PNG / JPEG / WebP)</p>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                      Like Canva: pick output width in pixels, or use a simple multiplier. Very long snippets are
                      rendered in vertical tiles (then stitched) so width stays sharp instead of one crushed strip.
                      Total pixels are also capped for browser limits (~240M).
                    </p>
                    {format === "svg" ? (
                      <p className="text-muted-foreground mt-1.5 text-[11px]">SVG is vector — size controls below apply to raster formats only.</p>
                    ) : null}

                    {format !== "svg" ? (
                      <>
                        <div className="mt-2 flex gap-1 rounded-lg border border-border bg-muted/20 p-1">
                          <button
                            className={cn(
                              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                              exportSizeMode === "width"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setExportSizeMode("width")}
                            type="button"
                          >
                            Width (px)
                          </button>
                          <button
                            className={cn(
                              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                              exportSizeMode === "scale"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => setExportSizeMode("scale")}
                            type="button"
                          >
                            Multiplier
                          </button>
                        </div>

                        {exportSizeMode === "width" ? (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-muted-foreground text-[11px] font-medium" htmlFor="code-image-out-w">
                                Output width
                              </label>
                              <span className="font-mono text-xs tabular-nums text-foreground">{exportTargetWidthPx}px</span>
                            </div>
                            <input
                              className="h-2 w-full cursor-pointer accent-primary"
                              id="code-image-out-w-slider"
                              max={exportWidthBounds.max}
                              min={exportWidthBounds.min}
                              onChange={(e) => setExportTargetWidthPx(Number(e.target.value))}
                              step={Math.max(1, Math.round((exportWidthBounds.max - exportWidthBounds.min) / 200))}
                              type="range"
                              value={exportTargetWidthPx}
                            />
                            <Input
                              className="font-mono text-xs"
                              id="code-image-out-w"
                              inputMode="numeric"
                              min={exportWidthBounds.min}
                              max={exportWidthBounds.max}
                              onChange={(e) => {
                                const v = e.target.value === "" ? exportWidthBounds.min : Number(e.target.value);
                                if (!Number.isFinite(v)) {
                                  return;
                                }
                                setExportTargetWidthPx(
                                  Math.min(exportWidthBounds.max, Math.max(exportWidthBounds.min, Math.round(v)))
                                );
                              }}
                              type="number"
                              value={exportTargetWidthPx}
                            />
                            <p className="text-muted-foreground text-[11px] leading-snug">
                              Range {exportWidthBounds.min}–{exportWidthBounds.max}px (from current preview size).{" "}
                              {exportPixelPreview ? (
                                <>
                                  Estimated file:{" "}
                                  <span className="font-mono text-foreground">
                                    {exportPixelPreview.outW} × {exportPixelPreview.outH}px
                                  </span>
                                  {exportPixelPreview.usesTiling ? (
                                    <span className="block pt-0.5">
                                      Long output uses several stacked captures (full width per strip) so text stays
                                      sharp — not one squashed canvas.
                                    </span>
                                  ) : null}
                                  {exportPixelPreview.outW < exportTargetWidthPx - 2 ? (
                                    <span className="block pt-0.5">
                                      (capped — very tall images can’t exceed the max canvas height at this width)
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                "Open preview to see estimated pixels."
                              )}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-scale">
                              Export multiplier
                            </label>
                            <select
                              className="border-input bg-background mt-1.5 w-full rounded-md border px-2 py-2 text-sm"
                              id="code-image-scale"
                              onChange={(e) => setScale(Number(e.target.value))}
                              value={scale}
                            >
                              {CODE_IMAGE_SCALES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            {exportPixelPreview ? (
                              <p className="text-muted-foreground mt-1 text-[11px]">
                                Estimated file:{" "}
                                <span className="font-mono text-foreground">
                                  {exportPixelPreview.outW} × {exportPixelPreview.outH}px
                                </span>
                              </p>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>

                  {(format === "jpeg" || format === "webp") && (
                    <div>
                      <label className="text-muted-foreground text-xs font-medium" htmlFor="code-image-quality">
                        {format === "jpeg" ? "JPEG" : "WebP"} quality (
                        {Math.round((format === "jpeg" ? jpegQuality : webpQuality) * 100)}%)
                      </label>
                      <input
                        className="mt-2 w-full accent-primary"
                        id="code-image-quality"
                        max={1}
                        min={0.5}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (format === "jpeg") {
                            setJpegQuality(v);
                          } else {
                            setWebpQuality(v);
                          }
                        }}
                        step={0.02}
                        type="range"
                        value={format === "jpeg" ? jpegQuality : webpQuality}
                      />
                    </div>
                  )}

                  <div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} type="checkbox" />
                      <span className="text-xs font-medium">Watermark</span>
                    </label>
                    {watermarkEnabled ? (
                      <Input
                        className="mt-2"
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Wox Bin"
                        spellCheck={false}
                        value={watermarkText}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 max-w-full flex-col overflow-hidden">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Preview</p>
            <div
              className="bg-muted/30 max-h-[min(52vh,520px)] min-h-[200px] min-w-0 overflow-y-auto overflow-x-auto overscroll-contain rounded-lg border border-border p-3 sm:p-4"
              ref={previewScrollerRef}
            >
              <div
                className={cn(
                  "box-border flex flex-col items-center",
                  useIntrinsicWidth ? "w-max max-w-none min-w-0" : "min-w-0 w-full max-w-full"
                )}
                ref={captureRef}
                style={{
                  ...preset.outerStyle,
                  boxSizing: "border-box",
                  paddingLeft: clampCanvasPad(canvasPadX),
                  paddingRight: clampCanvasPad(canvasPadX),
                  paddingTop: clampCanvasPad(canvasPadY),
                  paddingBottom: clampCanvasPad(canvasPadY)
                }}
              >
                <div className={cn(useIntrinsicWidth ? "shrink-0" : "w-full min-w-0 max-w-full")}>
                  <div
                    className={cn(
                      "flex min-w-0 flex-col overflow-hidden border",
                      radiusClass,
                      useIntrinsicWidth ? "mx-auto shrink-0" : "w-full max-w-full"
                    )}
                    data-code-image-window=""
                    style={{
                      ...windowWidthStyle,
                      borderColor: preset.titleBarBorder,
                      background: preset.titleBarBg,
                      boxShadow: windowBoxShadow
                    }}
                  >
                    <div
                      className="flex shrink-0 items-center gap-2 px-4 py-3"
                      style={{
                        background: preset.titleBarBg,
                        borderBottom: `1px solid ${preset.titleBarBorder}`
                      }}
                    >
                      {showDots ? (
                        <span className="flex items-center gap-2">
                          {windowChrome === "mac" ? (
                            <>
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full"
                                style={{ background: preset.dots[0] }}
                              />
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full"
                                style={{ background: preset.dots[1] }}
                              />
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full"
                                style={{ background: preset.dots[2] }}
                              />
                            </>
                          ) : null}
                          {windowChrome === "outline" ? (
                            <>
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                                style={{ borderColor: preset.dots[0] }}
                              />
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                                style={{ borderColor: preset.dots[1] }}
                              />
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                                style={{ borderColor: preset.dots[2] }}
                              />
                            </>
                          ) : null}
                          {windowChrome === "windows" ? (
                            <>
                              <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ background: preset.dots[0] }}
                              />
                              <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ background: preset.dots[1] }}
                              />
                              <span
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ background: preset.dots[2] }}
                              />
                            </>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">code</span>
                      )}
                      <span
                        className="ml-auto min-w-0 truncate text-xs uppercase tracking-wide"
                        style={{ color: preset.titleBarText }}
                        title={language}
                      >
                        {language}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "code-image-export-prism min-w-0 max-w-full overflow-y-visible text-left text-sm",
                        fitLongestLine && widthPx == null ? "overflow-x-auto" : "overflow-x-hidden",
                        codePadClass
                      )}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      style={{ backgroundColor: preset.codeBg }}
                    />
                  </div>
                </div>
                {watermarkEnabled ? (
                  <p
                    className="w-full shrink-0 pt-2 text-center text-[10px] font-medium tracking-wide opacity-50"
                    style={{ color: preset.titleBarText }}
                  >
                    {watermarkText.trim() || "Wox Bin"}
                  </p>
                ) : null}
              </div>
            </div>
            {feedback ? (
              <p aria-live="polite" className="text-muted-foreground mt-2 text-xs">
                {feedback}
              </p>
            ) : null}
          </div>
        </div>

        {/* Custom footer: avoid DialogFooter flex-col-reverse hiding actions on narrow viewports */}
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4 sm:mt-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
          <Button className="sm:order-1" onClick={() => onOpenChange(false)} type="button" variant="outline">
            Close
          </Button>
          <Button
            className="sm:order-3"
            disabled={busy}
            onClick={() => void download()}
            type="button"
            variant="default"
          >
            <Download className="mr-2 h-4 w-4" />
            {busy ? "Rendering…" : "Download"}
          </Button>
          <Button
            className="sm:order-2"
            disabled={busy}
            onClick={() => void copy()}
            type="button"
            variant="secondary"
          >
            {busy ? "Working…" : "Copy image"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
