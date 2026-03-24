import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

import { hashIp } from "@/lib/crypto";
import { db, schema } from "@/lib/db";

export const PRIVACY_EXPIRY_PRESETS = {
  "1-day": { label: "1 day", hours: 24 },
  "7-days": { label: "7 days", hours: 24 * 7 },
  "30-days": { label: "30 days", hours: 24 * 30 },
  never: { label: "Never", hours: null }
} as const;

export type PrivacyExpiryPreset = keyof typeof PRIVACY_EXPIRY_PRESETS;

export class PrivacySuiteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PrivacySuiteError";
    this.status = status;
  }
}

function makeSlug(length = 10) {
  return randomBytes(Math.max(8, length))
    .toString("base64url")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, length);
}

async function createUniqueSlug<T>(exists: (slug: string) => Promise<T | null>, length = 10) {
  for (let index = 0; index < 12; index += 1) {
    const slug = makeSlug(length);
    const taken = await exists(slug);
    if (!taken) {
      return slug;
    }
  }

  throw new PrivacySuiteError("Could not generate a unique share slug right now.", 503);
}

function expiresAtFromPreset(preset: PrivacyExpiryPreset) {
  const match = PRIVACY_EXPIRY_PRESETS[preset];
  if (!match || match.hours == null) {
    return null;
  }
  return new Date(Date.now() + match.hours * 60 * 60 * 1000);
}

function assertCiphertext(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new PrivacySuiteError(`${label} is required.`, 400);
  }
  if (trimmed.length > 300_000) {
    throw new PrivacySuiteError(`${label} is too large.`, 413);
  }
  return trimmed;
}

function assertDigest(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(trimmed)) {
    throw new PrivacySuiteError("Digest must be a SHA-256 hex value.", 400);
  }
  return trimmed;
}

function cleanLabel(value: string, fallback: string) {
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, 120);
}

function activeExpiryFilter<T extends { expiresAt: unknown }>(table: T & { expiresAt: unknown }) {
  return or(isNull(table.expiresAt as never), gt(table.expiresAt as never, new Date()));
}

export type PrivacyProofRecord = {
  slug: string;
  label: string;
  algorithm: string;
  digestHex: string;
  note: string | null;
  createdAt: Date;
};

export async function createPrivacyProof(input: {
  label: string;
  digestHex: string;
  note?: string | null;
}) {
  const slug = await createUniqueSlug(
    (candidate) =>
      db.query.privacyProofs.findFirst({
        columns: { slug: true },
        where: eq(schema.privacyProofs.slug, candidate)
      }),
    12
  );

  const [row] = await db
    .insert(schema.privacyProofs)
    .values({
      slug,
      label: cleanLabel(input.label, "Untitled proof"),
      algorithm: "sha256",
      digestHex: assertDigest(input.digestHex),
      note: input.note?.trim() ? input.note.trim().slice(0, 800) : null
    })
    .returning();

  return row!;
}

export async function getPrivacyProofBySlug(slug: string): Promise<PrivacyProofRecord | null> {
  const row = await db.query.privacyProofs.findFirst({
    where: eq(schema.privacyProofs.slug, slug)
  });

  if (!row) {
    return null;
  }

  return {
    slug: row.slug,
    label: row.label,
    algorithm: row.algorithm,
    digestHex: row.digestHex,
    note: row.note,
    createdAt: row.createdAt
  };
}

export type PrivacySnapshotRecord = {
  slug: string;
  payloadCiphertext: string;
  payloadIv: string;
  createdAt: Date;
  expiresAt: Date | null;
  viewCount: number;
};

export async function createPrivacySnapshot(input: {
  payloadCiphertext: string;
  payloadIv: string;
  expiresPreset: PrivacyExpiryPreset;
}) {
  const slug = await createUniqueSlug(
    (candidate) =>
      db.query.privacySnapshots.findFirst({
        columns: { slug: true },
        where: eq(schema.privacySnapshots.slug, candidate)
      }),
    12
  );

  const [row] = await db
    .insert(schema.privacySnapshots)
    .values({
      slug,
      payloadCiphertext: assertCiphertext(input.payloadCiphertext, "Encrypted snapshot payload"),
      payloadIv: assertCiphertext(input.payloadIv, "Snapshot IV"),
      expiresAt: expiresAtFromPreset(input.expiresPreset)
    })
    .returning();

  return row!;
}

export async function getPrivacySnapshotBySlug(slug: string, recordView = false): Promise<PrivacySnapshotRecord | null> {
  const row = await db.query.privacySnapshots.findFirst({
    where: and(eq(schema.privacySnapshots.slug, slug), activeExpiryFilter(schema.privacySnapshots))
  });

  if (!row) {
    return null;
  }

  if (recordView) {
    await db
      .update(schema.privacySnapshots)
      .set({
        viewCount: sql`${schema.privacySnapshots.viewCount} + 1`
      })
      .where(eq(schema.privacySnapshots.id, row.id));
  }

  return {
    slug: row.slug,
    payloadCiphertext: row.payloadCiphertext,
    payloadIv: row.payloadIv,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    viewCount: row.viewCount + (recordView ? 1 : 0)
  };
}

