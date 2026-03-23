import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { and, eq, isNull, ne } from "drizzle-orm";

import { logAudit } from "@/lib/audit";
import { randomToken, hashToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { publicDrops } from "@/lib/db/schema";
import { asciiContentDispositionFilename, safeDownloadBasename } from "@/lib/paste-download";
import { normalizeOptionalSlug } from "@/lib/utils";

export const TERMBIN_MAX_TEXT_BYTES = 512 * 1024;
export const FILE_DROP_MAX_BYTES = 4 * 1024 * 1024;
export const FILE_DROP_DEFAULT_HOURS = 24 * 7;
export const FILE_DROP_MAX_HOURS = 24 * 30;
export const FILE_DROP_MIN_HOURS = 1;
export const CLIPBOARD_DEFAULT_HOURS = 24;
export const CLIPBOARD_MAX_TEXT_BYTES = 256 * 1024;
export const CLIPBOARD_MIN_SLUG = 3;
export const CLIPBOARD_MAX_SLUG = 48;

type PublicDropRow = typeof publicDrops.$inferSelect;

export class PublicDropError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function buildTermbinPath(slug: string) {
  return `/t/${encodeURIComponent(slug)}`;
}

export function buildFileDropPath(slug: string, filename?: string | null) {
  const base = `/x/${encodeURIComponent(slug)}`;
  if (!filename?.trim()) {
    return base;
  }
  return `${base}/${encodeURIComponent(safeDownloadBasename(filename, "file"))}`;
}

export function buildClipboardPath(slug: string) {
  return `/c/${encodeURIComponent(slug)}`;
}

function makeDropSlug(secret = false) {
  const raw = randomToken().replace(/[^a-z0-9]/gi, "");
  return (secret ? raw.slice(0, 32) : raw.slice(0, 12)).toLowerCase();
}

async function ensureUniqueDropSlug(secret = false) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = makeDropSlug(secret);
    const [existing] = await db.select({ id: publicDrops.id }).from(publicDrops).where(eq(publicDrops.slug, slug)).limit(1);
    if (!existing) {
      return slug;
    }
  }
  return makeDropSlug(true);
}

function normalizeMime(mime: string | null | undefined, fallback: string) {
  const trimmed = mime?.trim().toLowerCase();
  return trimmed ? trimmed.slice(0, 160) : fallback;
}

function isPrivateIpv4(address: string) {
  return (
    address.startsWith("10.") ||
    address.startsWith("127.") ||
    address.startsWith("192.168.") ||
    address.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized === "::"
  );
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    return isPrivateIpv6(address);
  }
  return true;
}

export async function assertSafeRemoteSource(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicDropError("Invalid remote URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PublicDropError("Only http and https remote URLs are allowed.", 400);
  }

  const hostname = url.hostname.trim().toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) {
    throw new PublicDropError("Remote URL must point to a public host.", 400);
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new PublicDropError("Remote URL must point to a public host.", 400);
  }

  const addresses = await lookup(hostname, { all: true });
  if (addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new PublicDropError("Remote URL must point to a public host.", 400);
  }

  return url;
}

export function parseDropExpires(value: string | null | undefined, fallbackHours: number) {
  if (!value || !value.trim()) {
    return new Date(Date.now() + fallbackHours * 60 * 60 * 1000);
  }

  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new PublicDropError("Invalid expires value.", 400);
  }

  let expiresAt: Date;
  if (parsed >= 1_000_000_000_000) {
    expiresAt = new Date(parsed);
  } else {
    expiresAt = new Date(Date.now() + parsed * 60 * 60 * 1000);
  }

  if (Number.isNaN(expiresAt.getTime())) {
    throw new PublicDropError("Invalid expires value.", 400);
  }

  const minAt = Date.now() + FILE_DROP_MIN_HOURS * 60 * 60 * 1000;
  const maxAt = Date.now() + FILE_DROP_MAX_HOURS * 60 * 60 * 1000;
  const clamped = Math.min(maxAt, Math.max(minAt, expiresAt.getTime()));

  return new Date(clamped);
}

function normalizeClipboardSlug(raw: string) {
  const slug = normalizeOptionalSlug(raw).slice(0, CLIPBOARD_MAX_SLUG);
  if (slug.length < CLIPBOARD_MIN_SLUG) {
    throw new PublicDropError(
      `Clipboard keys must be ${CLIPBOARD_MIN_SLUG}-${CLIPBOARD_MAX_SLUG} characters using letters, numbers, dashes, or underscores.`,
      400
    );
  }
  return slug;
}

async function expireIfNeeded(row: PublicDropRow) {
  if (!row.expiresAt || row.expiresAt.getTime() > Date.now()) {
    return false;
  }

  await db
    .update(publicDrops)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(publicDrops.id, row.id));

  return true;
}

