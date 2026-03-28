import { and, eq, isNull, ne } from "drizzle-orm";

import { logAudit } from "@/lib/audit";
import { hashToken, randomToken } from "@/lib/crypto";
import { db } from "@/lib/db";
import { pastes } from "@/lib/db/schema";

const ENCRYPTED_SECRET_TITLE = "Encrypted secret link";
const ENCRYPTED_SECRET_CONTENT =
  "This secret is encrypted client-side. Open the shared URL with its fragment key to decrypt it.";
const MAX_CIPHERTEXT_LENGTH = 3_000_000;
const MAX_IV_LENGTH = 256;

export const ENCRYPTED_SECRET_EXPIRY_PRESETS = {
  "1-day": { label: "1 day", hours: 24 },
  "7-days": { label: "7 days", hours: 24 * 7 },
  "30-days": { label: "30 days", hours: 24 * 30 },
  never: { label: "Never", hours: null }
} as const;

export type EncryptedSecretExpiryPreset = keyof typeof ENCRYPTED_SECRET_EXPIRY_PRESETS;

export type EncryptedSecretShareRecord = {
  slug: string;
  title: string;
  content: string;
  payloadCiphertext: string;
  payloadIv: string;
  viewCount: number;
  burnAfterRead: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  lastViewedAt: Date | null;
};

export type EncryptedSecretManageSnapshot = {
  slug: string;
  status: "active" | "deleted" | "hidden";
  viewCount: number;
  burnAfterRead: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  updatedAt: Date;
  deletedAt: Date | null;
  lastViewedAt: Date | null;
};

function assertCiphertext(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (trimmed.length > MAX_CIPHERTEXT_LENGTH) {
    throw new Error(`${label} is too large.`);
  }
  return trimmed;
}

function assertIv(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  if (trimmed.length > MAX_IV_LENGTH) {
    throw new Error(`${label} is too large.`);
  }
  return trimmed;
}

function expiresAtFromPreset(preset: EncryptedSecretExpiryPreset) {
  const match = ENCRYPTED_SECRET_EXPIRY_PRESETS[preset];
  if (!match || match.hours == null) {
    return null;
  }
  return new Date(Date.now() + match.hours * 60 * 60 * 1000);
}

async function createUniqueSlug() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomToken().replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12);
    const [existing] = await db.select({ id: pastes.id }).from(pastes).where(eq(pastes.slug, candidate)).limit(1);
    if (!existing) {
      return candidate;
    }
  }

  return randomToken().replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24);
}