export type PrivacyPollSnapshot = {
  slug: string;
  question: string;
  allowMultiple: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  totalVotes: number;
  options: {
    id: string;
    label: string;
    voteCount: number;
    percent: number;
  }[];
  selectedOptionIds: string[];
};

async function buildPollSnapshot(pollId: string, voterHash?: string | null): Promise<PrivacyPollSnapshot | null> {
  const poll = await db.query.privacyPolls.findFirst({
    where: and(eq(schema.privacyPolls.id, pollId), activeExpiryFilter(schema.privacyPolls))
  });
  if (!poll) {
    return null;
  }

  const [options, existingVotes] = await Promise.all([
    db.query.privacyPollOptions.findMany({
      where: eq(schema.privacyPollOptions.pollId, poll.id),
      orderBy: asc(schema.privacyPollOptions.sortOrder)
    }),
    voterHash
      ? db.query.privacyPollVotes.findMany({
          where: and(eq(schema.privacyPollVotes.pollId, poll.id), eq(schema.privacyPollVotes.voterHash, voterHash))
        })
      : Promise.resolve([])
  ]);

  const selectedOptionIds = existingVotes.map((vote) => vote.optionId);
  const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);

  return {
    slug: poll.slug,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    createdAt: poll.createdAt,
    expiresAt: poll.expiresAt,
    totalVotes,
    selectedOptionIds,
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      voteCount: option.voteCount,
      percent: totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0
    }))
  };
}

export async function createPrivacyPoll(input: {
  question: string;
  optionLabels: string[];
  allowMultiple: boolean;
  expiresPreset: PrivacyExpiryPreset;
}) {
  const question = input.question.trim();
  const optionLabels = input.optionLabels
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (question.length < 4) {
    throw new PrivacySuiteError("Poll question is too short.", 400);
  }
  if (optionLabels.length < 2) {
    throw new PrivacySuiteError("Add at least two poll options.", 400);
  }

  const slug = await createUniqueSlug(
    (candidate) =>
      db.query.privacyPolls.findFirst({
        columns: { slug: true },
        where: eq(schema.privacyPolls.slug, candidate)
      }),
    12
  );

  const row = await db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(schema.privacyPolls)
      .values({
        slug,
        question: question.slice(0, 280),
        allowMultiple: Boolean(input.allowMultiple),
        expiresAt: expiresAtFromPreset(input.expiresPreset)
      })
      .returning();

    await tx.insert(schema.privacyPollOptions).values(
      optionLabels.map((label, index) => ({
        pollId: poll!.id,
        label: label.slice(0, 160),
        sortOrder: index
      }))
    );

    return poll!;
  });

  return buildPollSnapshot(row.id, null);
}

export async function getPrivacyPollBySlug(slug: string, ip: string | null | undefined) {
  const voterHash = hashIp(ip);
  const row = await db.query.privacyPolls.findFirst({
    columns: { id: true },
    where: and(eq(schema.privacyPolls.slug, slug), activeExpiryFilter(schema.privacyPolls))
  });

  if (!row) {
    return null;
  }

  return buildPollSnapshot(row.id, voterHash);
}

export async function voteInPrivacyPoll(input: {
  slug: string;
  optionIds: string[];
  ip: string | null | undefined;
}) {
  const voterHash = hashIp(input.ip);
  if (!voterHash) {
    throw new PrivacySuiteError("Could not determine a voter fingerprint for this request.", 400);
  }

  const row = await db.query.privacyPolls.findFirst({
    where: and(eq(schema.privacyPolls.slug, input.slug), activeExpiryFilter(schema.privacyPolls))
  });
  if (!row) {
    throw new PrivacySuiteError("Poll not found or expired.", 404);
  }

  const options = await db.query.privacyPollOptions.findMany({
    where: eq(schema.privacyPollOptions.pollId, row.id),
    orderBy: asc(schema.privacyPollOptions.sortOrder)
  });

  const allowedIds = new Set(options.map((option) => option.id));
  const nextIds = Array.from(new Set(input.optionIds.filter((optionId) => allowedIds.has(optionId))));

  if (!nextIds.length) {
    throw new PrivacySuiteError("Choose at least one poll option.", 400);
  }
  if (!row.allowMultiple && nextIds.length > 1) {
    throw new PrivacySuiteError("This poll only accepts one answer.", 400);
  }

  await db.transaction(async (tx) => {
    const previousVotes = await tx.query.privacyPollVotes.findMany({
      where: and(eq(schema.privacyPollVotes.pollId, row.id), eq(schema.privacyPollVotes.voterHash, voterHash))
    });
    const previousIds = previousVotes.map((vote) => vote.optionId);

    if (previousVotes.length) {
      await tx
        .delete(schema.privacyPollVotes)
        .where(and(eq(schema.privacyPollVotes.pollId, row.id), eq(schema.privacyPollVotes.voterHash, voterHash)));

      if (previousIds.length) {
        await tx
          .update(schema.privacyPollOptions)
          .set({
            voteCount: sql`greatest(${schema.privacyPollOptions.voteCount} - 1, 0)`
          })
          .where(and(eq(schema.privacyPollOptions.pollId, row.id), inArray(schema.privacyPollOptions.id, previousIds)));
      }
    }

    const newIds = nextIds.filter((optionId) => !previousIds.includes(optionId));
    if (newIds.length) {
      await tx.insert(schema.privacyPollVotes).values(
        newIds.map((optionId) => ({
          pollId: row.id,
          optionId,
          voterHash
        }))
      );

      await tx
        .update(schema.privacyPollOptions)
        .set({
          voteCount: sql`${schema.privacyPollOptions.voteCount} + 1`
        })
        .where(and(eq(schema.privacyPollOptions.pollId, row.id), inArray(schema.privacyPollOptions.id, newIds)));
    }

    const totalVotes = await tx.query.privacyPollVotes.findMany({
      columns: { id: true },
      where: eq(schema.privacyPollVotes.pollId, row.id)
    });

    await tx
      .update(schema.privacyPolls)
      .set({
        totalVotes: totalVotes.length,
        updatedAt: new Date()
      })
      .where(eq(schema.privacyPolls.id, row.id));
  });

  return buildPollSnapshot(row.id, voterHash);
}