export async function createTextDrop(input: {
  content: string;
  ip?: string | null;
  userAgent?: string | null;
  burnAfterRead?: boolean;
  expires?: string | null;
  manageToken?: string | null;
  desiredSlug?: string | null;
}) {
  const bytes = Buffer.byteLength(input.content, "utf8");
  if (bytes === 0) {
    throw new PublicDropError("Refusing to publish an empty paste.", 400);
  }
  if (bytes > TERMBIN_MAX_TEXT_BYTES) {
    throw new PublicDropError(`Text exceeds ${TERMBIN_MAX_TEXT_BYTES} bytes.`, 413);
  }

  const slug = input.desiredSlug?.trim()
    ? normalizeClipboardSlug(input.desiredSlug)
    : await ensureUniqueDropSlug(false);
  const expiresAt = parseDropExpires(input.expires ?? null, FILE_DROP_DEFAULT_HOURS);
  const manageToken = input.manageToken?.trim() ? input.manageToken.trim() : null;

  await db.insert(publicDrops).values({
    slug,
    kind: "text",
    filename: "stdin.txt",
    mimeType: "text/plain; charset=utf-8",
    contentText: input.content,
    contentBase64: null,
    sizeBytes: bytes,
    deleteTokenHash: manageToken ? hashToken(manageToken) : null,
    burnAfterRead: Boolean(input.burnAfterRead),
    status: "active",
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await logAudit({
    action: "public_drop.text_created",
    targetType: "public_drop",
    targetId: slug,
    ip: input.ip ?? null,
    metadata: {
      kind: "text",
      sizeBytes: bytes,
      userAgent: input.userAgent ?? null
    }
  });

  return {
    slug,
    urlPath: buildTermbinPath(slug),
    expiresAt: expiresAt.toISOString(),
    manageToken
  };
}

export async function createFileDrop(input: {
  filename: string;
  mimeType: string;
  contentBase64: string;
  sizeBytes: number;
  ip?: string | null;
  userAgent?: string | null;
  secret?: boolean;
  expires?: string | null;
}) {
  if (!input.contentBase64.trim() || input.sizeBytes <= 0) {
    throw new PublicDropError("Missing uploaded file.", 400);
  }
  if (input.sizeBytes > FILE_DROP_MAX_BYTES) {
    throw new PublicDropError(`File exceeds ${FILE_DROP_MAX_BYTES} bytes.`, 413);
  }

  const slug = await ensureUniqueDropSlug(Boolean(input.secret));
  const filename = safeDownloadBasename(input.filename || "file.bin", "file.bin");
  const deleteToken = randomToken("drop");
  const expiresAt = parseDropExpires(input.expires ?? null, FILE_DROP_DEFAULT_HOURS);

  await db.insert(publicDrops).values({
    slug,
    kind: "file",
    filename,
    mimeType: normalizeMime(input.mimeType, "application/octet-stream"),
    contentText: null,
    contentBase64: input.contentBase64,
    sizeBytes: input.sizeBytes,
    deleteTokenHash: hashToken(deleteToken),
    burnAfterRead: false,
    status: "active",
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await logAudit({
    action: "public_drop.file_created",
    targetType: "public_drop",
    targetId: slug,
    ip: input.ip ?? null,
    metadata: {
      kind: "file",
      filename,
      sizeBytes: input.sizeBytes,
      userAgent: input.userAgent ?? null
    }
  });

  return {
    slug,
    filename,
    deleteToken,
    urlPath: buildFileDropPath(slug, filename),
    expiresAt: expiresAt.toISOString()
  };
}

export async function getDropForServe(slug: string) {
  const [row] = await db
    .select()
    .from(publicDrops)
    .where(and(eq(publicDrops.slug, slug), ne(publicDrops.status, "deleted"), isNull(publicDrops.deletedAt)))
    .limit(1);

  if (!row) {
    return null;
  }

  const expired = await expireIfNeeded(row);
  if (expired) {
    return null;
  }

  return row;
}

function tokenMatches(row: PublicDropRow, token: string | null | undefined) {
  return Boolean(row.deleteTokenHash && token && hashToken(token) === row.deleteTokenHash);
}

export async function getClipboardBucket(slug: string, token?: string | null) {
  const row = await getDropForServe(normalizeClipboardSlug(slug));
  if (!row) {
    return null;
  }
  if (row.kind !== "text") {
    throw new PublicDropError("That key is already used for a different item.", 409);
  }

  const canManage = tokenMatches(row, token ?? null);
  if (!canManage) {
    await incrementDropView(row);
  }

  return {
    slug: row.slug,
    content: row.contentText ?? "",
    expiresAt: row.expiresAt?.toISOString() ?? null,
    burnAfterRead: row.burnAfterRead,
    viewCount: row.viewCount + (canManage ? 0 : 1),
    canManage
  };
}

export async function saveClipboardBucket(input: {
  slug: string;
  content: string;
  burnAfterRead?: boolean;
  expires?: string | null;
  token?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const slug = normalizeClipboardSlug(input.slug);
  const bytes = Buffer.byteLength(input.content, "utf8");
  if (bytes === 0) {
    throw new PublicDropError("Clipboard bucket content cannot be empty.", 400);
  }
  if (bytes > CLIPBOARD_MAX_TEXT_BYTES) {
    throw new PublicDropError(`Clipboard bucket exceeds ${CLIPBOARD_MAX_TEXT_BYTES} bytes.`, 413);
  }

  const [existing] = await db
    .select()
    .from(publicDrops)
    .where(and(eq(publicDrops.slug, slug), ne(publicDrops.status, "deleted"), isNull(publicDrops.deletedAt)))
    .limit(1);

  const expiresAt = parseDropExpires(input.expires ?? null, CLIPBOARD_DEFAULT_HOURS);

  if (existing) {
    if (await expireIfNeeded(existing)) {
      return saveClipboardBucket(input);
    }
    if (existing.kind !== "text") {
      throw new PublicDropError("That key is already used for a different item.", 409);
    }
    if (!tokenMatches(existing, input.token ?? null)) {
      throw new PublicDropError("Clipboard bucket already exists. Use the original manage token to update it.", 403);
    }

    await db
      .update(publicDrops)
      .set({
        contentText: input.content,
        sizeBytes: bytes,
        burnAfterRead: Boolean(input.burnAfterRead),
        expiresAt,
        updatedAt: new Date()
      })
      .where(eq(publicDrops.id, existing.id));

    await logAudit({
      action: "public_drop.clipboard_updated",
      targetType: "public_drop",
      targetId: slug,
      ip: input.ip ?? null,
      metadata: {
        sizeBytes: bytes,
        userAgent: input.userAgent ?? null
      }
    });

    return {
      slug,
      manageToken: input.token?.trim() ?? null,
      created: false,
      urlPath: buildClipboardPath(slug),
      expiresAt: expiresAt.toISOString()
    };
  }

  const manageToken = input.token?.trim() || randomToken("clip");
  await db.insert(publicDrops).values({
    slug,
    kind: "text",
    filename: `${slug}.txt`,
    mimeType: "text/plain; charset=utf-8",
    contentText: input.content,
    contentBase64: null,
    sizeBytes: bytes,
    deleteTokenHash: hashToken(manageToken),
    burnAfterRead: Boolean(input.burnAfterRead),
    status: "active",
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await logAudit({
    action: "public_drop.clipboard_created",
    targetType: "public_drop",
    targetId: slug,
    ip: input.ip ?? null,
    metadata: {
      sizeBytes: bytes,
      userAgent: input.userAgent ?? null
    }
  });

  return {
    slug,
    manageToken,
    created: true,
    urlPath: buildClipboardPath(slug),
    expiresAt: expiresAt.toISOString()
  };
}

export async function deleteClipboardBucket(slug: string, token: string) {
  await deleteDropByToken(normalizeClipboardSlug(slug), token);
}

export async function incrementDropView(row: PublicDropRow) {
  const nextViews = row.viewCount + 1;
  await db
    .update(publicDrops)
    .set({
      viewCount: nextViews,
      updatedAt: new Date(),
      ...(row.burnAfterRead
        ? {
            status: "deleted" as const,
            deletedAt: new Date()
          }
        : {})
    })
    .where(eq(publicDrops.id, row.id));
}

async function requireManageableDrop(slug: string, token: string) {
  const row = await getDropForServe(slug);
  if (!row) {
    throw new PublicDropError("File not found.", 404);
  }
  if (!row.deleteTokenHash) {
    throw new PublicDropError("This file cannot be managed.", 403);
  }
  if (hashToken(token) !== row.deleteTokenHash) {
    throw new PublicDropError("Invalid management token.", 403);
  }
  return row;
}

export async function deleteDropByToken(slug: string, token: string) {
  const row = await requireManageableDrop(slug, token);

  await db
    .update(publicDrops)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(publicDrops.id, row.id));

  await logAudit({
    action: "public_drop.deleted",
    targetType: "public_drop",
    targetId: slug
  });
}

export async function updateDropExpiryByToken(slug: string, token: string, expires: string | null | undefined) {
  const row = await requireManageableDrop(slug, token);
  const expiresAt = parseDropExpires(expires ?? null, FILE_DROP_DEFAULT_HOURS);

  await db
    .update(publicDrops)
    .set({
      expiresAt,
      updatedAt: new Date()
    })
    .where(eq(publicDrops.id, row.id));

  await logAudit({
    action: "public_drop.expires_updated",
    targetType: "public_drop",
    targetId: slug,
    metadata: {
      expiresAt: expiresAt.toISOString()
    }
  });

  return expiresAt;
}

export function buildDropResponse(row: PublicDropRow, options?: { download?: boolean; filenameOverride?: string | null }) {
  const filename = safeDownloadBasename(options?.filenameOverride || row.filename || row.slug, row.slug);
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": row.kind === "text" ? row.mimeType : normalizeMime(row.mimeType, "application/octet-stream")
  });

  if (options?.download) {
    const asciiName = asciiContentDispositionFilename(filename);
    headers.set("Content-Disposition", `attachment; filename="${asciiName}"`);
  } else if (row.kind === "file") {
    const asciiName = asciiContentDispositionFilename(filename);
    headers.set("Content-Disposition", `inline; filename="${asciiName}"`);
  }

  if (row.kind === "text") {
    return new Response(row.contentText ?? "", { headers });
  }

  const bytes = Buffer.from(row.contentBase64 ?? "", "base64");
  return new Response(bytes, { headers });
}