async function softDeleteEncryptedSecret(rowId: string) {
  await db
    .update(pastes)
    .set({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(pastes.id, rowId));
}

async function getEncryptedSecretRow(slug: string, includeDeleted = false) {
  const conditions = [eq(pastes.slug, slug), eq(pastes.secretMode, true), eq(pastes.encryptedShare, true)];
  if (!includeDeleted) {
    conditions.push(ne(pastes.status, "deleted"));
    conditions.push(isNull(pastes.deletedAt));
  }

  const [row] = await db
    .select()
    .from(pastes)
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}

export async function createEncryptedSecretShare(input: {
  payloadCiphertext: string;
  payloadIv: string;
  burnAfterRead?: boolean;
  expiresPreset: EncryptedSecretExpiryPreset;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const slug = await createUniqueSlug();
  const manageToken = randomToken("secret");
  const expiresAt = expiresAtFromPreset(input.expiresPreset);

  await db.insert(pastes).values({
    id: randomToken("paste"),
    slug,
    userId: null,
    title: ENCRYPTED_SECRET_TITLE,
    content: ENCRYPTED_SECRET_CONTENT,
    language: "markdown",
    visibility: "unlisted",
    secretMode: true,
    encryptedShare: true,
    encryptedPayloadCiphertext: assertCiphertext(input.payloadCiphertext, "Encrypted secret payload"),
    encryptedPayloadIv: assertIv(input.payloadIv, "Encrypted secret IV"),
    encryptedManageTokenHash: hashToken(manageToken),
    burnAfterRead: Boolean(input.burnAfterRead),
    burnAfterViews: 0,
    viewCount: 0,
    pinned: false,
    favorite: false,
    archived: false,
    template: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt
  });

  await logAudit({
    action: "secret_share.encrypted_created",
    targetType: "paste",
    targetId: slug,
    ip: input.ip ?? null,
    metadata: {
      burnAfterRead: Boolean(input.burnAfterRead),
      expiresAt: expiresAt?.toISOString() ?? null,
      userAgent: input.userAgent ?? null
    }
  });

  return {
    slug,
    manageToken,
    expiresAt
  };
}

export async function getEncryptedSecretShareBySlug(
  slug: string,
  options?: { trackView?: boolean }
): Promise<EncryptedSecretShareRecord | null> {
  const row = await getEncryptedSecretRow(slug);
  if (!row) {
    return null;
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    await softDeleteEncryptedSecret(row.id);
    return null;
  }

  let viewCount = row.viewCount;
  let lastViewedAt = row.encryptedLastViewedAt;

  if (options?.trackView) {
    viewCount += 1;
    lastViewedAt = new Date();
    await db
      .update(pastes)
      .set({
        viewCount,
        encryptedLastViewedAt: lastViewedAt,
        updatedAt: lastViewedAt
      })
      .where(eq(pastes.id, row.id));

    if (row.burnAfterRead || (row.burnAfterViews > 0 && viewCount >= row.burnAfterViews)) {
      await softDeleteEncryptedSecret(row.id);
    }
  }

  if (!row.encryptedPayloadCiphertext || !row.encryptedPayloadIv) {
    return null;
  }

  return {
    slug: row.slug,
    title: row.title,
    content: row.content,
    payloadCiphertext: row.encryptedPayloadCiphertext,
    payloadIv: row.encryptedPayloadIv,
    viewCount,
    burnAfterRead: row.burnAfterRead,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastViewedAt
  };
}

export async function getEncryptedSecretManageSnapshot(
  slug: string,
  token: string
): Promise<EncryptedSecretManageSnapshot | null> {
  const row = await getEncryptedSecretRow(slug, true);
  if (!row?.encryptedManageTokenHash) {
    return null;
  }
  if (hashToken(token) !== row.encryptedManageTokenHash) {
    return null;
  }

  return {
    slug: row.slug,
    status: row.status,
    viewCount: row.viewCount,
    burnAfterRead: row.burnAfterRead,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    lastViewedAt: row.encryptedLastViewedAt
  };
}

export async function manageEncryptedSecretShare(input: {
  slug: string;
  token: string;
  action: "revoke" | "burn_now" | "update_expiry";
  expiresPreset?: EncryptedSecretExpiryPreset;
}) {
  const row = await getEncryptedSecretRow(input.slug, true);
  if (!row?.encryptedManageTokenHash) {
    throw new Error("Secret link not found.");
  }
  if (hashToken(input.token) !== row.encryptedManageTokenHash) {
    throw new Error("Invalid management token.");
  }

  if (input.action === "update_expiry") {
    if (!input.expiresPreset) {
      throw new Error("Expiry preset is required.");
    }
    const expiresAt = expiresAtFromPreset(input.expiresPreset);
    await db
      .update(pastes)
      .set({
        expiresAt,
        updatedAt: new Date()
      })
      .where(eq(pastes.id, row.id));

    await logAudit({
      action: "secret_share.expiry_updated",
      targetType: "paste",
      targetId: row.slug,
      metadata: {
        expiresAt: expiresAt?.toISOString() ?? null
      }
    });

    return;
  }

  await softDeleteEncryptedSecret(row.id);

  await logAudit({
    action: input.action === "burn_now" ? "secret_share.burned" : "secret_share.revoked",
    targetType: "paste",
    targetId: row.slug
  });
}

