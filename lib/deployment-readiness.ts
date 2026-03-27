import { sql as drizzleSql } from "drizzle-orm";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getBillingLinks } from "@/lib/billing";
import { isSmtpConfigured } from "@/lib/mail";

export type DeploymentCheckGroup = "core" | "security" | "integrations" | "tools";
export type DeploymentCheckLevel = "pass" | "warn" | "fail" | "info";

export type DeploymentCheck = {
  id: string;
  group: DeploymentCheckGroup;
  label: string;
  level: DeploymentCheckLevel;
  summary: string;
  detail?: string;
  docs?: string[];
};

export type DeploymentNextAction = {
  checkId: string;
  label: string;
  level: Extract<DeploymentCheckLevel, "fail" | "warn">;
  summary: string;
  docs: string[];
};

export type DeploymentReadinessSnapshot = {
  generatedAt: string;
  environment: {
    nodeEnv: string;
    vercel: boolean;
    vercelEnv: string | null;
    nextAuthUrl: string | null;
    appUrl: string | null;
    convertUploadVia: string;
    codeImagePlaywrightExport: boolean;
  };
  checks: DeploymentCheck[];
  counts: Record<DeploymentCheckLevel, number>;
  overallLevel: "pass" | "warn" | "fail";
  nextActions: DeploymentNextAction[];
};

function isHttpsUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isDefaultDevSecret(value: string | null) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes("change-me") || normalized.includes("local-dev") || normalized.includes("woxbin-local");
}

function getConvertUploadVia() {
  return process.env.CONVERT_UPLOAD_VIA?.trim() || (process.env.VERCEL === "1" ? "presign" : "proxy");
}

