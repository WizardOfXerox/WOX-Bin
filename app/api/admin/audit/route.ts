import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { jsonError } from "@/lib/http";

const MAX_ROWS = 10_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return jsonError("Admin access required.", 403);
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";

  const rows = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      ipHash: auditLogs.ipHash,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.id))
    .limit(MAX_ROWS);

  const flat = rows.map((r) => ({
    id: r.id,
    actorUserId: r.actorUserId,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    ipHash: r.ipHash,
    metadata: r.metadata,
    createdAt: r.createdAt?.toISOString() ?? null
  }));

  if (format === "csv") {
    const header = ["id", "createdAt", "actorUserId", "action", "targetType", "targetId", "ipHash", "metadata"];
    const lines = [
      header.join(","),
      ...flat.map((r) =>
        [
          r.id,
          r.createdAt ?? "",
          r.actorUserId ?? "",
          csvEscape(r.action),
          csvEscape(r.targetType),
          csvEscape(r.targetId),
          r.ipHash ?? "",
          csvEscape(JSON.stringify(r.metadata))
        ].join(",")
      )
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="woxbin-audit.csv"'
      }
    });
  }

  return NextResponse.json({ count: flat.length, rows: flat });
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
