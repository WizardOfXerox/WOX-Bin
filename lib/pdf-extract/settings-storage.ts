import type { DpiPreset } from "./dpi";

export const PDF_EXTRACT_STORAGE_KEY = "wox-pdf-extract-settings-v1";

export type ExportPackageMode = "png-zip" | "jpeg-zip" | "txt-zip" | "docx";

export type PdfExtractStoredSettings = {
  exportDpi: DpiPreset;
  exportMode: ExportPackageMode;
  jpegQualityPercent: number;
  pageRange: string;
  includePerPageText: boolean;
  combinedTextFile: boolean;
  includeTextInDocx: boolean;
  exportScope: "active" | "all";
};

export const defaultPdfExtractSettings: PdfExtractStoredSettings = {
  exportDpi: 150,
  exportMode: "png-zip",
  jpegQualityPercent: 92,
  pageRange: "all",
  includePerPageText: true,
  combinedTextFile: false,
  includeTextInDocx: true,
  exportScope: "active"
};

export function loadPdfExtractSettings(): PdfExtractStoredSettings {
  if (typeof window === "undefined") {
    return { ...defaultPdfExtractSettings };
  }
  try {
    const raw = localStorage.getItem(PDF_EXTRACT_STORAGE_KEY);
    if (!raw) {
      return { ...defaultPdfExtractSettings };
    }
    const parsed = JSON.parse(raw) as Partial<PdfExtractStoredSettings>;
    return {
      ...defaultPdfExtractSettings,
      ...parsed,
      exportDpi: clampDpi(parsed.exportDpi ?? defaultPdfExtractSettings.exportDpi),
      jpegQualityPercent: clampQuality(parsed.jpegQualityPercent ?? defaultPdfExtractSettings.jpegQualityPercent),
      exportMode: isMode(parsed.exportMode) ? parsed.exportMode : defaultPdfExtractSettings.exportMode,
      exportScope: parsed.exportScope === "all" ? "all" : "active"
    };
  } catch {
    return { ...defaultPdfExtractSettings };
  }
}

export function savePdfExtractSettings(s: PdfExtractStoredSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(PDF_EXTRACT_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

function clampDpi(n: number): DpiPreset {
  if (n === 72 || n === 150 || n === 300 || n === 600) {
    return n;
  }
  return 150;
}

function clampQuality(n: number): number {
  if (!Number.isFinite(n)) {
    return 92;
  }
  return Math.min(100, Math.max(10, Math.round(n)));
}

function isMode(m: unknown): m is ExportPackageMode {
  return m === "png-zip" || m === "jpeg-zip" || m === "txt-zip" || m === "docx";
}
