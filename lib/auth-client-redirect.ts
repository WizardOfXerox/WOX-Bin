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
