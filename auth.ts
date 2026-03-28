import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, or } from "drizzle-orm";
import type { Adapter } from "next-auth/adapters";

import { db } from "@/lib/db";
import {
  accounts,
  authenticators,
  browserSessions,
  sessions,
  users,
  verificationTokens
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getAccountRestrictionCode, getEffectiveAccountModeration } from "@/lib/account-moderation";
import { verifyPassword } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { buildMagicLinkEmail } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { getAppOriginFromHeaderRecord, getRequestIpFromHeaderRecord } from "@/lib/request";
import { resolveSessionIdleMinutes } from "@/lib/session-config";
import { credentialsIdentifierSchema } from "@/lib/validators";
import { getSmtpTransportOptions, isSmtpConfigured, sendMail, smtpFromAddress } from "@/lib/mail";
import { sendSignupVerificationEmail } from "@/lib/email-verification";
import { consumeMfaTicket, createMfaLoginTicket, isTotpEnabled } from "@/lib/totp-mfa";

const providers: NonNullable<NextAuthOptions["providers"]> = [
  Credentials({
    name: "Credentials",
    credentials: {
      identifier: { label: "Username or email", type: "text" },
      password: { label: "Password", type: "password" },
      mfaTicket: { label: "MFA ticket", type: "text" },
      totpCode: { label: "Authenticator code", type: "text" },
      recoveryCode: { label: "Recovery code", type: "text" }
    },
    async authorize(credentials, req) {
      const ip = getRequestIpFromHeaderRecord(req.headers as Record<string, unknown> | undefined);
      const mfaTicket = typeof credentials?.mfaTicket === "string" ? credentials.mfaTicket.trim() : "";
      const totpCode = typeof credentials?.totpCode === "string" ? credentials.totpCode : "";
      const recoveryCode = typeof credentials?.recoveryCode === "string" ? credentials.recoveryCode : "";

      if (mfaTicket) {
        const limit = await rateLimit("sign-in", `${ip}:mfa:${mfaTicket}`);
        if (!limit.success) {
          return null;
        }

        try {
          const ticket = await consumeMfaTicket({
            ticketId: mfaTicket,
            code: totpCode,
            recoveryCode
          });
          const user = await db.query.users.findFirst({
            where: eq(users.id, ticket.userId)
          });

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.displayName ?? user.username,
            image: user.image,
            username: user.username,
            role: user.role,
            plan: user.plan ?? "free",
            planStatus: user.planStatus ?? "active",
            onboardingComplete: user.onboardingComplete,
            displayName: user.displayName,
            mfaComplete: true
          };
        } catch {
          return null;
        }
      }

      const identifier = credentialsIdentifierSchema.safeParse(credentials?.identifier);
      const password = typeof credentials?.password === "string" ? credentials.password : "";

      const rateLimitKey = identifier.success ? `${ip}:${identifier.data.toLowerCase()}` : ip;
      const limit = await rateLimit("sign-in", rateLimitKey);
      if (!limit.success) {
        return null;
      }

      if (!identifier.success || !password) {
        return null;
      }

      const lookup = identifier.data.toLowerCase();
      const user = await db.query.users.findFirst({
        where: or(eq(users.username, lookup), eq(users.email, lookup))
      });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      const moderation = await getEffectiveAccountModeration(user.id);
      if (moderation && getAccountRestrictionCode(moderation)) {
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.displayName ?? user.username,
          image: user.image,
          username: user.username,
          role: user.role,
          plan: user.plan ?? "free",
          planStatus: user.planStatus ?? "active",
          onboardingComplete: user.onboardingComplete,
          displayName: user.displayName
        };
      }

      if (user.email && !user.emailVerified && isSmtpConfigured()) {
        const verificationLimit = await rateLimit("resend-verification", `signin:${user.id}:${ip}`);
        if (verificationLimit.success) {
          try {
            await sendSignupVerificationEmail(
              getAppOriginFromHeaderRecord(req.headers as Record<string, unknown> | undefined),
              user.id,
              user.email
            );
          } catch (e) {
            console.error("[auth] resend verification on sign-in failed", e);
          }
        }
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.displayName ?? user.username,
        image: user.image,
        username: user.username,
        role: user.role,
        plan: user.plan ?? "free",
        planStatus: user.planStatus ?? "active",
        onboardingComplete: user.onboardingComplete,
        displayName: user.displayName
      };
    }
  })
];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true
    })
  );
}

