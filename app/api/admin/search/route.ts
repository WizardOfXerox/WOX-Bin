import { NextResponse } from "next/server";
import { eq, ilike, or } from "drizzle-orm";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({
      users: [],
      pastes: []
    });
  }

  const searchPattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const [userRows, pasteRows] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        emailVerified: users.emailVerified,
        accountStatus: users.accountStatus
      })
      .from(users)
      .where(
        or(
          ilike(users.username, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.displayName, searchPattern),
          ilike(users.id, searchPattern)
        )
      )
      .limit(8),
    db
      .select({
        id: pastes.id,
        slug: pastes.slug,
        title: pastes.title,
        secretMode: pastes.secretMode,
        status: pastes.status,
        visibility: pastes.visibility,
        ownerUserId: users.id,
        ownerUsername: users.username,
        ownerEmail: users.email
      })
      .from(pastes)
      .leftJoin(users, eq(pastes.userId, users.id))
      .where(
        or(
          ilike(pastes.slug, searchPattern),
          ilike(pastes.title, searchPattern),
          ilike(users.username, searchPattern),
          ilike(users.email, searchPattern)
        )
      )
      .limit(10)
  ]);

  return NextResponse.json({
    users: userRows.map((row) => ({
      ...row,
      emailVerified: row.emailVerified?.toISOString() ?? null
    })),
    pastes: pasteRows
  });
}
