import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const STATUS_FILTER = ["all", "active", "hidden", "deleted"] as const;

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const statusParam = (url.searchParams.get("status") ?? "all").toLowerCase();
  const status = STATUS_FILTER.includes(statusParam as (typeof STATUS_FILTER)[number])
    ? (statusParam as (typeof STATUS_FILTER)[number])
    : "all";

  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const searchPattern = q ? `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%` : null;

  const conditions = [];
  if (status !== "all") {
    conditions.push(eq(pastes.status, status));
  }
  if (searchPattern) {
    conditions.push(or(ilike(pastes.slug, searchPattern), ilike(pastes.title, searchPattern)));
  }

  const whereClause = conditions.length ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: pastes.id,
        slug: pastes.slug,
        title: pastes.title,
        status: pastes.status,
        visibility: pastes.visibility,
        userId: pastes.userId,
        ownerUsername: users.username,
        ownerEmail: users.email,
        createdAt: pastes.createdAt,
        updatedAt: pastes.updatedAt
      })
      .from(pastes)
      .leftJoin(users, eq(pastes.userId, users.id))
      .where(whereClause)
      .orderBy(desc(pastes.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pastes)
      .leftJoin(users, eq(pastes.userId, users.id))
      .where(whereClause)
  ]);

  const total = countResult[0]?.count ?? 0;

  return NextResponse.json({
    pastes: rows.map((p) => ({
      ...p,
      createdAt: p.createdAt?.toISOString() ?? null,
      updatedAt: p.updatedAt?.toISOString() ?? null
    })),
    total,
    limit,
    offset
  });
}
