"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

type ReportStatus = "open" | "reviewed" | "resolved";
type ReportStatusFilter = "all" | ReportStatus;

type AdminReportsSnapshot = {
  reports: Array<{
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
  }>;
  total: number;
  limit: number;
  offset: number;
  status: ReportStatusFilter;
  q: string;
  counts: Record<ReportStatus, number>;
};

const STATUSES: ReportStatusFilter[] = ["all", "open", "reviewed", "resolved"];

const selectClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20";

const STATUS_BADGE: Record<ReportStatus, string> = {
  open: "border-red-400/30 bg-red-400/10 text-red-100",
  reviewed: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
};

type Props = {
  initialQ: string;
  initialSnapshot: AdminReportsSnapshot;
  initialStatus: string;
};

export function AdminReportsPanel({ initialQ, initialSnapshot, initialStatus }: Props) {
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [status, setStatus] = useState<ReportStatusFilter>(STATUSES.includes(initialStatus as ReportStatusFilter) ? (initialStatus as ReportStatusFilter) : "all");
  const [snapshot, setSnapshot] = useState<AdminReportsSnapshot>(initialSnapshot);
  const [offset, setOffset] = useState(initialSnapshot.offset ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: debouncedQ,
        status,
        limit: String(snapshot.limit || 30),
        offset: String(offset)
      });
      const response = await fetch(`/api/admin/reports?${params}`);
      const data = (await response.json()) as AdminReportsSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load reports");
      }
      setSnapshot(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, offset, snapshot.limit, status]);

  useEffect(() => {
    if (
      debouncedQ === initialSnapshot.q &&
      status === initialSnapshot.status &&
      offset === initialSnapshot.offset
    ) {
      setSnapshot(initialSnapshot);
      return;
    }
    void load();
  }, [debouncedQ, initialSnapshot, load, offset, status]);

  async function updateStatus(reportId: number, nextStatus: ReportStatus) {
    setActingId(reportId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update report");
      }
      setNotice(`Report #${reportId} moved to ${nextStatus}.`);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update report");
    } finally {
      setActingId(null);
    }
  }

  const nextPage = offset + snapshot.limit < snapshot.total;
  const prevPage = offset > 0;

  return (
    <div className="glass-panel space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {(["open", "reviewed", "resolved"] as const).map((value) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" key={value}>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{value}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{snapshot.counts[value]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:min-w-[260px]">
          <label className="text-xs text-muted-foreground" htmlFor="admin-report-search">
            Search reason, notes, paste slug/title, comment text, or reporter
          </label>
          <Input
            className="mt-1"
            id="admin-report-search"
            onChange={(event) => {
              setOffset(0);
              setQ(event.target.value);
            }}
            placeholder="Search reports…"
            value={q}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="admin-report-status">
            Status filter
          </label>
          <select
            className={`${selectClass} mt-1 block min-w-[160px]`}
            id="admin-report-status"
            onChange={(event) => {
              setOffset(0);
              setStatus(event.target.value as ReportStatusFilter);
            }}
            value={status}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {snapshot.total} report{snapshot.total === 1 ? "" : "s"}
          {loading ? " · loading…" : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {notice}
        </div>
      ) : null}

      <div className="space-y-3">
        {snapshot.reports.map((report) => (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={report.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">#{report.id}</p>
                  <Badge className={STATUS_BADGE[report.status]}>{report.status}</Badge>
                </div>
                <p className="text-sm text-foreground">{report.reason}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDate(report.createdAt)}</p>
                <p>{report.reporter.source === "account" ? "Account report" : "Anonymous report"}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Target</p>
                  {report.paste ? (
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="font-medium text-cyan-300/90 hover:underline"
                          href={`/p/${report.paste.slug}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {report.paste.title || report.paste.slug || "Untitled paste"}
                        </Link>
                        <span className="text-muted-foreground">
                          {report.paste.visibility} · {report.paste.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">slug: {report.paste.slug ?? "unknown"}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">The paste target is no longer available.</p>
                  )}
                  {report.comment?.preview ? (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Comment snippet</p>
                      <p className="mt-2 whitespace-pre-wrap break-words">{report.comment.preview}</p>
                    </div>
                  ) : null}
                </div>

                {report.notes ? (
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reporter notes</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{report.notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Reporter</p>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>{report.reporter.username ? `@${report.reporter.username}` : "No username"}</p>
                    <p>{report.reporter.email ?? "No email shared"}</p>
                    {report.reporter.id ? (
                      <Link className="text-cyan-300/90 hover:underline" href={`/admin/users/${report.reporter.id}`}>
                        Open user
                      </Link>
                    ) : (
                      <p>Anonymous reporter</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["open", "reviewed", "resolved"] as const).map((value) => (
                      <Button
                        disabled={actingId === report.id || report.status === value}
                        key={value}
                        onClick={() => void updateStatus(report.id, value)}
                        size="sm"
                        type="button"
                        variant={report.status === value ? "default" : "outline"}
                      >
                        {value}
                      </Button>
                    ))}
                    {report.paste?.slug ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/pastes?q=${encodeURIComponent(report.paste.slug)}`}>Open paste admin</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && snapshot.reports.length === 0 ? (
          <div className="rounded-2xl border border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
            No reports match these filters.
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button disabled={!prevPage || loading} onClick={() => setOffset((value) => Math.max(value - snapshot.limit, 0))} type="button" variant="outline">
          Previous
        </Button>
        <p className="text-sm text-muted-foreground">
          {snapshot.total > 0
            ? `Showing ${snapshot.offset + 1}-${Math.min(snapshot.offset + snapshot.reports.length, snapshot.total)} of ${snapshot.total}`
            : "No reports to show"}
        </p>
        <Button disabled={!nextPage || loading} onClick={() => setOffset((value) => value + snapshot.limit)} type="button" variant="outline">
          Next
        </Button>
      </div>
    </div>
  );
}
