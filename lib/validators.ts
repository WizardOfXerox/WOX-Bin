import { z } from "zod";

import { BURN_VIEW_OPTIONS, CATEGORIES, LANGUAGES } from "@/lib/constants";
import { PLAN_IDS } from "@/lib/plans";
import { isAllowedPasteMediaMime, normalizeAttachmentMimeType } from "@/lib/paste-file-media";

export const credentialsIdentifierSchema = z.string().trim().min(2).max(64);

const FILE_TEXT_MAX = 5 * 1024 * 1024;
/** Base64 string length cap per file (~15 MB binary); total paste size still enforced by plan. */
const FILE_MEDIA_BASE64_MAX = 20 * 1024 * 1024;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255)
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: z.string().min(8).max(128)
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_]+$/i, "Username may only contain letters, numbers, and underscores."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().optional().default(""),
  /** Must be true — enforced server-side; UI should require checkbox before submit. */
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service to create an account."
  })
});

export const pasteFileSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    content: z.string().max(FILE_MEDIA_BASE64_MAX),
    language: z.string().trim().refine((value) => LANGUAGES.includes(value as (typeof LANGUAGES)[number])),
    mediaKind: z.enum(["image", "video"]).optional().nullable(),
    mimeType: z.string().trim().max(120).optional().nullable()
  })
  .superRefine((data, ctx) => {
    const isMedia = data.mediaKind === "image" || data.mediaKind === "video";
    if (isMedia) {
      if (data.language !== "none") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image and video attachments must use language “none”.",
          path: ["language"]
        });
      }
      const mime = data.mimeType ? normalizeAttachmentMimeType(data.mimeType) : "";
      if (!mime || !isAllowedPasteMediaMime(mime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unsupported or missing MIME type for media attachment (use a common image or video format).",
          path: ["mimeType"]
        });
      }
      if (data.mediaKind === "image" && !mime.startsWith("image/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mediaKind image requires an image/* MIME type.",
          path: ["mimeType"]
        });
      }
      if (data.mediaKind === "video" && !mime.startsWith("video/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mediaKind video requires a video/* MIME type.",
          path: ["mimeType"]
        });
      }
      const compact = data.content.replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/=_-]*$/.test(compact) || compact.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid base64 content for media attachment.",
          path: ["content"]
        });
      }
      if (data.content.length > FILE_MEDIA_BASE64_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Media attachment is too large.",
          path: ["content"]
        });
      }
    } else {
      if (data.mimeType != null && data.mimeType !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mimeType is only allowed for image/video attachments.",
          path: ["mimeType"]
        });
      }
      if (data.mediaKind != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mediaKind is only allowed for image/video attachments.",
          path: ["mediaKind"]
        });
      }
      if (data.content.length > FILE_TEXT_MAX) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Text attachment is too large (max 5 MB).",
          path: ["content"]
        });
      }
    }
  });

export const pasteInputSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  title: z.string().trim().min(1).max(500),
  content: z.string().max(10 * 1024 * 1024),
  language: z.string().trim().refine((value) => LANGUAGES.includes(value as (typeof LANGUAGES)[number])),
  folderName: z.string().trim().max(64).nullable().optional(),
  category: z
    .string()
    .trim()
    .refine((value) => value === "" || CATEGORIES.includes(value as (typeof CATEGORIES)[number]))
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(50).default([]),
  visibility: z.enum(["public", "unlisted", "private"]).default("private"),
  password: z.string().trim().max(128).nullable().optional(),
  burnAfterRead: z.boolean().default(false),
  burnAfterViews: z.number().int().nonnegative().max(100).default(0),
  pinned: z.boolean().default(false),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  template: z.boolean().default(false),
  forkedFromId: z.string().trim().max(128).nullable().optional(),
  replyToId: z.string().trim().max(128).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  files: z.array(pasteFileSchema).max(50).default([])
});

/** v1 PATCH: omit \`files\` from JSON to keep existing attachments; send \`files: []\` to clear them. */
export const pasteInputUpdateSchema = pasteInputSchema.extend({
  files: z.array(pasteFileSchema).max(50).optional()
});

export const publicPasteInputSchema = pasteInputSchema.extend({
  visibility: z.enum(["public", "unlisted"]).default("public"),
  turnstileToken: z.string().optional().default("")
});

export const commentInputSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.number().int().positive().nullable().optional()
});

export const reportInputSchema = z.object({
  pasteSlug: z.string().trim().max(128).optional(),
  commentId: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(120),
  notes: z.string().trim().max(1000).optional()
});

export const apiKeyCreateSchema = z.object({
  label: z.string().trim().min(1).max(64)
});

/** PATCH /api/settings/account — at least one field required */
export const accountSettingsPatchSchema = z
  .object({
    displayName: z.union([z.string().trim().max(80), z.literal("")]).optional(),
    username: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-z0-9_]+$/i, "Username may only contain letters, numbers, and underscores.")
      .optional()
  })
  .refine((data) => data.displayName !== undefined || data.username !== undefined, {
    message: "Provide display name and/or username to update."
  });

/** DELETE /api/settings/account — password required when account has a password hash. */
export const accountDeleteSchema = z.object({
  confirmPhrase: z.literal("DELETE MY ACCOUNT"),
  password: z.string().optional()
});

export const accountPasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8).max(128)
});

export const webhookSettingsSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === "" || /^https?:\/\//i.test(value), "Webhook URL must start with http:// or https://.")
});

export const usernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9_]+$/i);

export const teamRoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);

export const teamCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i)
    .optional()
});

export const teamMemberCreateSchema = z.object({
  identifier: z.string().trim().min(2).max(255),
  role: teamRoleSchema.default("viewer")
});

export const teamMemberUpdateSchema = z.object({
  userId: z.string().trim().min(1).max(128),
  role: teamRoleSchema
});

export const teamMemberRemoveSchema = z.object({
  userId: z.string().trim().min(1).max(128)
});

export const teamPrimarySchema = z.object({
  teamId: z.string().trim().min(1).max(128).nullable()
});

export const billingPlanUpdateSchema = z.object({
  plan: z.enum(PLAN_IDS as unknown as [string, ...string[]]),
  planStatus: z.enum(["active", "trialing", "past_due", "canceled"]).default("active"),
  expiresAt: z.string().datetime().nullable().optional()
});

export const burnAfterViewsOptionsSchema = z.enum(
  BURN_VIEW_OPTIONS.map((value) => String(value)) as [string, ...string[]]
);
