import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute project root — stops Turbopack from picking a parent folder lockfile (e.g. C:\Users\XIA\package-lock.json). */
const PROJECT_ROOT = path.resolve(__dirname);

/**
 * NextAuth v4 `detect-origin` uses `NEXTAUTH_URL` for redirects unless `AUTH_TRUST_HOST` or `VERCEL` is set,
 * so sign-in from `http://192.168.x.x:3000` would otherwise redirect to localhost. Dev default: trust `Host`.
 * Production: set `VERCEL=1` (Vercel) or `AUTH_TRUST_HOST=true` behind a trusted reverse proxy, or set
 * `NEXTAUTH_URL` to your canonical public URL.
 */
const authTrustHostRaw = process.env.AUTH_TRUST_HOST;
if (
  process.env.NODE_ENV === "development" &&
  (authTrustHostRaw === undefined || String(authTrustHostRaw).trim() === "")
) {
  process.env.AUTH_TRUST_HOST = "true";
}

/**
 * next-auth reads `NEXTAUTH_URL` in client bundles; only `NEXT_PUBLIC_*` is auto-inlined by Next.
 * Without this, Strict Mode + slow first compile can race `/api/auth/session` and log CLIENT_FETCH_ERROR.
 * @see https://next-auth.js.org/configuration/options#nextauth_url
 */
const nextAuthUrl =
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * FFmpeg job uploads: `presign` = browser PUTs directly to S3 (required on Vercel — avoids ~4.5MB serverless body limits).
 * `proxy` = multipart to Next.js then S3 (easier local MinIO without CORS).
 * @see docs/VERCEL-CONVERSIONS.md
 */
const convertUploadVia =
  process.env.CONVERT_UPLOAD_VIA ||
  (process.env.VERCEL === "1" ? "presign" : "proxy");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: nextAuthUrl,
    NEXT_PUBLIC_CONVERT_UPLOAD_VIA: convertUploadVia
  },
  serverExternalPackages: ["playwright", "sharp"],
  /**
   * Dev-only: allow Next.js `_next` fetches from these hosts (RFC1918 wildcards).
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.*.*", "10.*.*.*", "172.16.*.*", "172.17.*.*"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },
  turbopack: {
    root: PROJECT_ROOT
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  },
  /** Pastebin-style doc URLs → WOX-Bin documentation hub */
  async redirects() {
    return [
      { source: "/doc_api", destination: "/doc/api", permanent: false },
      { source: "/doc_scraping_api", destination: "/doc/scraping", permanent: false }
    ];
  },
  /** Baseline hardening for all routes (API + pages). @see docs/SECURITY.md */
  async headers() {
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()"
      }
    ];
    if (process.env.VERCEL === "1" || process.env.WOX_ENABLE_HSTS === "1") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      });
    }
    /** Optional baseline CSP — tune before enabling in production (may break third-party widgets). @see docs/SECURITY.md */
    if (process.env.WOX_ENFORCE_CSP === "1") {
      securityHeaders.push({
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https:",
          "connect-src 'self' https: wss:",
          "frame-src 'self' https://challenges.cloudflare.com"
        ].join("; ")
      });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
