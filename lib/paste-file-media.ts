import type { PasteFileDraft, PasteFileMediaKind } from "@/lib/types";

const ALLOWED_MIME = new Set<string>();

export function normalizeAttachmentMimeType(mime: string): string {
  if (!mime || !mime.trim()) {
    return "application/octet-stream";
  }
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "image/jpg") {
    return "image/jpeg";
  }
  return base || "application/octet-stream";
}

export function isAllowedPasteMediaMime(mime: string): boolean {
  // Allow all MIME types since we want to support any file format!
  return true;
}

export function mediaKindFromMime(mime: string): PasteFileMediaKind | null {
  const n = normalizeAttachmentMimeType(mime);
  if (n.startsWith("image/")) {
    return "image";
  }
  if (n.startsWith("video/")) {
    return "video";
  }
  return "file";
}

export function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const trimmed = dataUrl.trim();
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(trimmed);
  if (!match) {
    return null;
  }
  const mimeType = normalizeAttachmentMimeType(match[1] ?? "");
  const base64 = (match[2] ?? "").replace(/\s/g, "");
  if (!mimeType || !base64) {
    return null;
  }
  return { mimeType, base64 };
}

/** Build a data URL for <img> / <video src> from stored attachment fields. */
export function dataUrlFromPasteFile(file: Pick<PasteFileDraft, "content" | "mimeType" | "mediaKind">): string | null {
  if (!file.mediaKind || !file.mimeType || !file.content?.trim()) {
    return null;
  }
  const mime = normalizeAttachmentMimeType(file.mimeType);
  const b64 = file.content.replace(/\s/g, "");
  return `data:${mime};base64,${b64}`;
}

export function isPasteFileMedia(file: Pick<PasteFileDraft, "mediaKind">): boolean {
  return file.mediaKind === "image" || file.mediaKind === "video";
}
