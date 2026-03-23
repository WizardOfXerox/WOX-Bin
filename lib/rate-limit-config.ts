export const RATE_LIMIT_CONFIG = {
  register: { max: 5, window: "1 m", windowMs: 60_000, prefix: "wox:register" },
  "sign-in": { max: 10, window: "1 m", windowMs: 60_000, prefix: "wox:signin" },
  "forgot-password": { max: 5, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:forgot" },
  "reset-password": { max: 10, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:resetpw" },
  "anonymous-publish": { max: 20, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:anon" },
  "cli-text-upload": { max: 30, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:cli:text" },
  "file-drop-upload": { max: 20, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:file:upload" },
  "file-drop-manage": { max: 30, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:file:manage" },
  comment: { max: 25, window: "10 m", windowMs: 10 * 60_000, prefix: "wox:comment" },
  star: { max: 40, window: "10 m", windowMs: 10 * 60_000, prefix: "wox:star" },
  "api-key-create": { max: 10, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:key:create" },
  "api-key-paste": { max: 200, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:key:paste" },
  "code-image-export": { max: 20, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:codeimg" },
  "convert-job-create": { max: 30, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:convert:job" },
  "pastebin-migrate": { max: 5, window: "24 h", windowMs: 24 * 60 * 60_000, prefix: "wox:pastebin:migrate" },
  "resend-verification": { max: 5, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:verify:resend" },
  "public-scrape-anonymous": { max: 120, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:scrape:anon" },
  "public-scrape-free": { max: 400, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:scrape:free" },
  "public-scrape-pro": { max: 2000, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:scrape:pro" },
  "public-scrape-team": { max: 6000, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:scrape:team" },
  "public-scrape-admin": { max: 50000, window: "1 h", windowMs: 60 * 60_000, prefix: "wox:scrape:admin" }
} as const;

export type LimitName = keyof typeof RATE_LIMIT_CONFIG;

export type PublicScrapeTier = "anonymous" | "free" | "pro" | "team" | "admin";

export const SCRAPE_LIMIT_NAME: Record<PublicScrapeTier, LimitName> = {
  anonymous: "public-scrape-anonymous",
  free: "public-scrape-free",
  pro: "public-scrape-pro",
  team: "public-scrape-team",
  admin: "public-scrape-admin"
};
