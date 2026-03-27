import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { announcementWriteSchema, deleteAnnouncement, updateAnnouncement } from "@/lib/announcements";
import { isAdminSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { logAudit } from "@/lib/audit";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: Props) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { id } = await params;
  if (!id) {
    return jsonError("Missing announcement id.");
  }

  const body = await request.json().catch(() => null);
  const parsed = announcementWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid announcement payload.");
  }

  const announcement = await updateAnnouncement(id, parsed.data);
  if (!announcement) {
    return jsonError("Announcement not found.", 404);
  }

  await logAudit({
    actorUserId: session.user.id,
    action: "admin.announcement_update",
    targetType: "announcement",
    targetId: announcement.id,
    metadata: {
      published: announcement.published,
      tone: announcement.tone
    }
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(_request: Request, { params }: Props) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const { id } = await params;
  if (!id) {
    return jsonError("Missing announcement id.");
  }

  const announcement = await deleteAnnouncement(id);
  if (!announcement) {
    return jsonError("Announcement not found.", 404);
  }

  await logAudit({
    actorUserId: session.user.id,
    action: "admin.announcement_delete",
    targetType: "announcement",
    targetId: announcement.id,
    metadata: {
      published: announcement.published,
      tone: announcement.tone
    }
  });

  return NextResponse.json({ ok: true });
}
