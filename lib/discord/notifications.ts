import type { AnnouncementRecord } from "@/lib/announcements";
import { listDiscordAnnouncementWebhookTargets } from "@/lib/discord/guilds";
import { buildDiscordSiteLinks, normalizeDiscordSiteBaseUrl } from "@/lib/discord/shared";
import { logAudit } from "@/lib/audit";

function resolvePublicBaseUrl() {
  return (
    normalizeDiscordSiteBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeDiscordSiteBaseUrl(process.env.AUTH_URL) ||
    "http://localhost:3000"
  );
}

export function buildDiscordAnnouncementWebhookBody(announcement: AnnouncementRecord) {
  const baseUrl = resolvePublicBaseUrl();
  const siteLinks = buildDiscordSiteLinks(baseUrl);
  const ctaUrl = announcement.ctaHref
    ? announcement.ctaHref.startsWith("/")
      ? `${baseUrl}${announcement.ctaHref}`
      : announcement.ctaHref
    : `${siteLinks.home}changelog`;

  const color =
    announcement.tone === "critical"
      ? 0xdc2626
      : announcement.tone === "warning"
        ? 0xf59e0b
        : announcement.tone === "success"
          ? 0x22c55e
          : 0x38bdf8;

  return {
    username: "WOX-Bin",
    embeds: [
      {
        title: announcement.title,
        description: announcement.body,
        color,
        url: ctaUrl,
        fields: [
          {
            name: "Open",
            value: `[Workspace](${siteLinks.workspace}) · [Feed](${siteLinks.feed}) · [Support](${siteLinks.support})`,
            inline: false
          }
        ],
        footer: {
          text: "WOX-Bin site announcement"
        },
        timestamp: announcement.updatedAt
      }
    ]
  };
}

export async function dispatchDiscordAnnouncement(announcement: AnnouncementRecord) {
  const targets = await listDiscordAnnouncementWebhookTargets();
  if (targets.length === 0) {
    return { delivered: 0, attempted: 0 };
  }

  const payload = buildDiscordAnnouncementWebhookBody(announcement);
  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await fetch(String(target.announcementWebhookUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000)
        });

        const status = response.ok ? "delivered" : "failed";
        await logAudit({
          action: "discord.announcement.delivery",
          targetType: "discord_guild",
          targetId: target.guildId,
          metadata: {
            guildId: target.guildId,
            guildName: target.guildName,
            announcementId: announcement.id,
            announcementTitle: announcement.title,
            httpStatus: response.status,
            status
          }
        });

        return response.ok;
      } catch (error) {
        await logAudit({
          action: "discord.announcement.delivery",
          targetType: "discord_guild",
          targetId: target.guildId,
          metadata: {
            guildId: target.guildId,
            guildName: target.guildName,
            announcementId: announcement.id,
            announcementTitle: announcement.title,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown Discord webhook error"
          }
        });

        return false;
      }
    })
  );

  const delivered = results.filter(Boolean).length;

  return {
    delivered,
    attempted: targets.length
  };
}
