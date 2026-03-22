import { z } from "zod";

/** Dotenv often yields `""` for `KEY=` — treat as unset so `.url()` does not throw. */
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url().optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_PRO_UPGRADE_URL: optionalUrl,
  NEXT_PUBLIC_TEAM_UPGRADE_URL: optionalUrl,
  NEXT_PUBLIC_BILLING_PORTAL_URL: optionalUrl,
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  /** Minutes without a server refresh before JWT browser session is revoked (rolling). Default 30. */
  SESSION_IDLE_MINUTES: z.coerce.number().min(1).max(24 * 60).optional()
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PRO_UPGRADE_URL: process.env.NEXT_PUBLIC_PRO_UPGRADE_URL,
  NEXT_PUBLIC_TEAM_UPGRADE_URL: process.env.NEXT_PUBLIC_TEAM_UPGRADE_URL,
  NEXT_PUBLIC_BILLING_PORTAL_URL: process.env.NEXT_PUBLIC_BILLING_PORTAL_URL,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  SESSION_IDLE_MINUTES: process.env.SESSION_IDLE_MINUTES,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM: process.env.SMTP_FROM,
  MAIL_FROM: process.env.MAIL_FROM
});

type StringEnvKey = Exclude<keyof typeof env, "SESSION_IDLE_MINUTES">;

export function requireEnv(name: StringEnvKey): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value as string;
}
