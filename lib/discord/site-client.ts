import { buildDiscordSiteLinks, normalizeDiscordSiteBaseUrl } from "@/lib/discord/shared";

export type DiscordSiteHealth = {
  ok: boolean;
  db: string;
  time: string;
};

export type DiscordFeedItem = {
  slug: string;
  title: string;
  language: string;
  createdAt: string;
};

export function resolveDiscordBotSiteBaseUrl() {
  return (
    normalizeDiscordSiteBaseUrl(process.env.DISCORD_SITE_BASE_URL) ||
    normalizeDiscordSiteBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    "http://localhost:3000"
  );
}

export function getDiscordBotSiteLinks() {
  return buildDiscordSiteLinks(resolveDiscordBotSiteBaseUrl());
}

export async function fetchDiscordBotSiteHealth() {
  const baseUrl = resolveDiscordBotSiteBaseUrl();
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as DiscordSiteHealth;
}

export async function fetchDiscordBotPublicFeed(limit = 5) {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(10, Math.trunc(limit))) : 5;
  const baseUrl = resolveDiscordBotSiteBaseUrl();
  const response = await fetch(`${baseUrl}/api/public/feed?limit=${safeLimit}`, {
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(7000)
  });

  if (!response.ok) {
    throw new Error(`Public feed request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as {
    pastes?: DiscordFeedItem[];
  };
  return payload.pastes ?? [];
}

export async function createDiscordBotQuickPaste(input: {
  title: string;
  content: string;
  visibility: "private" | "unlisted" | "public";
}) {
  const apiKey = String(process.env.DISCORD_BOT_SITE_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("DISCORD_BOT_SITE_API_KEY is not configured.");
  }

  const baseUrl = resolveDiscordBotSiteBaseUrl();
  const response = await fetch(`${baseUrl}/api/discord/quickpaste`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      title: input.title.trim(),
      content: input.content,
      language: "none",
      visibility: input.visibility
    }),
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();
  let payload: { error?: string; slug?: string; url?: string } | null = null;
  try {
    payload = text ? (JSON.parse(text) as { error?: string; slug?: string; url?: string }) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? `Quick paste failed with HTTP ${response.status}.`);
  }

  return {
    slug: payload?.slug ?? null,
    url: payload?.url ? `${baseUrl}${payload.url}` : null
  };
}
