import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Email from "next-auth/providers/email";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, or } from "drizzle-orm";
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
import { verifyPassword } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestIpFromHeaderRecord } from "@/lib/request";
import { credentialsIdentifierSchema } from "@/lib/validators";
import { getSmtpTransportOptions, smtpFromAddress } from "@/lib/mail";

const providers: NonNullable<NextAuthOptions["providers"]> = [
  Credentials({
    name: "Credentials",
    credentials: {
      identifier: { label: "Username or email", type: "text" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials, req) {
      const ip = getRequestIpFromHeaderRecord(req.headers as Record<string, unknown> | undefined);
      const limit = await rateLimit("sign-in", ip);
      if (!limit.success) {
        return null;
      }

      const identifier = credentialsIdentifierSchema.safeParse(credentials?.identifier);
      const password = typeof credentials?.password === "string" ? credentials.password : "";

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

const smtpTransport = getSmtpTransportOptions();
if (smtpTransport) {
  providers.push(
    Email({
      server: smtpTransport,
      from: smtpFromAddress()
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
    async jwt({ token, user }) {
      const tokenUserColumns = {
        id: true,
        username: true,
        role: true,
        plan: true,
        planStatus: true,
        onboardingComplete: true,
        displayName: true
      } as const;

      const idleMinutes = env.SESSION_IDLE_MINUTES ?? 30;
      const idleMs = Math.max(1, idleMinutes) * 60 * 1000;

      async function refreshUserIntoToken(userId: string) {
        const row = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: tokenUserColumns
        });
        if (row) {
          token.id = row.id;
          token.username = row.username ?? null;
          token.role = row.role;
          token.plan = row.plan;
          token.planStatus = row.planStatus;
          token.onboardingComplete = row.onboardingComplete;
          token.displayName = row.displayName ?? null;
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
          token.id = row.id;
          token.username = row.username ?? null;
          token.role = row.role;
          token.plan = row.plan;
          token.planStatus = row.planStatus;
          token.onboardingComplete = row.onboardingComplete;
          token.displayName = row.displayName ?? null;
        } else {
          token.id = user.id;
          token.username = user.username ?? null;
          token.role = user.role ?? "user";
          token.plan = user.plan ?? "free";
          token.planStatus = user.planStatus ?? "active";
          token.onboardingComplete = user.onboardingComplete ?? false;
          token.displayName = user.displayName ?? null;
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

      if (account?.provider === "google") {
        const existing = await db.query.users.findFirst({
          where: and(eq(users.id, user.id))
        });

        if (existing && !existing.username) {
          await db
            .update(users)
            .set({
              onboardingComplete: false,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));
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
