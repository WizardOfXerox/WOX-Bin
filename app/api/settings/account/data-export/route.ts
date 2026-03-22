import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pastes, users } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

const EXPORT_LIMIT = 500;

/** JSON export of profile + recent pastes (GDPR-style self-service). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const userId = session.user.id;
  const profile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      name: true,
      image: true,
      emailVerified: true,
      role: true,
      plan: true,
      planStatus: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!profile) {
    return jsonError("User not found.", 404);
  }

  const pasteRows = await db
    .select({
      id: pastes.id,
      slug: pastes.slug,
      title: pastes.title,
      content: pastes.content,
      language: pastes.language,
      visibility: pastes.visibility,
      folderName: pastes.folderName,
      category: pastes.category,
      tags: pastes.tags,
      createdAt: pastes.createdAt,
      updatedAt: pastes.updatedAt,
      expiresAt: pastes.expiresAt,
      archived: pastes.archived,
      template: pastes.template
    })
    .from(pastes)
    .where(eq(pastes.userId, userId))
    .orderBy(desc(pastes.updatedAt))
    .limit(EXPORT_LIMIT);

  const payload = {
    exportedAt: new Date().toISOString(),
    exportNote: `Up to ${EXPORT_LIMIT} most recently updated pastes are included. Attachments in paste_files are not inlined.`,
    user: {
      ...profile,
      emailVerified: profile.emailVerified ? profile.emailVerified.toISOString() : null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString()
    },
    pastes: pasteRows.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null
    }))
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="wox-bin-export-${userId.slice(0, 8)}.json"`
    }
  });
}