export type PrivacyChatRoomSnapshot = {
  slug: string;
  titleCiphertext: string;
  titleIv: string;
  expiresAt: Date | null;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  messages: {
    id: string;
    payloadCiphertext: string;
    payloadIv: string;
    createdAt: Date;
  }[];
};

export async function createPrivacyChatRoom(input: {
  titleCiphertext: string;
  titleIv: string;
  firstMessageCiphertext: string;
  firstMessageIv: string;
  expiresPreset: PrivacyExpiryPreset;
}) {
  const slug = await createUniqueSlug(
    (candidate) =>
      db.query.privacyChatRooms.findFirst({
        columns: { slug: true },
        where: eq(schema.privacyChatRooms.slug, candidate)
      }),
    12
  );

  const room = await db.transaction(async (tx) => {
    const [createdRoom] = await tx
      .insert(schema.privacyChatRooms)
      .values({
        slug,
        titleCiphertext: assertCiphertext(input.titleCiphertext, "Encrypted room title"),
        titleIv: assertCiphertext(input.titleIv, "Room title IV"),
        expiresAt: expiresAtFromPreset(input.expiresPreset),
        messageCount: 1
      })
      .returning();

    await tx.insert(schema.privacyChatMessages).values({
      roomId: createdRoom!.id,
      payloadCiphertext: assertCiphertext(input.firstMessageCiphertext, "Encrypted first message"),
      payloadIv: assertCiphertext(input.firstMessageIv, "First message IV")
    });

    return createdRoom!;
  });

  return room;
}

export async function getPrivacyChatRoomBySlug(slug: string): Promise<PrivacyChatRoomSnapshot | null> {
  const room = await db.query.privacyChatRooms.findFirst({
    where: and(eq(schema.privacyChatRooms.slug, slug), activeExpiryFilter(schema.privacyChatRooms))
  });
  if (!room) {
    return null;
  }

  const messages = await db.query.privacyChatMessages.findMany({
    where: eq(schema.privacyChatMessages.roomId, room.id),
    orderBy: asc(schema.privacyChatMessages.createdAt),
    limit: 200
  });

  return {
    slug: room.slug,
    titleCiphertext: room.titleCiphertext,
    titleIv: room.titleIv,
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
    lastMessageAt: room.lastMessageAt,
    messageCount: room.messageCount,
    messages: messages.map((message) => ({
      id: message.id,
      payloadCiphertext: message.payloadCiphertext,
      payloadIv: message.payloadIv,
      createdAt: message.createdAt
    }))
  };
}

export async function addPrivacyChatMessage(input: {
  slug: string;
  payloadCiphertext: string;
  payloadIv: string;
}) {
  const room = await db.query.privacyChatRooms.findFirst({
    where: and(eq(schema.privacyChatRooms.slug, input.slug), activeExpiryFilter(schema.privacyChatRooms))
  });
  if (!room) {
    throw new PrivacySuiteError("Chat room not found or expired.", 404);
  }

  const [message] = await db
    .insert(schema.privacyChatMessages)
    .values({
      roomId: room.id,
      payloadCiphertext: assertCiphertext(input.payloadCiphertext, "Encrypted message"),
      payloadIv: assertCiphertext(input.payloadIv, "Message IV")
    })
    .returning();

  await db
    .update(schema.privacyChatRooms)
    .set({
      messageCount: sql`${schema.privacyChatRooms.messageCount} + 1`,
      lastMessageAt: new Date()
    })
    .where(eq(schema.privacyChatRooms.id, room.id));

  return {
    id: message!.id,
    payloadCiphertext: message!.payloadCiphertext,
    payloadIv: message!.payloadIv,
    createdAt: message!.createdAt
  };
}
