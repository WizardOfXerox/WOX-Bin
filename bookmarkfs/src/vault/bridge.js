import { WOXBIN_STORAGE } from "../cloud/woxbin-profiles.js";
import { storageLocalGet, storageLocalRemove, storageLocalSet } from "../storage/chrome-local.js";

function trimString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function normalizeAttachment(rawAttachment) {
  if (!rawAttachment || typeof rawAttachment !== "object") {
    return null;
  }

  const filename = trimString(rawAttachment.filename || "attachment", 180);
  const content = typeof rawAttachment.content === "string" ? rawAttachment.content : "";
  const language = trimString(rawAttachment.language || "none", 40) || "none";
  const mediaKind =
    rawAttachment.mediaKind === "image" || rawAttachment.mediaKind === "video" ? rawAttachment.mediaKind : undefined;
  const mimeType = typeof rawAttachment.mimeType === "string" ? rawAttachment.mimeType.slice(0, 120) : undefined;

  if (!content) {
    return null;
  }

  return {
    filename,
    content,
    language,
    ...(mediaKind ? { mediaKind } : {}),
    ...(mimeType ? { mimeType } : {})
  };
}

export function normalizePendingComposePayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  const visibility =
    rawPayload.visibility === "public" || rawPayload.visibility === "unlisted" || rawPayload.visibility === "private"
      ? rawPayload.visibility
      : undefined;

  const language = trimString(rawPayload.language || "none", 40) || "none";
  const folderName = trimString(rawPayload.folderName || "", 120);
  const tags = Array.isArray(rawPayload.tags)
    ? rawPayload.tags
        .map((tag) => trimString(tag, 40))
        .filter(Boolean)
        .slice(0, 50)
    : [];

  return {
    title: trimString(rawPayload.title || "Untitled", 500) || "Untitled",
    content: typeof rawPayload.content === "string" ? rawPayload.content : "",
    ...(visibility ? { visibility } : {}),
    language,
    ...(folderName ? { folderName } : {}),
    ...(tags.length ? { tags } : {}),
    pinned: Boolean(rawPayload.pinned),
    favorite: Boolean(rawPayload.favorite),
    mirrorLocal: Boolean(rawPayload.mirrorLocal),
    sourceType: trimString(rawPayload.sourceType || "extension", 40) || "extension",
    sourceUrl: trimString(rawPayload.sourceUrl || "", 2048),
    sourceTitle: trimString(rawPayload.sourceTitle || "", 500),
    attachments: Array.isArray(rawPayload.attachments)
      ? rawPayload.attachments.map(normalizeAttachment).filter(Boolean).slice(0, 20)
      : [],
    ts: Number.isFinite(rawPayload.ts) ? rawPayload.ts : Date.now()
  };
}

export async function setPendingCompose(rawPayload) {
  const payload = normalizePendingComposePayload(rawPayload);
  if (!payload) {
    throw new Error("Invalid pending compose payload.");
  }
  await storageLocalSet({ [WOXBIN_STORAGE.pendingCompose]: payload });
  return payload;
}

export async function takePendingCompose() {
  const data = await storageLocalGet([WOXBIN_STORAGE.pendingCompose]);
  const payload = normalizePendingComposePayload(data[WOXBIN_STORAGE.pendingCompose]);
  if (payload) {
    await storageLocalRemove([WOXBIN_STORAGE.pendingCompose]);
  }
  return payload;
}
