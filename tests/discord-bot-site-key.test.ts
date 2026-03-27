import { afterEach, describe, expect, it } from "vitest";

import { getDiscordBotSiteApiKey, hasDiscordBotSiteApiKey, isDiscordBotSiteApiKey } from "@/lib/discord/bot-site-key";

const originalKey = process.env.DISCORD_BOT_SITE_API_KEY;

afterEach(() => {
  if (typeof originalKey === "string") {
    process.env.DISCORD_BOT_SITE_API_KEY = originalKey;
  } else {
    delete process.env.DISCORD_BOT_SITE_API_KEY;
  }
});

describe("discord bot site key", () => {
  it("treats the configured env secret as a site-owned credential", () => {
    process.env.DISCORD_BOT_SITE_API_KEY = "site-owned-secret";

    expect(getDiscordBotSiteApiKey()).toBe("site-owned-secret");
    expect(hasDiscordBotSiteApiKey()).toBe(true);
    expect(isDiscordBotSiteApiKey("site-owned-secret")).toBe(true);
    expect(isDiscordBotSiteApiKey("wrong-secret")).toBe(false);
  });

  it("returns false when the env key is missing", () => {
    delete process.env.DISCORD_BOT_SITE_API_KEY;

    expect(hasDiscordBotSiteApiKey()).toBe(false);
    expect(isDiscordBotSiteApiKey("anything")).toBe(false);
  });
});
