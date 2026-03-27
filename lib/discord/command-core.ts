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

type DiscordLinkButton = {
  label: string;
  url: string;
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
    sides?: number;
    enabled?: boolean;
    title?: string;
    body?: string;
    tone?: "info" | "success" | "warning" | "critical";
    ctaLabel?: string | null;
    ctaHref?: string | null;
    content?: string;
    visibility?: "private" | "unlisted" | "public";
    optionsText?: string;
    question?: string;
    pick?: "rock" | "paper" | "scissors";
    mood?: "focus" | "lofi" | "synthwave" | "ambient" | "phonk" | "metal" | "custom";
    query?: string;
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
  return buildUrlButtonRows([
    { label: "Workspace", url: links.workspace },
    { label: "Quick paste", url: links.quick },
    { label: "Feed", url: links.feed },
    { label: "Privacy", url: links.privacy },
    { label: "Support", url: links.support }
  ]);
}

function buildUrlButtonRows(buttons: DiscordLinkButton[]) {
  const rows: DiscordCommandMessage["components"] = [];

  for (let index = 0; index < buttons.length; index += 5) {
    rows.push({
      type: 1,
      components: buttons.slice(index, index + 5).map((button) => ({
        type: 2,
        style: 5,
        label: button.label,
        url: button.url
      }))
    });
  }

  return rows;
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(value as number)));
}