function envFlag(name: string) {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function buildStripeConfigStatus() {
  const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const hasProPrice = Boolean(
    process.env.STRIPE_PRICE_PRO_IDS?.trim() || process.env.STRIPE_PRICE_PRO_ID?.trim()
  );
  const hasTeamPrice = Boolean(
    process.env.STRIPE_PRICE_TEAM_IDS?.trim() || process.env.STRIPE_PRICE_TEAM_ID?.trim()
  );

  return {
    hasWebhookSecret,
    hasSecretKey,
    hasProPrice,
    hasTeamPrice,
    any: hasWebhookSecret || hasSecretKey || hasProPrice || hasTeamPrice,
    complete: hasWebhookSecret && hasProPrice && hasTeamPrice
  };
}

function buildConversionConfigStatus() {
  const bucket = process.env.CONVERT_S3_BUCKET?.trim();
  const accessKey = process.env.CONVERT_S3_ACCESS_KEY?.trim() || process.env.CONVERT_S3_ACCESS_KEY_ID?.trim();
  const secretKey =
    process.env.CONVERT_S3_SECRET_KEY?.trim() || process.env.CONVERT_S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.CONVERT_S3_REGION?.trim();
  const endpoint = process.env.CONVERT_S3_ENDPOINT?.trim();

  const requiredCount = [bucket, accessKey, secretKey].filter(Boolean).length;

  return {
    bucket: Boolean(bucket),
    accessKey: Boolean(accessKey),
    secretKey: Boolean(secretKey),
    region: Boolean(region),
    endpoint: Boolean(endpoint),
    any: requiredCount > 0 || Boolean(region) || Boolean(endpoint),
    coreComplete: requiredCount === 3
  };
}

export function summarizeDeploymentChecks(checks: DeploymentCheck[]) {
  const counts = checks.reduce<Record<DeploymentCheckLevel, number>>(
    (acc, check) => {
      acc[check.level] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0, info: 0 }
  );

  const overallLevel: "pass" | "warn" | "fail" =
    counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";

  const nextActions: DeploymentNextAction[] = checks
    .filter((check): check is DeploymentCheck & { level: "fail" | "warn" } => check.level === "fail" || check.level === "warn")
    .sort((left, right) => {
      if (left.level !== right.level) {
        return left.level === "fail" ? -1 : 1;
      }

      return left.label.localeCompare(right.label);
    })
    .slice(0, 4)
    .map((check) => ({
      checkId: check.id,
      label: check.label,
      level: check.level,
      summary: check.summary,
      docs: check.docs ?? []
    }));

  return { counts, overallLevel, nextActions };
}

export async function getDeploymentReadinessSnapshot(): Promise<DeploymentReadinessSnapshot> {
  const checks: DeploymentCheck[] = [];

  const vercel = process.env.VERCEL === "1";
  const vercelEnv = process.env.VERCEL_ENV?.trim() || null;
  const productionLike = vercelEnv === "production" || env.NODE_ENV === "production";
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || null;
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? null;
  const authSecret = env.AUTH_SECRET?.trim() || null;
  const redisConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  const turnstileConfigured = Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const smtpConfigured = isSmtpConfigured();
  const googleConfigured = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const billingLinks = getBillingLinks();
  const stripeStatus = buildStripeConfigStatus();
  const conversionStatus = buildConversionConfigStatus();
  const convertUploadVia = getConvertUploadVia();
  const codeImagePlaywrightExport = envFlag("CODE_IMAGE_PLAYWRIGHT_EXPORT");

  if (!env.DATABASE_URL) {
    checks.push({
      id: "database-url",
      group: "core",
      label: "DATABASE_URL",
      level: "fail",
      summary: "DATABASE_URL is not configured.",
      detail: "The app can fall back to a local development DSN in code, but a Vercel deployment must set DATABASE_URL explicitly.",
      docs: ["docs/VERCEL-SETUP.md", "docs/LOCAL-DATABASE.md"]
    });
  } else {
    checks.push({
      id: "database-url",
      group: "core",
      label: "DATABASE_URL",
      level: "pass",
      summary: "DATABASE_URL is configured.",
      detail: "Use a pooled, SSL-enabled Postgres URL in production (for example Neon).",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  }

  if (env.DATABASE_URL) {
    try {
      await db.execute(drizzleSql`select 1`);
      checks.push({
        id: "database-ping",
        group: "core",
        label: "Database connectivity",
        level: "pass",
        summary: "Database ping succeeded.",
        detail: "The current runtime can reach Postgres with the configured DATABASE_URL.",
        docs: ["docs/VERCEL-SETUP.md"]
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.push({
        id: "database-ping",
        group: "core",
        label: "Database connectivity",
        level: "fail",
        summary: "Database ping failed.",
        detail,
        docs: ["docs/VERCEL-SETUP.md", "docs/LOCAL-DATABASE.md"]
      });
    }
  }

  if (!authSecret) {
    checks.push({
      id: "auth-secret",
      group: "core",
      label: "AUTH_SECRET",
      level: productionLike ? "fail" : "warn",
      summary: "AUTH_SECRET is missing.",
      detail: "NextAuth requires a stable secret for signed cookies and JWTs.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else if (isDefaultDevSecret(authSecret)) {
    checks.push({
      id: "auth-secret",
      group: "core",
      label: "AUTH_SECRET",
      level: productionLike ? "fail" : "warn",
      summary: "AUTH_SECRET is still using a local development-style value.",
      detail: "Replace it with a long random secret before any public deployment.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else {
    checks.push({
      id: "auth-secret",
      group: "core",
      label: "AUTH_SECRET",
      level: "pass",
      summary: "AUTH_SECRET is configured.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  }

  if (!nextAuthUrl || !appUrl) {
    checks.push({
      id: "canonical-url",
      group: "core",
      label: "Canonical URLs",
      level: productionLike ? "fail" : "warn",
      summary: "NEXTAUTH_URL and NEXT_PUBLIC_APP_URL should both be set explicitly.",
      detail: "Local fallbacks are acceptable during development, but production should pin both to the same canonical HTTPS origin.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else if (nextAuthUrl !== appUrl) {
    checks.push({
      id: "canonical-url",
      group: "core",
      label: "Canonical URLs",
      level: "fail",
      summary: "NEXTAUTH_URL and NEXT_PUBLIC_APP_URL do not match.",
      detail: "OAuth callbacks, reset links, and session redirects can break when these point at different origins.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else if (productionLike && !isHttpsUrl(appUrl)) {
    checks.push({
      id: "canonical-url",
      group: "core",
      label: "Canonical URLs",
      level: "fail",
      summary: "Production URLs must use HTTPS.",
      detail: `Current value: ${appUrl}`,
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else if (!productionLike && isLocalUrl(appUrl)) {
    checks.push({
      id: "canonical-url",
      group: "core",
      label: "Canonical URLs",
      level: "info",
      summary: "Current URLs are local-development URLs.",
      detail: "That is fine for local use; switch both variables to your real HTTPS origin before a Vercel production deploy.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  } else {
    checks.push({
      id: "canonical-url",
      group: "core",
      label: "Canonical URLs",
      level: "pass",
      summary: "NEXTAUTH_URL and NEXT_PUBLIC_APP_URL are aligned.",
      detail: `Current origin: ${appUrl}`,
      docs: ["docs/VERCEL-SETUP.md"]
    });
  }

  checks.push({
    id: "redis",
    group: "security",
    label: "Upstash Redis",
    level: redisConfigured ? "pass" : "warn",
    summary: redisConfigured
      ? "Distributed rate limiting is configured."
      : "Redis is not configured; rate limits fall back to per-instance memory windows.",
    detail: redisConfigured
      ? "Serverless rate limits can stay consistent across instances."
      : "This is acceptable for local development, but public production traffic should use Redis so throttling stays consistent across serverless instances.",
    docs: ["docs/VERCEL-SETUP.md", "docs/SECURITY.md"]
  });

  checks.push({
    id: "turnstile",
    group: "security",
    label: "Cloudflare Turnstile",
    level: turnstileConfigured ? "pass" : "warn",
    summary: turnstileConfigured
      ? "Turnstile is configured for sign-up and anonymous publish."
      : "Turnstile keys are not configured.",
    detail: turnstileConfigured
      ? "Make sure your production and preview hostnames are registered in Cloudflare."
      : "Without it, the public-facing sign-up and anonymous publish hardening is incomplete for production.",
    docs: ["docs/VERCEL-SETUP.md", "docs/TURNSTILE.md"]
  });

  checks.push({
    id: "smtp",
    group: "integrations",
    label: "SMTP",
    level: smtpConfigured ? "pass" : "warn",
    summary: smtpConfigured ? "SMTP is configured." : "SMTP is not configured.",
    detail: smtpConfigured
      ? "Forgot-password, verification, and admin mail tests can use the current transport."
      : "Forgot-password and other email flows will return 503 until SMTP is configured.",
    docs: ["docs/VERCEL-SETUP.md", "docs/SMTP.md"]
  });

  checks.push({
    id: "google-oauth",
    group: "integrations",
    label: "Google OAuth",
    level: googleConfigured ? "pass" : "info",
    summary: googleConfigured ? "Google sign-in is configured." : "Google sign-in is disabled.",
    detail: googleConfigured
      ? "Verify the callback URI matches your deployment host."
      : "This is optional. Credentials auth remains available.",
    docs: ["docs/VERCEL-SETUP.md", "docs/GOOGLE-OAUTH.md"]
  });

  const billingLinksConfigured = [
    billingLinks.proUpgradeUrl,
    billingLinks.teamUpgradeUrl,
    billingLinks.billingPortalUrl
  ].filter(Boolean).length;

  checks.push({
    id: "billing-links",
    group: "integrations",
    label: "Billing links",
    level: billingLinksConfigured === 0 ? "info" : billingLinksConfigured >= 2 ? "pass" : "warn",
    summary:
      billingLinksConfigured === 0
        ? "Public upgrade and portal links are not configured."
        : billingLinksConfigured >= 2
          ? "Billing links are configured."
          : "Billing links are only partially configured.",
    detail:
      billingLinksConfigured === 0
        ? "Pricing pages will still render, but upgrade actions remain placeholders."
        : "Plan entitlements in the database still need webhook sync or manual admin updates.",
    docs: ["docs/BILLING.md", "docs/BILLING-WEBHOOKS.md"]
  });

  checks.push({
    id: "stripe-webhook",
    group: "integrations",
    label: "Stripe webhook sync",
    level: !stripeStatus.any ? "info" : stripeStatus.complete ? "pass" : "warn",
    summary: !stripeStatus.any
      ? "Stripe webhook sync is not configured."
      : stripeStatus.complete
        ? "Stripe webhook sync looks configured."
        : "Stripe billing sync is only partially configured.",
    detail: !stripeStatus.any
      ? "If you use PayMongo or another provider with manual admin updates, that is acceptable."
      : "To auto-upgrade accounts, provide the webhook secret and price-id mappings together.",
    docs: ["docs/BILLING-WEBHOOKS.md", "docs/BILLING.md", "docs/PAYMONGO.md"]
  });

  checks.push({
    id: "image-convert",
    group: "tools",
    label: "Server image conversion (sharp)",
    level: "pass",
    summary: "The sharp-backed image conversion route is part of the Next.js app.",
    detail: "This works on Vercel Node runtime, but large images can increase cold starts and memory use.",
    docs: ["docs/TOOLS.md"]
  });

  checks.push({
    id: "code-image-playwright",
    group: "tools",
    label: "Server code-image export (Playwright)",
    level: codeImagePlaywrightExport ? "warn" : "info",
    summary: codeImagePlaywrightExport
      ? "Playwright export is enabled."
      : "Playwright export is disabled.",
    detail: codeImagePlaywrightExport
      ? "This route requires a Chromium-capable runtime and is a poor default for Vercel unless you have tested package size and runtime limits."
      : "The client-side code image path remains available; the heavy server export path is off by default.",
    docs: ["docs/CODE_IMAGE_SERVER.md", "docs/VERCEL-SETUP.md"]
  });

  checks.push({
    id: "convert-upload-mode",
    group: "tools",
    label: "Conversion upload mode",
    level: vercel && convertUploadVia !== "presign" ? "warn" : "pass",
    summary:
      vercel && convertUploadVia !== "presign"
        ? `Current upload mode is ${convertUploadVia}; presign is safer on Vercel.`
        : `Current upload mode is ${convertUploadVia}.`,
    detail:
      vercel && convertUploadVia !== "presign"
        ? "Proxy uploads push file bodies through Next.js functions and can hit Vercel size limits."
        : "Presigned uploads avoid Vercel request-body bottlenecks for larger conversion jobs.",
    docs: ["docs/VERCEL-CONVERSIONS.md"]
  });

  checks.push({
    id: "conversion-worker",
    group: "tools",
    label: "FFmpeg conversion worker",
    level: !conversionStatus.any ? "info" : conversionStatus.coreComplete ? "warn" : "warn",
    summary: !conversionStatus.any
      ? "The external conversion worker pipeline is not configured."
      : conversionStatus.coreComplete
        ? "S3/object-storage env is present, but the worker still runs outside Vercel."
        : "Conversion storage env is only partially configured.",
    detail: !conversionStatus.any
      ? "Browser-only tools still work. FFmpeg-style jobs remain disabled until you add S3 config and a separate worker host."
      : "Vercel can enqueue and presign uploads, but FFmpeg itself must run on a separate host or container.",
    docs: ["docs/VERCEL-CONVERSIONS.md", "docs/CONVERSION-WORKER.md", "docs/RUNBOOK-WORKER.md"]
  });

  const { counts, overallLevel, nextActions } = summarizeDeploymentChecks(checks);

  return {
    generatedAt: new Date().toISOString(),
    environment: {
      nodeEnv: env.NODE_ENV,
      vercel,
      vercelEnv,
      nextAuthUrl,
      appUrl,
      convertUploadVia,
      codeImagePlaywrightExport
    },
    checks,
    counts,
    overallLevel,
    nextActions
  };
}
