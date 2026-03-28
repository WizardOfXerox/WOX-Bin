import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { comments, pastes, reports, users } from "@/lib/db/schema";

export const REPORT_STATUSES = ["open", "reviewed", "resolved"] as const;
export const REPORT_STATUS_FILTERS = ["all", ...REPORT_STATUSES] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportStatusFilter = (typeof REPORT_STATUS_FILTERS)[number];

export type AdminReportQueueItem = {
  id: number;
  reason: string;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: {
    id: string | null;
    username: string | null;
    email: string | null;
    source: "account" | "anonymous";
  };
  paste: {
    id: string | null;
    slug: string | null;
    title: string | null;
    visibility: string | null;
    status: string | null;
  } | null;
  comment: {
    id: number | null;
    preview: string | null;
  } | null;
};

type ListAdminReportsOptions = {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

function toSearchPattern(value: string) {
  const trimmed = value.trim().slice(0, 120);
  return trimmed ? `%${trimmed.replace(/[%_\\]/g, "")}%` : null;
}

function normalizeStatusFilter(value: string | undefined): ReportStatusFilter {
  return REPORT_STATUS_FILTERS.includes(value as ReportStatusFilter) ? (value as ReportStatusFilter) : "all";
}

function buildSearchWhere(pattern: string | null) {
  if (!pattern) {
    return undefined;
  }

  return or(
    ilike(reports.reason, pattern),
    ilike(reports.notes, pattern),
    ilike(pastes.slug, pattern),
    ilike(pastes.title, pattern),
    ilike(comments.content, pattern),
    ilike(users.username, pattern),
    ilike(users.email, pattern)
  );
}

function mapReportRow(row: {
  id: number;
  reason: string;
  notes: string | null;
  status: ReportStatus;
  createdAt: Date;
  reporterUserId: string | null;
  reporterUsername: string | null;
  reporterEmail: string | null;
  reporterIpHash: string | null;
  pasteId: string | null;
  pasteSlug: string | null;
  pasteTitle: string | null;
  pasteVisibility: string | null;
  pasteStatus: string | null;
  commentId: number | null;
  commentContent: string | null;
}): AdminReportQueueItem {
  return {
    id: row.id,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reporter: {
      id: row.reporterUserId,
      username: row.reporterUsername,
      email: row.reporterEmail,
      source: row.reporterUserId ? "account" : "anonymous"
    },
    paste: row.pasteId
      ? {
          id: row.pasteId,
          slug: row.pasteSlug,
          title: row.pasteTitle,
          visibility: row.pasteVisibility,
          status: row.pasteStatus
        }
      : null,
    comment: row.commentId
      ? {
          id: row.commentId,
          preview: row.commentContent ? row.commentContent.slice(0, 220) : null
        }
      : null
  };
}

async function getReportById(reportId: number) {
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      notes: reports.notes,
      status: reports.status,
      createdAt: reports.createdAt,
      reporterUserId: reports.reporterUserId,
      reporterUsername: users.username,
      reporterEmail: users.email,
      reporterIpHash: reports.reporterIpHash,
      pasteId: pastes.id,
      pasteSlug: pastes.slug,
      pasteTitle: pastes.title,
      pasteVisibility: pastes.visibility,
      pasteStatus: pastes.status,
      commentId: comments.id,
      commentContent: comments.content
    })
    .from(reports)
    .leftJoin(pastes, eq(reports.pasteId, pastes.id))
    .leftJoin(comments, eq(reports.commentId, comments.id))
    .leftJoin(users, eq(reports.reporterUserId, users.id))
    .where(eq(reports.id, reportId))
    .limit(1);

  return rows[0] ? mapReportRow(rows[0]) : null;
}

export async function listReportsForAdmin(options: ListAdminReportsOptions = {}) {
  const status = normalizeStatusFilter(options.status);
  const limit = Math.min(Math.max(Number(options.limit) || 30, 1), 100);
  const offset = Math.max(Number(options.offset) || 0, 0);
  const searchPattern = toSearchPattern(options.q ?? "");

  const searchWhere = buildSearchWhere(searchPattern);
  const statusWhere = status === "all" ? undefined : eq(reports.status, status);
  const whereClause =
    searchWhere && statusWhere ? and(searchWhere, statusWhere) : (searchWhere ?? statusWhere ?? undefined);

  const fromReports = () =>
    db
      .select({
        id: reports.id,
        reason: reports.reason,
        notes: reports.notes,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterUserId: reports.reporterUserId,
        reporterUsername: users.username,
        reporterEmail: users.email,
        reporterIpHash: reports.reporterIpHash,
        pasteId: pastes.id,
        pasteSlug: pastes.slug,
        pasteTitle: pastes.title,
        pasteVisibility: pastes.visibility,
        pasteStatus: pastes.status,
        commentId: comments.id,
        commentContent: comments.content
      })
      .from(reports)
      .leftJoin(pastes, eq(reports.pasteId, pastes.id))
      .leftJoin(comments, eq(reports.commentId, comments.id))
      .leftJoin(users, eq(reports.reporterUserId, users.id));

  const [rows, totalRows, groupedCounts] = await Promise.all([
    fromReports().where(whereClause).orderBy(desc(reports.createdAt), desc(reports.id)).limit(limit).offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reports)
      .leftJoin(pastes, eq(reports.pasteId, pastes.id))
      .leftJoin(comments, eq(reports.commentId, comments.id))
      .leftJoin(users, eq(reports.reporterUserId, users.id))
      .where(whereClause),
    db
      .select({
        status: reports.status,
        count: sql<number>`count(*)::int`
      })
      .from(reports)
      .leftJoin(pastes, eq(reports.pasteId, pastes.id))
      .leftJoin(comments, eq(reports.commentId, comments.id))
      .leftJoin(users, eq(reports.reporterUserId, users.id))
      .where(searchWhere)
      .groupBy(reports.status)
  ]);

  const counts: Record<ReportStatus, number> = {
    open: 0,
    reviewed: 0,
    resolved: 0
  };

  for (const row of groupedCounts) {
    if (row.status in counts) {
      counts[row.status as ReportStatus] = Number(row.count ?? 0);
    }
  }

  return {
    reports: rows.map(mapReportRow),
    total: Number(totalRows[0]?.count ?? 0),
    limit,
    offset,
    status,
    q: options.q?.trim() ?? "",
    counts
  };
}

export async function updateReportStatus(options: {
  reportId: number;
  status: ReportStatus;
  actorUserId: string;
}) {
  const [existing] = await db.select().from(reports).where(eq(reports.id, options.reportId)).limit(1);
  if (!existing) {
    return null;
  }

  if (existing.status !== options.status) {
    await db.update(reports).set({ status: options.status }).where(eq(reports.id, options.reportId));
    await logAudit({
      actorUserId: options.actorUserId,
      action: "report.status_updated",
      targetType: "report",
      targetId: String(options.reportId),
      metadata: {
        previousStatus: existing.status,
        nextStatus: options.status
      }
    });
  }

  return getReportById(options.reportId);
}
