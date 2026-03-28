import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { announcementWriteSchema, createAnnouncement } from "@/lib/announcements";
import { isAdminSession } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { getDiscordControlSnapshot } from "@/lib/discord/control-center";
import { buildDiscordWebhookTestBody, discordAdminActionSchema } from "@/lib/discord/admin-console";
import { getDiscordGuildIntegration, setDiscordGuildSiteOps } from "@/lib/discord/guilds";
import { resolveDiscordBotSiteBaseUrl, createDiscordBotQuickPaste } from "@/lib/discord/site-client";
import { ensureDiscordGuildSetupViaRest } from "@/lib/discord/setup-rest";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const snapshot = await getDiscordControlSnapshot();
  return NextResponse.json({ snapshot });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const body = await request.json().catch(() => null);
  if (body?.action === "announce") {
    const parsed = announcementWriteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid announcement payload.");
    }

    const announcement = await createAnnouncement(parsed.data, session.user.id);
    await logAudit({
      actorUserId: session.user.id,
      action: "admin.discord.announce",
      targetType: "announcement",
      targetId: announcement.id,
      metadata: {
        published: announcement.published,
        tone: announcement.tone
      }
    });

    return NextResponse.json({
      message: announcement.published
        ? "Announcement published and mirrored to site-ops guilds."
        : "Announcement draft created.",
      announcement
    });
  }

  const parsed = discordAdminActionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid Discord admin action payload.");
  }

  try {
    let message = "Discord admin action complete.";
    let extra: Record<string, unknown> = {};

    if (parsed.data.action === "setup") {
      const token = String(process.env.DISCORD_BOT_TOKEN ?? "").trim();
      if (!token) {
        return jsonError("DISCORD_BOT_TOKEN is not configured.", 500);
      }

      const setupState = await ensureDiscordGuildSetupViaRest(parsed.data.guildId, token);
      message = `Guild setup refreshed for ${setupState.integration.guildName}.`;
      extra = {
        guild: setupState.integration,
        result: setupState.result
      };

      await logAudit({
        actorUserId: session.user.id,
        action: "admin.discord.setup",
        targetType: "discord_guild",
        targetId: parsed.data.guildId,
        metadata: {
          guildName: setupState.integration.guildName,
          createdChannels: setupState.result.createdChannels.length,
          createdRoles: setupState.result.createdRoles.length,
          warnings: setupState.result.warnings.length,
          webhookCreated: setupState.result.webhookCreated
        }
      });
    } else if (parsed.data.action === "siteops") {
      const guild = await setDiscordGuildSiteOps(parsed.data.guildId, parsed.data.enabled);
      if (!guild) {
        return jsonError("Guild integration not found. Run setup first.", 404);
      }

      message = parsed.data.enabled
        ? `${guild.guildName} will now receive live site announcements.`
        : `${guild.guildName} will no longer mirror live site announcements.`;
      extra = { guild };

      await logAudit({
        actorUserId: session.user.id,
        action: "admin.discord.siteops",
        targetType: "discord_guild",
        targetId: parsed.data.guildId,
        metadata: {
          guildName: guild.guildName,
          enabled: parsed.data.enabled
        }
      });
    } else if (parsed.data.action === "webhook-test") {
      const guild = await getDiscordGuildIntegration(parsed.data.guildId);
      if (!guild) {
        return jsonError("Guild integration not found. Run setup first.", 404);
      }
      if (!guild.announcementWebhookUrl) {
        return jsonError("This guild does not have an announcement webhook yet. Run setup again.", 400);
      }

      let response: Response;
      try {
        response = await fetch(guild.announcementWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildDiscordWebhookTestBody(guild.guildName, resolveDiscordBotSiteBaseUrl())),
          signal: AbortSignal.timeout(5000)
        });
      } catch (error) {
        await logAudit({
          actorUserId: session.user.id,
          action: "admin.discord.webhook_test",
          targetType: "discord_guild",
          targetId: parsed.data.guildId,
          metadata: {
            guildName: guild.guildName,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown Discord webhook error"
          }
        });
        return jsonError("Discord webhook test could not reach the webhook endpoint.", 502);
      }

      if (!response.ok) {
        await logAudit({
          actorUserId: session.user.id,
          action: "admin.discord.webhook_test",
          targetType: "discord_guild",
          targetId: parsed.data.guildId,
          metadata: {
            guildName: guild.guildName,
            status: "failed",
            httpStatus: response.status
          }
        });
        return jsonError(`Discord webhook test failed with HTTP ${response.status}.`, 502);
      }

      message = `Webhook test delivered to ${guild.guildName}.`;
      extra = { guild };

      await logAudit({
        actorUserId: session.user.id,
        action: "admin.discord.webhook_test",
        targetType: "discord_guild",
        targetId: parsed.data.guildId,
        metadata: {
          guildName: guild.guildName,
          status: "delivered",
          httpStatus: response.status
        }
      });
    } else if (parsed.data.action === "quickpaste") {
      const paste = await createDiscordBotQuickPaste({
        title: parsed.data.title,
        content: parsed.data.content,
        visibility: parsed.data.visibility
      });

      message = "Quick paste created for Discord bot use.";
      extra = { paste };

      await logAudit({
        actorUserId: session.user.id,
        action: "admin.discord.quickpaste",
        targetType: "paste",
        targetId: paste.slug ?? "discord-bot",
        metadata: {
          visibility: parsed.data.visibility
        }
      });
    }

    const snapshot = await getDiscordControlSnapshot();
    return NextResponse.json({
      message,
      snapshot,
      ...extra
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Discord admin action failed.", 500);
  }
}