function normalizeChoiceList(raw: string | undefined) {
  return String(raw ?? "")
    .split(/[\n,|]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildToolsComponents() {
  const links = getDiscordBotSiteLinks();
  return buildUrlButtonRows([
    { label: "Privacy suite", url: links.privacy },
    { label: "Shorten", url: `${links.home}shorten` },
    { label: "Snapshot", url: `${links.home}snapshot` },
    { label: "Proof", url: `${links.home}proof` },
    { label: "Poll", url: `${links.home}poll` },
    { label: "Chat", url: `${links.home}chat` },
    { label: "Docs", url: `${links.home}doc` },
    { label: "BookmarkFS", url: links.bookmarkfs },
    { label: "Workspace", url: links.workspace },
    { label: "Support", url: links.support }
  ]);
}

function buildMusicSearchQuery(mood: NonNullable<DiscordCommandInput["options"]["mood"]>, query: string | undefined) {
  const trimmed = String(query ?? "").trim();
  if (mood === "custom") {
    return trimmed;
  }

  const defaults: Record<Exclude<NonNullable<DiscordCommandInput["options"]["mood"]>, "custom">, string> = {
    focus: "focus music coding mix",
    lofi: "lofi beats study mix",
    synthwave: "synthwave retrowave mix",
    ambient: "ambient deep focus mix",
    phonk: "drift phonk mix",
    metal: "instrumental metal mix"
  };

  return trimmed || defaults[mood];
}

function buildMusicComponents(query: string) {
  const encoded = encodeURIComponent(query);
  return buildUrlButtonRows([
    { label: "YouTube", url: `https://www.youtube.com/results?search_query=${encoded}` },
    { label: "Spotify", url: `https://open.spotify.com/search/${encoded}` },
    { label: "Apple Music", url: `https://music.apple.com/us/search?term=${encoded}` },
    { label: "SoundCloud", url: `https://soundcloud.com/search?q=${encoded}` }
  ]);
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
                value:
                  "`/wox links`, `/wox tools`, `/wox feed`, `/wox status`, `/wox roll`, `/wox coinflip`, `/wox choose`, `/wox magic8`, `/wox rps`, `/wox music`, `/wox help`"
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

  if (input.subcommand === "tools") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const links = getDiscordBotSiteLinks();
        return {
          embeds: [
            {
              title: "WOX-Bin tools",
              color: 0x38bdf8,
              description:
                "Fast links to the privacy suite, shortener, snapshots, proofs, polls, chat, docs, BookmarkFS, and core workspace surfaces.",
              fields: [
                {
                  name: "Privacy tools",
                  value: `${links.privacy}\n${links.home}shorten\n${links.home}snapshot\n${links.home}proof\n${links.home}poll\n${links.home}chat`
                },
                {
                  name: "Core surfaces",
                  value: `${links.workspace}\n${links.quick}\n${links.feed}\n${links.bookmarkfs}\n${links.support}`
                }
              ]
            }
          ],
          components: buildToolsComponents()
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

  if (input.subcommand === "roll") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const sides = clampInteger(input.options.sides, 2, 1000, 6);
        const rolls = clampInteger(input.options.count, 1, 10, 1);
        const results = Array.from({ length: rolls }, () => Math.floor(Math.random() * sides) + 1);
        const total = results.reduce((sum, value) => sum + value, 0);

        return {
          embeds: [
            {
              title: "Dice roll",
              color: 0x38bdf8,
              description: `Rolled **${rolls}d${sides}**`,
              fields: [
                { name: "Results", value: results.join(", "), inline: false },
                { name: "Total", value: String(total), inline: true },
                { name: "Highest", value: String(Math.max(...results)), inline: true }
              ]
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "coinflip") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        return {
          embeds: [
            {
              title: "Coin flip",
              color: 0x38bdf8,
              description: `The coin landed on **${result}**.`
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "choose") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const choices = normalizeChoiceList(input.options.optionsText);
        if (choices.length < 2) {
          throw new Error("Give me at least two choices separated by commas, pipes, or new lines.");
        }

        const selected = pickRandom(choices);
        return {
          embeds: [
            {
              title: "Choice picker",
              color: 0x38bdf8,
              description: `I choose **${selected}**.`,
              fields: [
                {
                  name: "Options",
                  value: choices.map((choice, index) => `${index + 1}. ${choice}`).join("\n")
                }
              ]
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "magic8") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const question = String(input.options.question ?? "").trim();
        if (!question) {
          throw new Error("Ask a yes-or-no question first.");
        }

        const answers = [
          "Yes, definitely.",
          "No chance.",
          "Ask again later.",
          "Signs point to yes.",
          "Very doubtful.",
          "Absolutely.",
          "Focus and try again.",
          "It would be wise to wait."
        ] as const;

        return {
          embeds: [
            {
              title: "Magic 8-Ball",
              color: 0x38bdf8,
              fields: [
                { name: "Question", value: question },
                { name: "Answer", value: pickRandom(answers) }
              ]
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "rps") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const playerPick = input.options.pick;
        if (!playerPick) {
          throw new Error("Choose rock, paper, or scissors.");
        }

        const botPick = pickRandom(["rock", "paper", "scissors"] as const);
        const winsAgainst: Record<"rock" | "paper" | "scissors", "rock" | "paper" | "scissors"> = {
          rock: "scissors",
          paper: "rock",
          scissors: "paper"
        };

        const result =
          playerPick === botPick ? "It's a tie." : winsAgainst[playerPick] === botPick ? "You win." : "I win.";

        return {
          embeds: [
            {
              title: "Rock, paper, scissors",
              color: 0x38bdf8,
              fields: [
                { name: "You", value: playerPick, inline: true },
                { name: "Bot", value: botPick, inline: true },
                { name: "Result", value: result, inline: false }
              ]
            }
          ]
        };
      }
    };
  }

  if (input.subcommand === "music") {
    return {
      deferred: false,
      ephemeral: false,
      execute: async () => {
        const mood = input.options.mood ?? "focus";
        const query = buildMusicSearchQuery(mood, input.options.query);
        if (!query) {
          throw new Error("For custom music mode, add a search query too.");
        }

        return {
          embeds: [
            {
              title: "Music helper",
              color: 0x38bdf8,
              description:
                "WOX-Bin does not run a voice music player, but it can hand you fast search links for a mood or custom query.",
              fields: [
                { name: "Mode", value: mood, inline: true },
                { name: "Search", value: query, inline: true }
              ]
            }
          ],
          components: buildMusicComponents(query)
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
