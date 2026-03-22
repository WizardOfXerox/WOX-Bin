import type { Session } from "next-auth";

/**
 * Label for nav/settings when showing the signed-in user.
 * NextAuth can yield a session object without `user` (e.g. error / expired JWT).
 */
export function accountLabelFromSession(session: Session | null | undefined): string {
  const u = session?.user;
  if (!u) {
    return "Account";
  }
  const name = typeof u.name === "string" ? u.name.trim() : "";
  return u.displayName?.trim() || u.username?.trim() || name || u.email?.trim() || "Account";
}
