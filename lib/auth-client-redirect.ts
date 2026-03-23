/**
 * NextAuth may return an absolute `url` built from `NEXTAUTH_URL` (e.g. localhost)
 * while the user opened the app via LAN IP or another host. Rewrites to the
 * current browser origin so phones / other devices stay on the same host.
 */
export function normalizeAuthRedirectUrl(url: string | null | undefined, pathFallback: string): string {
  if (typeof window === "undefined") {
    return pathFallback.startsWith("/") ? pathFallback : `/${pathFallback}`;
  }

  const fallback =
    pathFallback.startsWith("/") ? `${window.location.origin}${pathFallback}` : pathFallback;

  if (!url?.trim()) {
    return fallback;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return fallback;
  }
}

function isUnsafeAuthCallbackPath(pathname: string) {
  return pathname.startsWith("/api/auth/");
}

/**
 * Credentials sign-in should land on an app page, not a raw auth callback path.
 * If NextAuth hands back an auth endpoint URL, fall back to the requested app path.
 */
export function normalizePostSignInRedirectUrl(url: string | null | undefined, pathFallback: string): string {
  if (typeof window === "undefined") {
    return pathFallback.startsWith("/") ? pathFallback : `/${pathFallback}`;
  }

  const normalized = normalizeAuthRedirectUrl(url, pathFallback);

  try {
    const parsed = new URL(normalized, window.location.origin);
    if (isUnsafeAuthCallbackPath(parsed.pathname)) {
      return normalizeAuthRedirectUrl(pathFallback, pathFallback);
    }
    return parsed.href;
  } catch {
    return normalizeAuthRedirectUrl(pathFallback, pathFallback);
  }
}

/**
 * When `redirect: false` is used, NextAuth may still return a URL back to the
 * sign-in page containing auth-specific status like `authError=emailNotVerified`.
 * Surface that URL instead of collapsing everything into a generic client error.
 */
export function getAuthNoticeRedirectUrl(url: string | null | undefined): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const normalized = normalizeAuthRedirectUrl(url, "/sign-in");

  try {
    const parsed = new URL(normalized, window.location.origin);
    if (parsed.pathname !== "/sign-in") {
      return null;
    }

    if (
      parsed.searchParams.has("authError") ||
      parsed.searchParams.has("sessionError") ||
      parsed.searchParams.has("emailVerify")
    ) {
      return parsed.href;
    }

    return null;
  } catch {
    return null;
  }
}
