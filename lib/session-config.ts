export const DEFAULT_SESSION_IDLE_MINUTES = 60 * 5;

export function resolveSessionIdleMinutes(idleMinutes?: number | null) {
  const fallback = DEFAULT_SESSION_IDLE_MINUTES;
  if (!Number.isFinite(idleMinutes)) {
    return fallback;
  }

  return Math.max(1, Math.floor(idleMinutes ?? fallback));
}
