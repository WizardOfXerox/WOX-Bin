import type { Guild } from "discord.js";

import { createAnnouncement } from "@/lib/announcements";
import { isDiscordOperator, type DiscordBotConfig } from "@/lib/discord/bot-env";
import { getDiscordGuildIntegration, setDiscordGuildSiteOps } from "@/lib/discord/guilds";
import { fetchDiscordBotPublicFeed, fetchDiscordBotSiteHealth, getDiscordBotSiteLinks, createDiscordBotQuickPaste } from "@/lib/discord/site-client";
import type { DiscordGuildSetupResult } from "@/lib/discord/setup";

export const DISCORD_EPHEMERAL_FLAG = 1 << 6;

export type DiscordCommandMessage = {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    url?: string;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
  components?: Array<{
    type: 1;
    components: Array<{
      type: 2;
      style: 5;
      label: string;
      url: string;
    }>;
  }>;
};

export type DiscordCommandInput = {
  commandName: string;
  subcommand: string;
  userId: string;
  guildId: string | null;
  guildName: string | null;
  canManageGuild: boolean;
  guild: Guild | null;
  options: {
    count?: number;
    enabled?: boolean;
    title?: string;
    body?: string;
    tone?: "info" | "success" | "warning" | "critical";
    ctaLabel?: string | null;
    ctaHref?: string | null;
    content?: string;
    visibility?: "private" | "unlisted" | "public";
  };
};

export type DiscordCommandRuntime = {
  runGuildSetup: (
    input: DiscordCommandInput,
    config: DiscordBotConfig
  ) => Promise<{
    result: DiscordGuildSetupResult;
  }>;
};

export type DiscordCommandPlan = {
  deferred: boolean;
  ephemeral: boolean;
  execute: () => Promise<DiscordCommandMessage>;
};

function buildLinksComponents() {
  const links = getDiscordBotSiteLinks();
  return [
    {
      type: 1 as const,
      components: [
        { type: 2 as const, style: 5 as const, label: "Workspace", url: links.workspace },
        { type: 2 as const, style: 5 as const, label: "Quick paste", url: links.quick },
        { type: 2 as const, style: 5 as const, label: "Feed", url: links.feed },
        { type: 2 as const, style: 5 as const, label: "Privacy", url: links.privacy },
        { type: 2 as const, style: 5 as const, label: "Support", url: links.support }
      ]
    }
  ];
}

function summarizeGuildSetup(result: DiscordGuildSetupResult) {
  const lines = [
    result.createdChannels.length
      ? `Created channels: ${result.createdChannels.map((name) => `#${name}`).join(", ")}`
      : "Created channels: none",
    result.reusedChannels.length
      ? `Reused channels: ${result.reusedChannels.map((name) => `#${name}`).join(", ")}`
      : "Reused channels: none",
    result.createdRoles.length ? `Created roles: ${result.createdRoles.join(", ")}` : "Created roles: none",
    result.reusedRoles.length ? `Reused roles: ${result.reusedRoles.join(", ")}` : "Reused roles: none",
    `Announcement webhook: ${result.webhookCreated ? "created" : "ready/reused"}`,
    `Site ops enabled: ${result.siteOpsEnabled ? "yes" : "no"}`
  ];

  if (result.warnings.length > 0) {
    lines.push(`Warnings: ${result.warnings.join(" | ")}`);
  }

  return lines.join("\n");
}

function requireOperator(config: DiscordBotConfig, input: DiscordCommandInput) {
  if (!isDiscordOperator(config, input.userId)) {
    throw new Error("This command is restricted to configured WOX-Bin Discord operators.");
  }
}

function requireGuildManager(input: DiscordCommandInput) {
  if (!input.guildId) {
    throw new Error("This command must be used inside a server.");
  }

  if (!input.canManageGuild) {
    throw new Error("You need Manage Server permission to run setup in this guild.");
  }
}

