import { timingSafeEqual } from "node:crypto";

export function getDiscordBotSiteApiKey() {
  return String(process.env.DISCORD_BOT_SITE_API_KEY ?? "").trim();
}

export function hasDiscordBotSiteApiKey() {
  return Boolean(getDiscordBotSiteApiKey());
}

export function isDiscordBotSiteApiKey(token: string | null | undefined) {
  const expected = getDiscordBotSiteApiKey();
  const actual = String(token ?? "").trim();

  if (!expected || !actual) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