if (env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET) {
  providers.push(
    Discord({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "identify email role_connections.write"
        }
      }
    })
  );
}

const smtpTransport = getSmtpTransportOptions();
if (smtpTransport) {
  providers.push(
    Email({
      server: smtpTransport,
      from: smtpFromAddress(),
      async sendVerificationRequest({ identifier, url, expires }) {
        const email = buildMagicLinkEmail(url, expires);
        const result = await sendMail({
          to: identifier,
          subject: email.subject,
          text: email.text,
          html: email.html
        });

        if (!result.ok) {
          throw new Error(result.error);
        }
      }
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/sign-in"
  },
  // Adapter is still used for OAuth (Google) account + user rows in the database.
  // Credentials sign-in requires JWT sessions (NextAuth does not support DB sessions for credentials).
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators
  }) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const tokenUserColumns = {
        id: true,
        username: true,
        role: true,
        plan: true,
        planStatus: true,
        onboardingComplete: true,
        displayName: true,
        image: true,
        accountStatus: true,
        suspendedUntil: true
      } as const;

      const idleMinutes = resolveSessionIdleMinutes(env.SESSION_IDLE_MINUTES);
      const idleMs = Math.max(1, idleMinutes) * 60 * 1000;

      async function refreshUserIntoToken(userId: string) {
        const row = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: tokenUserColumns
        });
        if (row) {
          const moderation = await getEffectiveAccountModeration(userId);
          const restriction = moderation ? getAccountRestrictionCode(moderation) : null;
          if (restriction) {
            token.error = restriction === "accountBanned" ? "AccountBanned" : "AccountSuspended";
            return;
          }
          token.id = row.id;
          token.username = row.username ?? null;
          token.role = row.role;
          token.plan = row.plan;
          token.planStatus = row.planStatus;
          token.onboardingComplete = row.onboardingComplete;
          token.displayName = row.displayName ?? null;
          token.picture = row.image ?? null;
        }
      }

      async function ensureBrowserSession(userId: string) {
        let sid = token.browserSessionId as string | undefined;
        if (!sid) {
          const newId = crypto.randomUUID();
          await db.insert(browserSessions).values({
            id: newId,
            userId,
            lastSeenAt: new Date()
          });
          token.browserSessionId = newId;
          sid = newId;
        }

        const row = await db.query.browserSessions.findFirst({
          where: eq(browserSessions.id, sid)
        });

        if (!row || row.revokedAt) {
          token.error = "SessionRevoked";
          return false;
        }

        if (Date.now() - new Date(row.lastSeenAt).getTime() > idleMs) {
          await db.update(browserSessions).set({ revokedAt: new Date() }).where(eq(browserSessions.id, sid));
          token.error = "SessionIdleTimeout";
          return false;
        }

        await db.update(browserSessions).set({ lastSeenAt: new Date() }).where(eq(browserSessions.id, sid));
        delete token.error;
        return true;
      }

      if (trigger === "update" && session?.user) {
        if (typeof session.user.username === "string" || session.user.username === null) {
          token.username = session.user.username ?? null;
        }
        if (typeof session.user.displayName === "string" || session.user.displayName === null) {
          token.displayName = session.user.displayName ?? null;
        }
        if (typeof session.user.name === "string" || session.user.name === null) {
          token.name = session.user.name ?? null;
        }
        if (typeof session.user.image === "string" || session.user.image === null) {
          token.picture = session.user.image ?? null;
        }
      }

      if (user?.id) {
        if (token.browserSessionId) {
          await db
            .update(browserSessions)
            .set({ revokedAt: new Date() })
            .where(eq(browserSessions.id, token.browserSessionId as string));
        }

        const sid = crypto.randomUUID();
        await db.insert(browserSessions).values({
          id: sid,
          userId: user.id,
          lastSeenAt: new Date()
        });
        token.browserSessionId = sid;
        delete token.error;

        const row = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: tokenUserColumns
        });
        if (row) {
          const moderation = await getEffectiveAccountModeration(user.id);
          const restriction = moderation ? getAccountRestrictionCode(moderation) : null;
          if (restriction) {
            token.error = restriction === "accountBanned" ? "AccountBanned" : "AccountSuspended";
            return token;
          }
          token.id = row.id;
          token.username = row.username ?? null;
          token.role = row.role;
          token.plan = row.plan;
          token.planStatus = row.planStatus;
          token.onboardingComplete = row.onboardingComplete;
          token.displayName = row.displayName ?? null;
          token.picture = row.image ?? null;
        } else {
          token.id = user.id;
          token.username = user.username ?? null;
          token.role = user.role ?? "user";
          token.plan = user.plan ?? "free";
          token.planStatus = user.planStatus ?? "active";
          token.onboardingComplete = user.onboardingComplete ?? false;
          token.displayName = user.displayName ?? null;
          token.picture = user.image ?? null;
        }
      } else if (token.sub) {
        const ok = await ensureBrowserSession(token.sub);
        if (ok) {
          await refreshUserIntoToken(token.sub);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error) {
        return {
          ...session,
          expires: new Date(0).toISOString(),
          error: token.error,
          user: undefined as unknown as typeof session.user
        };
      }

      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.username = token.username ?? null;
        session.user.role = token.role ?? "user";
        session.user.plan = token.plan ?? "free";
        session.user.planStatus = token.planStatus ?? "active";
        session.user.onboardingComplete = token.onboardingComplete ?? false;
        session.user.displayName = token.displayName ?? null;
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        if (token.browserSessionId) {
          session.user.browserSessionId = token.browserSessionId as string;
        }
      }

      return session;
    },
    async signIn({ user, account }) {
      if (!user.id) {
        return false;
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: {
          email: true,
          emailVerified: true,
          username: true,
          accountStatus: true,
          suspendedUntil: true
        }
      });

      const moderation = await getEffectiveAccountModeration(user.id);
      const restriction = moderation ? getAccountRestrictionCode(moderation) : null;
      if (restriction) {
        await logAudit({
          actorUserId: user.id,
          action: `auth.sign_in_blocked_${restriction}`,
          targetType: "user",
          targetId: user.id,
          metadata: {
            provider: account?.provider ?? "unknown"
          }
        });
        return `/sign-in?authError=${restriction}`;
      }

      if (account?.provider === "credentials" && existing?.email && !existing.emailVerified) {
        await logAudit({
          actorUserId: user.id,
          action: "auth.sign_in_blocked_unverified_email",
          targetType: "user",
          targetId: user.id
        });
        return "/sign-in?authError=emailNotVerified";
      }

      const needsMfaChallenge = (await isTotpEnabled(user.id)) && !user.mfaComplete;
      if (needsMfaChallenge) {
        const ticket = await createMfaLoginTicket({
          userId: user.id,
          provider: account?.provider ?? "credentials",
          callbackUrl: "/app"
        });
        await logAudit({
          actorUserId: user.id,
          action: "auth.mfa_challenge_started",
          targetType: "user",
          targetId: user.id,
          metadata: {
            provider: account?.provider ?? "credentials"
          }
        });
        return `/sign-in/mfa?ticket=${encodeURIComponent(ticket.id)}`;
      }

      if (account?.provider === "google" || account?.provider === "discord" || account?.provider === "email") {
        const patch: Partial<typeof users.$inferInsert> = {
          updatedAt: new Date()
        };

        if (existing?.email && !existing.emailVerified) {
          patch.emailVerified = new Date();
        }

        if (existing && !existing.username) {
          patch.onboardingComplete = false;
        }

        if (Object.keys(patch).length > 1) {
          await db.update(users).set(patch).where(eq(users.id, user.id));
        }
      }

      return true;
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user.id) {
        return;
      }

      await logAudit({
        actorUserId: user.id,
        action: isNewUser ? "auth.user_created" : "auth.sign_in",
        targetType: "user",
        targetId: user.id,
        metadata: {
          provider: account?.provider ?? "credentials"
        }
      });
    },
    async signOut(message) {
      const sid = message.token?.browserSessionId;
      if (typeof sid === "string") {
        await db
          .update(browserSessions)
          .set({ revokedAt: new Date() })
          .where(eq(browserSessions.id, sid));
      }

      const uid = message.session?.user?.id ?? message.token?.sub;
      if (!uid) {
        return;
      }

      await logAudit({
        actorUserId: uid,
        action: "auth.sign_out",
        targetType: "user",
        targetId: uid
      });
    }
  }
};

const nextAuthHandler = NextAuth(authOptions);

export const handlers = {
  GET: nextAuthHandler,
  POST: nextAuthHandler
};

export function auth() {
  return getServerSession(authOptions);
}
