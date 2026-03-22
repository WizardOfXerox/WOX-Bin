import type { NextRequest } from "next/server";

/** Absolute origin for links in emails (prefer `NEXT_PUBLIC_APP_URL`, else current request). */
export function getAppOrigin(request: Request): string {
  const raw = getConfiguredAppOrigin();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url).origin;
}

/** App origin when no `Request` object is available (NextAuth callbacks, background jobs). */
export function getConfiguredAppOrigin(): string | null {
  const candidates = [process.env.NEXT_PUBLIC_APP_URL?.trim(), process.env.NEXTAUTH_URL?.trim()];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      return new URL(candidate).origin;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/** Reconstruct an origin from NextAuth's plain header record when env-based app URLs are unavailable. */
export function getAppOriginFromHeaderRecord(headers: Record<string, unknown> | undefined): string {
  const configured = getConfiguredAppOrigin();
  if (configured) {
    return configured;
  }

  if (!headers) {
    return "http://localhost:3000";
  }

  const get = (name: string): string | undefined => {
    const direct = headers[name];
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim();
    }
    const lower = headers[name.toLowerCase()];
    if (typeof lower === "string" && lower.trim()) {
      return lower.trim();
    }
    if (Array.isArray(lower) && typeof lower[0] === "string" && lower[0].trim()) {
      return lower[0].trim();
    }
    return undefined;
  };

  const host = get("x-forwarded-host") ?? get("host") ?? "localhost:3000";
  const proto = get("x-forwarded-proto") ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export function getRequestIp(request: Request | NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

/** NextAuth passes `headers` as a plain record — normalize IP for rate limits. */
export function getRequestIpFromHeaderRecord(headers: Record<string, unknown> | undefined): string {
  if (!headers) {
    return "unknown";
  }

  const get = (name: string): string | undefined => {
    const direct = headers[name];
    if (typeof direct === "string") {
      return direct;
    }
    const lower = headers[name.toLowerCase()];
    if (typeof lower === "string") {
      return lower;
    }
    if (Array.isArray(lower) && typeof lower[0] === "string") {
      return lower[0];
    }
    return undefined;
  };

  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const real = get("x-real-ip");
  if (real?.trim()) {
    return real.trim();
  }

  return "unknown";
}
