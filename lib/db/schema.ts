import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const planEnum = pgEnum("plan", ["free", "pro", "team", "admin"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "trialing", "past_due", "canceled"]);
export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "editor", "viewer"]);
export const visibilityEnum = pgEnum("paste_visibility", ["public", "unlisted", "private"]);
export const moderationStatusEnum = pgEnum("moderation_status", ["active", "hidden", "deleted"]);
export const reportStatusEnum = pgEnum("report_status", ["open", "reviewed", "resolved"]);

/** Server-side conversion jobs (hybrid converter / worker queue). @see docs/CONVERSION-PLATFORM.md */
export const conversionJobStatusEnum = pgEnum("conversion_job_status", [
  "pending",
  "processing",
  "done",
  "failed",
  "cancelled"
]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    username: text("username"),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    role: userRoleEnum("role").notNull().default("user"),
    plan: planEnum("plan").notNull().default("free"),
    planStatus: planStatusEnum("plan_status").notNull().default("active"),
    planExpiresAt: timestamp("plan_expires_at", { mode: "date" }),
    billingCustomerId: text("billing_customer_id"),
    billingSubscriptionId: text("billing_subscription_id"),
    teamId: text("team_id"),
    webhookUrl: text("webhook_url"),
    onboardingComplete: boolean("onboarding_complete").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    usernameUnique: uniqueIndex("users_username_unique").on(table.username)
  })
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId]
    })
  })
);

export const teams = pgTable(
  "teams",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull().default("team"),
    planStatus: planStatusEnum("plan_status").notNull().default("active"),
    planExpiresAt: timestamp("plan_expires_at", { mode: "date" }),
    billingCustomerId: text("billing_customer_id"),
    billingSubscriptionId: text("billing_subscription_id"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    slugUnique: uniqueIndex("teams_slug_unique").on(table.slug)
  })
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.teamId, table.userId]
    })
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull()
});

/** Tracks JWT “browser” sessions for revoke-others / idle timeout (credentials + OAuth). */
export const browserSessions = pgTable("browser_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { mode: "date" }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { mode: "date" })
});

/** One-time credentials password reset links (email). Token stored as SHA-256 hex. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("password_reset_tokens_token_hash_uidx").on(table.tokenHash),
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId)
  })
);

/** Optional post-registration email verification (SMTP). */
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("email_verification_tokens_token_hash_uidx").on(table.tokenHash),
    userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId)
  })
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull()
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.identifier, table.token]
    })
  })
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports")
  },
  (table) => ({
    compositePk: primaryKey({
      columns: [table.userId, table.credentialID]
    })
  })
);

export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const pastes = pgTable(
  "pastes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    language: text("language").notNull().default("none"),
    folderName: text("folder_name"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    status: moderationStatusEnum("status").notNull().default("active"),
    passwordHash: text("password_hash"),
    anonymousClaimHash: text("anonymous_claim_hash"),
    burnAfterRead: boolean("burn_after_read").notNull().default(false),
    burnAfterViews: integer("burn_after_views").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    favorite: boolean("favorite").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    template: boolean("template").notNull().default(false),
    forkedFromId: text("forked_from_id"),
    replyToId: text("reply_to_id"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" })
  },
  (table) => ({
    slugUnique: uniqueIndex("pastes_slug_unique").on(table.slug)
  })
);

export const pasteFiles = pgTable("paste_files", {
  id: serial("id").primaryKey(),
  pasteId: text("paste_id")
    .notNull()
    .references(() => pastes.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("none"),
  /** `image` | `video` when content is base64; null for text/code attachments. */
  mediaKind: text("media_kind"),
  mimeType: text("mime_type"),
  sortOrder: integer("sort_order").notNull().default(0)
});

export const pasteVersions = pgTable("paste_versions", {
  id: serial("id").primaryKey(),
  pasteId: text("paste_id")
    .notNull()
    .references(() => pastes.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  files: jsonb("files")
    .$type<
      {
        filename: string;
        content: string;
        language: string;
        mediaKind?: string | null;
        mimeType?: string | null;
      }[]
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  pasteId: text("paste_id")
    .notNull()
    .references(() => pastes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  content: text("content").notNull(),
  status: moderationStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow()
});

export const stars = pgTable(
  "stars",
  {
    pasteId: text("paste_id")
      .notNull()
      .references(() => pastes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.pasteId, table.userId]
    })
  })
);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  pasteId: text("paste_id").references(() => pastes.id, { onDelete: "cascade" }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  reporterUserId: text("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
  reporterIpHash: text("reporter_ip_hash"),
  reason: text("reason").notNull(),
  notes: text("notes"),
  status: reportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    tokenHash: text("token_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("api_keys_token_hash_unique").on(table.tokenHash)
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  ipHash: text("ip_hash"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow()
});

export const conversionJobs = pgTable(
  "conversion_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    status: conversionJobStatusEnum("status").notNull().default("pending"),
    /** "client" | "worker" — which pipeline owns the job */
    tier: text("tier").notNull().default("worker"),
    /** Convertio-style pair slug, e.g. mp4-webm */
    pairPath: text("pair_path"),
    /** ffmpeg | libreoffice | … */
    handler: text("handler").notNull().default("ffmpeg"),
    /** Opaque token returned once at job creation — required for status/download when anonymous */
    publicToken: text("public_token").notNull(),
    /** Client finished uploading input to object storage */
    inputReady: boolean("input_ready").notNull().default(false),
    sourceMime: text("source_mime"),
    targetFormat: text("target_format").notNull(),
    originalFilename: text("original_filename"),
    outputMime: text("output_mime"),
    inputStorageKey: text("input_storage_key"),
    outputStorageKey: text("output_storage_key"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" })
  },
  (table) => ({
    userCreatedIdx: index("conversion_jobs_user_id_created_at_idx").on(table.userId, table.createdAt),
    statusCreatedIdx: index("conversion_jobs_status_created_at_idx").on(table.status, table.createdAt),
    publicTokenUnique: uniqueIndex("conversion_jobs_public_token_unique").on(table.publicToken),
    pendingReadyIdx: index("conversion_jobs_pending_input_ready_idx").on(table.status, table.inputReady, table.createdAt)
  })
);
