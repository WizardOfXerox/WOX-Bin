import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveUserImageForClient } from "@/lib/avatar";
import { verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { accounts, teamMembers, teams, users } from "@/lib/db/schema";
import { checkEdgeRateLimit } from "@/lib/firewall";
import { jsonError } from "@/lib/http";
import { logAudit } from "@/lib/audit";
import { logInfo } from "@/lib/logging";
import { invalidatePublicProfileCaches } from "@/lib/profile-service";
import { getRequestIp } from "@/lib/request";
import { getTotpStatus } from "@/lib/totp-mfa";
import { accountDeleteSchema, accountSettingsPatchSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      username: true,
      displayName: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      passwordHash: true
    }
  });

  if (!row) {
    return jsonError("User not found.", 404);
  }

  const [googleAccount, discordAccount, totpStatus] = await Promise.all([
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "google")))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.provider, "discord")))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getTotpStatus(session.user.id)
  ]);

  return NextResponse.json({
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    name: row.name,
    image: resolveUserImageForClient(row.image, session.user.id),
    emailVerified: row.emailVerified ? row.emailVerified.toISOString() : null,
    hasPassword: Boolean(row.passwordHash),
    googleConnected: Boolean(googleAccount),
    discordConnected: Boolean(discordAccount),
    totpAvailable: totpStatus.available,
    totpEnabled: totpStatus.enabled,
    totpEnabledAt: totpStatus.enabledAt?.toISOString() ?? null,
    totpLastUsedAt: totpStatus.lastUsedAt?.toISOString() ?? null
  });
}

async function assertUserMayDeleteAccount(userId: string): Promise<Response | null> {
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  for (const { teamId } of memberships) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    if (c > 1) {
      return jsonError("Leave shared teams before deleting your account.", 409);
    }
  }

  const owned = await db.select({ id: teams.id }).from(teams).where(eq(teams.createdByUserId, userId));

  for (const { id: teamId } of owned) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    if (c > 1) {
      return jsonError(
        "You created a team that still has other members. Transfer ownership or remove members before deleting your account.",
        409
      );
    }
    if (c === 1) {
      const [only] = await db
        .select({ uid: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId))
        .limit(1);
      if (only && only.uid !== userId) {
        return jsonError(
          "Teams you created still have other members. Resolve membership before deleting your account.",
          409
        );
      }
    }
  }

  return null;
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const edgeLimit = await checkEdgeRateLimit("settings-account", request, session.user.id);
  if (edgeLimit.rateLimited) {
    return jsonError("Too many account changes. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = accountDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid delete payload.");
  }

  const userId = session.user.id;
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: true, email: true, username: true }
  });

  if (!row) {
    return jsonError("User not found.", 404);
  }

  if (row.passwordHash) {
    const pwd = parsed.data.password ?? "";
    if (!pwd) {
      return jsonError("Password is required to delete this account.", 400);
    }
    const valid = await verifyPassword(pwd, row.passwordHash);
    if (!valid) {
      return jsonError("Incorrect password.", 401);
    }
  }

  const blocked = await assertUserMayDeleteAccount(userId);
  if (blocked) {
    return blocked;
  }

  const ip = getRequestIp(request);
  await logAudit({
    actorUserId: userId,
    action: "settings.account.deleted",
    targetType: "user",
    targetId: userId,
    ip,
    metadata: { email: row.email ?? null }
  });

  await db.delete(users).where(eq(users.id, userId));
  invalidatePublicProfileCaches([row.username]);
  logInfo("settings.account.deleted", {
    userId,
    username: row.username ?? null
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const edgeLimit = await checkEdgeRateLimit("settings-account", request, session.user.id);
  if (edgeLimit.rateLimited) {
    return jsonError("Too many account changes. Try again later.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = accountSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid account payload.");
  }

  const userId = session.user.id;
  const current = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      username: true,
      displayName: true,
      email: true,
      name: true,
      image: true
    }
  });

  if (!current) {
    return jsonError("User not found.", 404);
  }

  const nextDisplayName =
    parsed.data.displayName !== undefined
      ? parsed.data.displayName === ""
        ? null
        : parsed.data.displayName
      : current.displayName;
  const nextImage =
    parsed.data.image !== undefined ? (parsed.data.image === "" ? null : parsed.data.image) : current.image;

  let nextUsername = current.username;
  if (parsed.data.username !== undefined) {
    const normalized = parsed.data.username.toLowerCase();
    if (normalized !== (current.username ?? "").toLowerCase()) {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, normalized))
        .limit(1);

      if (taken && taken.id !== userId) {
        return jsonError("That username is already taken.", 409);
      }
      nextUsername = normalized;
    }
  }

  const nextName = nextDisplayName ?? nextUsername ?? current.name;

  await db
    .update(users)
    .set({
      displayName: nextDisplayName,
      image: nextImage,
      username: nextUsername,
      name: nextName,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  const ip = getRequestIp(request);
  await logAudit({
    actorUserId: userId,
    action: "settings.account.updated",
    targetType: "user",
    targetId: userId,
    ip,
    metadata: {
      usernameChanged: parsed.data.username !== undefined && nextUsername !== current.username,
      displayNameChanged: parsed.data.displayName !== undefined,
      imageChanged: parsed.data.image !== undefined
    }
  });
  invalidatePublicProfileCaches([current.username, nextUsername]);
  logInfo("settings.account.updated", {
    userId,
    previousUsername: current.username ?? null,
    username: nextUsername ?? null,
    usernameChanged: parsed.data.username !== undefined && nextUsername !== current.username,
    displayNameChanged: parsed.data.displayName !== undefined,
    imageChanged: parsed.data.image !== undefined
  });

  return NextResponse.json({
    username: nextUsername,
    displayName: nextDisplayName,
    email: current.email,
    name: nextName,
    image: resolveUserImageForClient(nextImage, userId)
  });
}
