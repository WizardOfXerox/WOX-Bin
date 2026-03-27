import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { announcementWriteSchema, createAnnouncement, listAnnouncementsForAdmin } from "@/lib/announcements";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const announcements = await listAnnouncementsForAdmin();
  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = announcementWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid announcement payload.");
  }

  const announcement = await createAnnouncement(parsed.data, session.user.id);
  await logAudit({
    actorUserId: session.user.id,
    action: "admin.announcement_create",
    targetType: "announcement",
    targetId: announcement.id,
    metadata: {
      published: announcement.published,
      tone: announcement.tone
    }
  });

  return NextResponse.json({ announcement }, { status: 201 });
}
