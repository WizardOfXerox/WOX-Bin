export const DISCORD_SETUP_VERSION = 1;
export const DISCORD_CATEGORY_NAME = "WOX-Bin";
export const DISCORD_ANNOUNCEMENT_WEBHOOK_NAME = "WOX-Bin Site";

export const DISCORD_ROLE_BLUEPRINTS = [
  {
    key: "admin",
    name: "WOX Admin",
    reason: "Can coordinate server setup and site-ops actions for the WOX-Bin bot."
  },
  {
    key: "support",
    name: "WOX Support",
    reason: "Can handle community support and workflow handoff inside the WOX-Bin server."
  }
] as const;

export const DISCORD_CHANNEL_BLUEPRINTS = [
  {
    key: "welcome",
    name: "wox-start-here",
    topic: "Install links, quick navigation, and the server bootstrap summary for WOX-Bin."
  },
  {
    key: "announcements",
    name: "wox-announcements",
    topic: "Live site announcements mirrored from WOX-Bin plus release notices."
  },
  {
    key: "support",
    name: "wox-support",
    topic: "Support links, user help flow, and human handoff notes for the WOX-Bin server."
  },
  {
    key: "bot",
    name: "wox-bot",
    topic: "Slash commands, bot diagnostics, site status, and feed lookups."
  }
] as const;

export type DiscordChannelKey = (typeof DISCORD_CHANNEL_BLUEPRINTS)[number]["key"];

export function buildDiscordWelcomeLines(baseUrl: string) {
  return [
    `Workspace: ${baseUrl}/app`,
    `Quick paste: ${baseUrl}/quick`,
    `Public feed: ${baseUrl}/feed`,
    `Privacy tools: ${baseUrl}/privacy-tools`,
    `Support center: ${baseUrl}/support`,
    `BookmarkFS sync: ${baseUrl}/bookmarkfs/sync`
  ];
}

export function normalizeDiscordSiteBaseUrl(value: string | null | undefined) {
  const raw = String(value ?? "").trim().replace(/\/+$/, "");
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

export function buildDiscordSiteLinks(baseUrl: string) {
  const origin = normalizeDiscordSiteBaseUrl(baseUrl);
  return {
    home: `${origin}/`,
    workspace: `${origin}/app`,
    quick: `${origin}/quick`,
    feed: `${origin}/feed`,
    archive: `${origin}/archive`,
    privacy: `${origin}/privacy-tools`,
    support: `${origin}/support`,
    bookmarkfs: `${origin}/bookmarkfs`
  };
}
