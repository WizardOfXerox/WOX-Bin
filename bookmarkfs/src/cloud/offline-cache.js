import { storageLocalGet, storageLocalSet } from "../storage/chrome-local.js";
import { WOXBIN_STORAGE } from "./woxbin-profiles.js";

export const OFFLINE_CACHE_MAX = 30;

export function sanitizeFilenamePart(value, fallback = "file") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export function extensionFromLanguage(language) {
  switch ((language || "").toLowerCase()) {
    case "markdown":
      return "md";
    case "javascript":
      return "js";
    case "typescript":
      return "ts";
    case "python":
      return "py";
    case "bash":
      return "sh";
    case "json":
      return "json";
    default:
      return "txt";
  }
}

function inferAttachmentMime(file) {
  if (file?.mimeType) {
    return String(file.mimeType);
  }
  if (file?.mediaKind === "image") {
    return "image/png";
  }
  if (file?.mediaKind === "video") {
    return "video/mp4";
  }
  return "text/plain;charset=utf-8";
}

function inferAttachmentFilename(file, index) {
  const raw = sanitizeFilenamePart(file?.filename || "", `attachment-${index + 1}`);
  if (raw.includes(".")) {
    return raw;
  }
  const languageExt = extensionFromLanguage(file?.language || "none");
  if (file?.mediaKind === "image") {
    return `${raw}.png`;
  }
  if (file?.mediaKind === "video") {
    return `${raw}.mp4`;
  }
  return `${raw}.${languageExt}`;
}

export function buildOfflineCacheAssets(entry) {
  const slugBase = sanitizeFilenamePart(entry?.slug || entry?.title || "paste", "paste");
  const titleBase = sanitizeFilenamePart(entry?.title || entry?.slug || "paste", slugBase);
  const assets = [];

  assets.push({
    id: "body",
    label: "Main body",
    filename: `${titleBase}.${extensionFromLanguage(entry?.language || "none")}`,
    kind: "text",
    mimeType:
      (entry?.language || "").toLowerCase() === "markdown"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
    textContent: String(entry?.content || ""),
    previewable: true
  });

  (Array.isArray(entry?.files) ? entry.files : []).forEach((file, index) => {
    const mediaKind = file?.mediaKind === "image" || file?.mediaKind === "video" ? file.mediaKind : "text";
    assets.push({
      id: `file-${index}`,
      label: file?.filename || `Attachment ${index + 1}`,
      filename: inferAttachmentFilename(file, index),
      kind: mediaKind,
      mimeType: inferAttachmentMime(file),
      textContent: mediaKind === "text" ? String(file?.content || "") : "",
      base64Content: mediaKind === "image" || mediaKind === "video" ? String(file?.content || "") : "",
      previewable: true
    });
  });

  return assets;
}

export function offlineAssetToBlob(asset) {
  if (asset.kind === "image" || asset.kind === "video") {
    const raw = atob(asset.base64Content || "");
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      bytes[i] = raw.charCodeAt(i);
    }
    return new Blob([bytes], { type: asset.mimeType || "application/octet-stream" });
  }
  return new Blob([String(asset.textContent || "")], { type: asset.mimeType || "text/plain;charset=utf-8" });
}

export async function loadOfflineCacheEntries() {
  const data = await storageLocalGet([WOXBIN_STORAGE.offlineCache]);
  return Array.isArray(data[WOXBIN_STORAGE.offlineCache]) ? data[WOXBIN_STORAGE.offlineCache] : [];
}

export async function saveOfflineCacheEntries(entries) {
  await storageLocalSet({ [WOXBIN_STORAGE.offlineCache]: Array.isArray(entries) ? entries : [] });
}

export async function pushOfflineCacheEntry(entry) {
  const current = await loadOfflineCacheEntries();
  const next = [entry, ...current.filter((item) => item.slug !== entry.slug)].slice(0, OFFLINE_CACHE_MAX);
  await saveOfflineCacheEntries(next);
}

export async function removeOfflineCacheEntry(slug) {
  const current = await loadOfflineCacheEntries();
  const next = current.filter((item) => item.slug !== slug);
  await saveOfflineCacheEntries(next);
  return next;
}
