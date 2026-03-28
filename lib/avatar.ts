const ACCOUNT_AVATAR_DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/i;

export const ACCOUNT_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const ACCOUNT_AVATAR_MAX_MB = Math.floor(ACCOUNT_AVATAR_MAX_BYTES / (1024 * 1024));
export const ACCOUNT_AVATAR_MAX_DATA_URL_LENGTH = Math.ceil((ACCOUNT_AVATAR_MAX_BYTES * 4) / 3) + 128;
export const ACCOUNT_AVATAR_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif"
] as const;

export type ParsedStoredAvatar = {
  mimeType: string;
  base64: string;
  bytes: number;
};

function getBase64ByteLength(base64: string) {
  const compact = base64.replace(/\s/g, "");
  const padding = compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0;
  return Math.floor((compact.length * 3) / 4) - padding;
}

export function parseStoredAvatarDataUrl(value: string): ParsedStoredAvatar | null {
  const trimmed = value.trim();
  const match = ACCOUNT_AVATAR_DATA_URL_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, "");
  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    return null;
  }

  const bytes = getBase64ByteLength(base64);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }

  return {
    mimeType,
    base64,
    bytes
  };
}

export function isExternalImageUrl(value: string | null | undefined) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

export function isStoredAvatarDataUrl(value: string | null | undefined) {
  return typeof value === "string" && parseStoredAvatarDataUrl(value) !== null;
}

export function buildUserAvatarProxyPath(userId: string) {
  return `/api/avatar/${encodeURIComponent(userId)}`;
}

export function resolveUserImageForClient(image: string | null | undefined, userId: string | null | undefined) {
  if (!image?.trim()) {
    return null;
  }

  if (userId && isStoredAvatarDataUrl(image)) {
    return buildUserAvatarProxyPath(userId);
  }

  return image.trim();
}
