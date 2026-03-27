import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { dispatchDiscordAnnouncement } from "@/lib/discord/notifications";
import { announcements } from "@/lib/db/schema";

export const ANNOUNCEMENT_TONES = ["info", "success", "warning", "critical"] as const;

export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];

export const announcementWriteSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120, "Keep the title under 120 characters."),
    body: z.string().trim().min(1, "Body is required.").max(420, "Keep the body under 420 characters."),
    ctaLabel: z
      .string()
      .trim()
      .max(40, "Keep the CTA label under 40 characters.")
      .optional()
      .nullable()
      .transform((value) => (value ? value.trim() : null)),
    ctaHref: z
      .string()
      .trim()
      .max(500, "Keep the CTA link under 500 characters.")
      .optional()
      .nullable()
      .transform((value) => (value ? value.trim() : null))
      .refine((value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value), {
        message: "CTA link must start with / or http(s)://."
      }),
    tone: z.enum(ANNOUNCEMENT_TONES).default("info"),
    published: z.boolean().default(false),
    startsAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value.trim() : null)),
    endsAt: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => (value ? value.trim() : null))
  })
  .superRefine((value, ctx) => {
    if ((value.ctaHref && !value.ctaLabel) || (!value.ctaHref && value.ctaLabel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.ctaHref ? ["ctaLabel"] : ["ctaHref"],
        message: "CTA label and CTA link must be provided together."
      });
    }

    if (value.startsAt && Number.isNaN(Date.parse(value.startsAt))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Start time must be a valid date/time."
      });
    }

    if (value.endsAt && Number.isNaN(Date.parse(value.endsAt))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End time must be a valid date/time."
      });
    }

    if (value.startsAt && value.endsAt) {
      const starts = Date.parse(value.startsAt);
      const ends = Date.parse(value.endsAt);
      if (!Number.isNaN(starts) && !Number.isNaN(ends) && ends <= starts) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endsAt"],
          message: "End time must be after the start time."
        });
      }
    }
  });

export type AnnouncementWriteInput = z.infer<typeof announcementWriteSchema>;

export type AnnouncementRow = typeof announcements.$inferSelect;

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  tone: AnnouncementTone;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeIsoDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function serializeAnnouncement(row: AnnouncementRow): AnnouncementRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel ?? null,
    ctaHref: row.ctaHref ?? null,
    tone: row.tone,
    published: row.published,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export function isAnnouncementLive(row: Pick<AnnouncementRecord, "published" | "startsAt" | "endsAt">, now = new Date()) {
  if (!row.published) {
    return false;
  }
  const startsAt = normalizeIsoDate(row.startsAt);
  const endsAt = normalizeIsoDate(row.endsAt);
  if (startsAt && startsAt > now) {
    return false;
  }
  if (endsAt && endsAt <= now) {
    return false;
  }
  return true;
}

export function pickActiveAnnouncement(rows: AnnouncementRecord[], now = new Date()) {
  return rows.find((row) => isAnnouncementLive(row, now)) ?? null;
}

function toDatabaseWrite(input: AnnouncementWriteInput) {
  return {
    title: input.title.trim(),
    body: input.body.trim(),
    ctaLabel: input.ctaLabel ?? null,
    ctaHref: input.ctaHref ?? null,
    tone: input.tone,
    published: Boolean(input.published),
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    updatedAt: new Date()
  };
}

export async function listAnnouncementsForAdmin() {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.updatedAt));
  return rows.map(serializeAnnouncement);
}

export async function getActiveAnnouncement() {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.published, true),
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), gt(announcements.endsAt, now))
      )
    )
    .orderBy(desc(announcements.updatedAt));

  return rows[0] ? serializeAnnouncement(rows[0]) : null;
}

export async function createAnnouncement(input: AnnouncementWriteInput, actorUserId?: string | null) {
  const values = toDatabaseWrite(input);

  const created = await db.transaction(async (tx) => {
    if (values.published) {
      await tx
        .update(announcements)
        .set({
          published: false,
          updatedAt: new Date()
        })
        .where(eq(announcements.published, true));
    }

    const [row] = await tx
      .insert(announcements)
      .values({
        ...values,
        createdByUserId: actorUserId ?? null
      })
      .returning();

    return row;
  });

  const serialized = serializeAnnouncement(created);
  if (serialized.published) {
    void dispatchDiscordAnnouncement(serialized);
  }

  return serialized;
}

export async function updateAnnouncement(id: string, input: AnnouncementWriteInput) {
  const values = toDatabaseWrite(input);

  const updated = await db.transaction(async (tx) => {
    if (values.published) {
      await tx
        .update(announcements)
        .set({
          published: false,
          updatedAt: new Date()
        })
        .where(eq(announcements.published, true));
    }

    const [row] = await tx.update(announcements).set(values).where(eq(announcements.id, id)).returning();
    return row ?? null;
  });

  if (!updated) {
    return null;
  }

  const serialized = serializeAnnouncement(updated);
  if (serialized.published) {
    void dispatchDiscordAnnouncement(serialized);
  }

  return serialized;
}

export async function deleteAnnouncement(id: string) {
  const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning();
  return row ? serializeAnnouncement(row) : null;
}
