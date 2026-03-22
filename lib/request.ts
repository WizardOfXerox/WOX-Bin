import type { NextRequest } from "next/server";

/** Absolute origin for links in emails (prefer `NEXT_PUBLIC_APP_URL`, else current request). */
export function getAppOrigin(request: Request): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return new URL(request.url).origin;
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
