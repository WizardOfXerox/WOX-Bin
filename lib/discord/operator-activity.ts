import { desc, eq, like, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import type { DiscordGuildIntegrationRecord } from "@/lib/discord/guilds";

type AuditMetadata = Record<string, unknown>;

export type DiscordOperatorActivity = {
  id: number;
  action: string;
  label: string;
  detail: string | null;
  status: "success" | "failed" | "info";
  actorLabel: string;
  targetType: string;
  targetId: string;
  guildId: string | null;
  guildName: string | null;
  createdAt: string;
};

export type DiscordGuildOperatorStatus = DiscordGuildIntegrationRecord & {
  bootstrapReady: boolean;
  bootstrapCoverage: number;
  lastWebhookCheck: DiscordOperatorActivity | null;
  lastAnnouncementDelivery: DiscordOperatorActivity | null;
  recentActivity: DiscordOperatorActivity[];
};

function asMetadata(value: unknown): AuditMetadata {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AuditMetadata) : {};
}

function toActorLabel(row: { displayName: string | null; username: string | null; email: string | null; actorUserId: string | null }) {
  return row.displayName ?? row.username ?? row.email ?? row.actorUserId ?? "System";
}

function toGuildName(metadata: AuditMetadata) {
  const value = metadata.guildName;
  return typeof value === "string" && value.trim() ? value : null;
}

function toStatus(action: string, metadata: AuditMetadata): DiscordOperatorActivity["status"] {
  if (action.endsWith("_failed")) {
    return "failed";
  }
  if (action === "discord.announcement.delivery") {
    return metadata.status === "failed" ? "failed" : "success";
  }
  if (action === "admin.discord.webhook_test") {
    return metadata.status === "failed" ? "failed" : "success";
  }
  if (action === "admin.discord.setup" || action === "admin.discord.siteops" || action === "admin.discord.quickpaste") {
    return "success";
  }
  return "info";
}

function toLabel(action: string, metadata: AuditMetadata) {
  switch (action) {
    case "admin.discord.setup":
      return "Setup refreshed";
    case "admin.discord.siteops":
      return "Site ops updated";
    case "admin.discord.webhook_test":
      return metadata.status === "failed" ? "Webhook test failed" : "Webhook test delivered";
    case "admin.discord.quickpaste":
      return "Bot quickpaste created";
    case "admin.discord.announce":
      return "Announcement published";
    case "discord.announcement.delivery":
      return metadata.status === "failed" ? "Announcement mirror failed" : "Announcement mirrored";
    case "discord.linked_roles.sync":
      return "Linked roles synced";
    default:
      return action;
  }
}

function toDetail(action: string, metadata: AuditMetadata) {
  if (action === "admin.discord.setup") {
    const warnings = typeof metadata.warnings === "number" ? metadata.warnings : 0;
    const createdChannels = typeof metadata.createdChannels === "number" ? metadata.createdChannels : null;
    const createdRoles = typeof metadata.createdRoles === "number" ? metadata.createdRoles : null;
    return [
      createdChannels !== null ? `${createdChannels} new channels` : null,
      createdRoles !== null ? `${createdRoles} new roles` : null,
      typeof metadata.webhookCreated === "boolean" ? (metadata.webhookCreated ? "Webhook created" : "Webhook reused") : null,
      warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : null
    ]
      .filter(Boolean)
      .join(" · ") || null;
  }

  if (action === "admin.discord.siteops") {
    return typeof metadata.enabled === "boolean"
      ? metadata.enabled
        ? "Live site announcement mirroring enabled."
        : "Live site announcement mirroring disabled."
      : null;
  }

  if (action === "admin.discord.webhook_test") {
    return [
      typeof metadata.httpStatus === "number" ? `HTTP ${metadata.httpStatus}` : null,
      typeof metadata.error === "string" ? metadata.error : null
    ]
      .filter(Boolean)
      .join(" · ") || null;
  }

  if (action === "admin.discord.quickpaste") {
    return typeof metadata.visibility === "string" ? `Visibility: ${metadata.visibility}` : null;
  }

  if (action === "admin.discord.announce") {
    return typeof metadata.tone === "string" ? `Tone: ${metadata.tone}` : null;
  }

  if (action === "discord.announcement.delivery") {
    return [
      typeof metadata.announcementTitle === "string" ? metadata.announcementTitle : null,
      typeof metadata.httpStatus === "number" ? `HTTP ${metadata.httpStatus}` : null,
      typeof metadata.error === "string" ? metadata.error : null
    ]
      .filter(Boolean)
      .join(" · ") || null;
  }

  if (action === "discord.linked_roles.sync") {
    return typeof metadata.platformUsername === "string" ? `Discord account: ${metadata.platformUsername}` : null;
  }

  return null;
}

function toGuildId(targetType: string, targetId: string, metadata: AuditMetadata) {
  if (targetType === "discord_guild") {
    return targetId;
  }
  const metadataGuildId = metadata.guildId;
  return typeof metadataGuildId === "string" && metadataGuildId.trim() ? metadataGuildId : null;
}

export async function listRecentDiscordOperatorActivity(limit = 30): Promise<DiscordOperatorActivity[]> {
  const rows = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      displayName: users.displayName,
      username: users.username,
      email: users.email
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(or(like(auditLogs.action, "admin.discord.%"), like(auditLogs.action, "discord.%")))
    .orderBy(desc(auditLogs.id))
    .limit(limit);

  return rows.map((row) => {
    const metadata = asMetadata(row.metadata);
    const guildId = toGuildId(row.targetType, row.targetId, metadata);

    return {
      id: row.id,
      action: row.action,
      label: toLabel(row.action, metadata),
      detail: toDetail(row.action, metadata),
      status: toStatus(row.action, metadata),
      actorLabel: toActorLabel(row),
      targetType: row.targetType,
      targetId: row.targetId,
      guildId,
      guildName: toGuildName(metadata),
      createdAt: row.createdAt.toISOString()
    };
  });
}

export function buildDiscordGuildOperatorStatuses(
  integrations: DiscordGuildIntegrationRecord[],
  activity: DiscordOperatorActivity[]
): DiscordGuildOperatorStatus[] {
  return integrations.map((guild) => {
    const bootstrapParts = [
      guild.welcomeChannelId,
      guild.announcementsChannelId,
      guild.supportChannelId,
      guild.botChannelId
    ];
    const bootstrapCoverage = bootstrapParts.filter(Boolean).length;
    const guildActivity = activity.filter((entry) => entry.guildId === guild.guildId);

    return {
      ...guild,
      bootstrapReady: bootstrapCoverage === bootstrapParts.length,
      bootstrapCoverage,
      lastWebhookCheck: guildActivity.find((entry) => entry.action === "admin.discord.webhook_test") ?? null,
      lastAnnouncementDelivery:
        guildActivity.find((entry) => entry.action === "discord.announcement.delivery") ?? null,
      recentActivity: guildActivity.slice(0, 6)
    };
  });
}