export function createDiscordCommandPlan(
  input: DiscordCommandInput,
  config: DiscordBotConfig,
  runtime: DiscordCommandRuntime
): DiscordCommandPlan | null {
  if (input.commandName !== "wox") {
    return null;
  }

  if (input.subcommand === "help") {
    return {
      deferred: false,
      ephemeral: true,
      execute: async () => ({
        embeds: [
          {
            title: "WOX-Bin bot help",
            color: 0x38bdf8,
            description:
              "Use this bot to bootstrap a WOX-Bin server, mirror live site announcements, check site health, pull the public feed, and create operator-only quick pastes.",
            fields: [
              {
                name: "Public commands",
                value: "`/wox links`, `/wox feed`, `/wox status`, `/wox help`"
              },
              {
                name: "Guild setup",
                value: "`/wox setup` creates the WOX-Bin channels, roles, and announcement webhook."
              },
              {
                name: "Operator commands",
                value: "`/wox siteops`, `/wox announce`, `/wox quickpaste`"
              }
            ]
          }
        ],
        components: buildLinksComponents()
      })
    };
  }

  if (input.subcommand === "links") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const links = getDiscordBotSiteLinks();
        return {
          embeds: [
            {
              title: "WOX-Bin links",
              description: [`Workspace: ${links.workspace}`, `Quick paste: ${links.quick}`, `Feed: ${links.feed}`, `Support: ${links.support}`].join(
                "\n"
              ),
              color: 0x38bdf8
            }
          ],
          components: buildLinksComponents()
        };
      }
    };
  }

  if (input.subcommand === "feed") {
    return {
      deferred: true,
      ephemeral: false,
      execute: async () => {
        const count = input.options.count ?? 5;
        const items = await fetchDiscordBotPublicFeed(count);
        const links = getDiscordBotSiteLinks();
        return {
          embeds: [
            {
              title: "Latest public WOX-Bin pastes",
              color: 0x38bdf8,
              description: items.length
                ? items.map((item) => `• **${item.title || "Untitled"}** — ${item.language} — ${links.home}p/${item.slug}`).join("\n")
                : "No public pastes are available right now."
            }
          ],
          components: buildLinksComponents()
        };
      }
    };
  }

  if (input.subcommand === "status") {
    return {
      deferred: true,
      ephemeral: true,
      execute: async () => {
        const health = await fetchDiscordBotSiteHealth();
        return {
          embeds: [
            {
              title: "WOX-Bin status",
              color: health.ok ? 0x22c55e : 0xdc2626,
              fields: [
                { name: "Health", value: health.ok ? "OK" : "Degraded", inline: true },
                { name: "Database", value: health.db, inline: true },
                { name: "Checked at", value: health.time }
              ]
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "setup") {
    return {
      deferred: true,
      ephemeral: true,
      execute: async () => {
        requireGuildManager(input);
        const setupState = await runtime.runGuildSetup(input, config);

        return {
          embeds: [
            {
              title: "WOX-Bin server setup complete",
              color: 0x22c55e,
              description: summarizeGuildSetup(setupState.result)
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "siteops") {
    return {
      deferred: true,
      ephemeral: true,
      execute: async () => {
        requireOperator(config, input);
        requireGuildManager(input);
        const enabled = Boolean(input.options.enabled);
        const existing = await getDiscordGuildIntegration(input.guildId!);
        if (!existing) {
          throw new Error("Run `/wox setup` first so the guild is registered before toggling site ops.");
        }

        const updated = await setDiscordGuildSiteOps(input.guildId!, enabled);

        return {
          embeds: [
            {
              title: "WOX-Bin site ops updated",
              color: enabled ? 0x22c55e : 0xf59e0b,
              description: `${updated?.guildName ?? input.guildName ?? "This guild"} will ${
                enabled ? "now" : "no longer"
              } receive live site announcements via the Discord webhook.`
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "announce") {
    return {
      deferred: true,
      ephemeral: true,
      execute: async () => {
        requireOperator(config, input);
        const announcement = await createAnnouncement(
          {
            title: input.options.title ?? "WOX-Bin update",
            body: input.options.body ?? "",
            tone: input.options.tone ?? "info",
            ctaLabel: input.options.ctaLabel ?? null,
            ctaHref: input.options.ctaHref ?? null,
            published: true,
            startsAt: null,
            endsAt: null
          },
          null
        );

        return {
          embeds: [
            {
              title: "Live site announcement published",
              color: 0x22c55e,
              description: `${announcement.title}\n\n${announcement.body}`
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "quickpaste") {
    return {
      deferred: true,
      ephemeral: true,
      execute: async () => {
        requireOperator(config, input);
        const created = await createDiscordBotQuickPaste({
          title: input.options.title ?? "Untitled",
          content: input.options.content ?? "",
          visibility: input.options.visibility ?? "unlisted"
        });

        return {
          embeds: [
            {
              title: "Hosted paste created",
              color: 0x22c55e,
              description: created.url ? `Open: ${created.url}` : `Slug: ${created.slug ?? "unknown"}`
            }
          ]
        };
      }
    };
  }

  return {
    deferred: false,
    ephemeral: true,
    execute: async () => ({
      content: "That command is not supported yet."
    })
  };
}
