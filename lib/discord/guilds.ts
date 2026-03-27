import { desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { discordGuildIntegrations } from "@/lib/db/schema";
import { DISCORD_SETUP_VERSION } from "@/lib/discord/shared";

export type DiscordGuildIntegrationRecord = {
  guildId: string;
  guildName: string;
  ownerDiscordUserId: string | null;
  welcomeChannelId: string | null;
  announcementsChannelId: string | null;
  supportChannelId: string | null;
  botChannelId: string | null;
  announcementWebhookUrl: string | null;
  siteOpsEnabled: boolean;
  setupVersion: number;
  installedAt: string;
  lastSetupAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

type UpsertDiscordGuildIntegrationInput = {
  guildId: string;
  guildName: string;
  ownerDiscordUserId?: string | null;
  welcomeChannelId?: string | null;
  announcementsChannelId?: string | null;
  supportChannelId?: string | null;
  botChannelId?: string | null;
  announcementWebhookUrl?: string | null;
  siteOpsEnabled?: boolean;
  setupVersion?: number;
};

function serializeIntegration(
  row: typeof discordGuildIntegrations.$inferSelect
): DiscordGuildIntegrationRecord {
  return {
    guildId: row.guildId,
    guildName: row.guildName,
    ownerDiscordUserId: row.ownerDiscordUserId ?? null,
    welcomeChannelId: row.welcomeChannelId ?? null,
    announcementsChannelId: row.announcementsChannelId ?? null,
    supportChannelId: row.supportChannelId ?? null,
    botChannelId: row.botChannelId ?? null,
    announcementWebhookUrl: row.announcementWebhookUrl ?? null,
    siteOpsEnabled: row.siteOpsEnabled,
    setupVersion: row.setupVersion,
    installedAt: row.installedAt.toISOString(),
    lastSetupAt: row.lastSetupAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listDiscordGuildIntegrations(options?: { siteOpsOnly?: boolean }) {
  const rows = await db
    .select()
    .from(discordGuildIntegrations)
    .where(options?.siteOpsOnly ? eq(discordGuildIntegrations.siteOpsEnabled, true) : undefined)
    .orderBy(desc(discordGuildIntegrations.updatedAt));

  return rows.map(serializeIntegration);
}

export async function getDiscordGuildIntegration(guildId: string) {
  const [row] = await db
    .select()
    .from(discordGuildIntegrations)
    .where(eq(discordGuildIntegrations.guildId, guildId))
    .limit(1);

  return row ? serializeIntegration(row) : null;
}

export async function upsertDiscordGuildIntegration(input: UpsertDiscordGuildIntegrationInput) {
  const now = new Date();
  const [row] = await db
    .insert(discordGuildIntegrations)
    .values({
      guildId: input.guildId,
      guildName: input.guildName,
      ownerDiscordUserId: input.ownerDiscordUserId ?? null,
      welcomeChannelId: input.welcomeChannelId ?? null,
      announcementsChannelId: input.announcementsChannelId ?? null,
      supportChannelId: input.supportChannelId ?? null,
      botChannelId: input.botChannelId ?? null,
      announcementWebhookUrl: input.announcementWebhookUrl ?? null,
      siteOpsEnabled: input.siteOpsEnabled ?? false,
      setupVersion: input.setupVersion ?? DISCORD_SETUP_VERSION,
      installedAt: now,
      lastSetupAt: now,
      lastSeenAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: discordGuildIntegrations.guildId,
      set: {
        guildName: input.guildName,
        ownerDiscordUserId: input.ownerDiscordUserId ?? null,
        welcomeChannelId: input.welcomeChannelId ?? null,
        announcementsChannelId: input.announcementsChannelId ?? null,
        supportChannelId: input.supportChannelId ?? null,
        botChannelId: input.botChannelId ?? null,
        announcementWebhookUrl: input.announcementWebhookUrl ?? null,
        siteOpsEnabled: input.siteOpsEnabled ?? false,
        setupVersion: input.setupVersion ?? DISCORD_SETUP_VERSION,
        lastSetupAt: now,
        lastSeenAt: now,
        updatedAt: now
      }
    })
    .returning();

  return serializeIntegration(row);
}

export async function setDiscordGuildSiteOps(guildId: string, enabled: boolean) {
  const [row] = await db
    .update(discordGuildIntegrations)
    .set({
      siteOpsEnabled: enabled,
      updatedAt: new Date(),
      lastSeenAt: new Date()
    })
    .where(eq(discordGuildIntegrations.guildId, guildId))
    .returning();

  return row ? serializeIntegration(row) : null;
}

export async function listDiscordAnnouncementWebhookTargets() {
  const rows = await db
    .select({
      guildId: discordGuildIntegrations.guildId,
      guildName: discordGuildIntegrations.guildName,
      announcementWebhookUrl: discordGuildIntegrations.announcementWebhookUrl
    })
    .from(discordGuildIntegrations)
    .where(eq(discordGuildIntegrations.siteOpsEnabled, true));

  return rows.filter((row) => Boolean(row.announcementWebhookUrl));
}

export async function listDiscordLinkedGuildsWithWebhooks() {
  const rows = await db
    .select()
    .from(discordGuildIntegrations)
    .where(isNotNull(discordGuildIntegrations.announcementWebhookUrl))
    .orderBy(desc(discordGuildIntegrations.updatedAt));

  return rows.map(serializeIntegration);
}
