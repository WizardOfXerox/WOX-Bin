import "next-auth";
import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    role?: "user" | "moderator" | "admin";
    plan?: "free" | "pro" | "team" | "admin";
    planStatus?: "active" | "trialing" | "past_due" | "canceled";
    onboardingComplete?: boolean;
    displayName?: string | null;
    /** Server-side browser session row for revoke / idle timeout */
    browserSessionId?: string;
    error?: string;
  }
}

declare module "next-auth" {
  interface Session {
    error?: string;
    user: {
      id: string;
      username: string | null;
      role: "user" | "moderator" | "admin";
      plan: "free" | "pro" | "team" | "admin";
      planStatus: "active" | "trialing" | "past_due" | "canceled";
      onboardingComplete: boolean;
      displayName?: string | null;
      /** Exposed for “active session” UI; not a secret (random id). */
      browserSessionId?: string;
    } & Session["user"];
  }

  interface User {
    username?: string | null;
    role?: "user" | "moderator" | "admin";
    plan?: "free" | "pro" | "team" | "admin";
    planStatus?: "active" | "trialing" | "past_due" | "canceled";
    onboardingComplete?: boolean;
    displayName?: string | null;
    mfaComplete?: boolean;
  }
}
