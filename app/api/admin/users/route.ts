import { NextResponse } from "next/server";
import { count, desc, ilike, inArray, or, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const searchPattern = q ? `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%` : null;

  const whereClause = searchPattern
    ? or(
        ilike(users.username, searchPattern),
        ilike(users.email, searchPattern),
        ilike(users.displayName, searchPattern),
        ilike(users.id, searchPattern)
      )
    : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        emailVerified: users.emailVerified,
        accountStatus: users.accountStatus,
        suspendedUntil: users.suspendedUntil,
        moderationReason: users.moderationReason,
        role: users.role,
        plan: users.plan,
        planStatus: users.planStatus,
        planExpiresAt: users.planExpiresAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause)
  ]);

  const total = countResult[0]?.count ?? 0;
  const userIds = rows.map((row) => row.id);
  const pasteCountRows = userIds.length
    ? await db
        .select({
          userId: pastes.userId,
          count: count()
        })
        .from(pastes)
        .where(inArray(pastes.userId, userIds))
        .groupBy(pastes.userId)
    : [];

  const pasteCountMap = new Map(
    pasteCountRows
      .filter((row): row is { userId: string; count: number } => typeof row.userId === "string")
      .map((row) => [row.userId, Number(row.count)])
  );

  return NextResponse.json({
    users: rows.map((u) => ({
      ...u,
      emailVerified: u.emailVerified?.toISOString() ?? null,
      pasteCount: pasteCountMap.get(u.id) ?? 0,
      accountStatus: u.accountStatus,
      suspendedUntil: u.suspendedUntil?.toISOString() ?? null,
      moderationReason: u.moderationReason ?? null,
      createdAt: u.createdAt?.toISOString() ?? null,
      updatedAt: u.updatedAt?.toISOString() ?? null,
      planExpiresAt: u.planExpiresAt?.toISOString() ?? null
    })),
    total,
    limit,
    offset
  });
}
