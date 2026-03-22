"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type ModStatus = "active" | "hidden" | "deleted";

type AdminPasteRow = {
  id: string;
  slug: string;
  title: string;
  status: ModStatus;
  visibility: string;
  userId: string | null;
  ownerUsername: string | null;
  ownerEmail: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const STATUSES: Array<ModStatus | "all"> = ["all", "active", "hidden", "deleted"];

const selectClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20";

type Props = {
  initialQ: string;
  initialStatus: string;
};

export function AdminPastesPanel({ initialQ, initialStatus }: Props) {
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [status, setStatus] = useState<string>(STATUSES.includes(initialStatus as (typeof STATUSES)[number]) ? initialStatus : "all");
  const [rows, setRows] = useState<AdminPasteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingSlug, setActingSlug] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [notifyOwner, setNotifyOwner] = useState(false);
  const limit = 30;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset), status });
      if (debouncedQ) {
        params.set("q", debouncedQ);
      }
      const res = await fetch(`/api/admin/pastes?${params}`);
      const data = (await res.json()) as { pastes?: AdminPasteRow[]; total?: number; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load pastes");
      }
      setRows(data.pastes ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pastes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, offset, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setModeration(slug: string, next: ModStatus) {
    setActingSlug(slug);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/pastes/${encodeURIComponent(slug)}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          reason: moderationReason.trim() || undefined,
          notifyOwner
        })
      });
      const data = (await res.json()) as { error?: string; emailSent?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? "Moderation failed");
      }
      setRows((prev) => prev.map((p) => (p.slug === slug ? { ...p, status: next } : p)));
      setNotice(
        data.emailSent ? `Paste set to ${next} and owner notification sent.` : `Paste set to ${next}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation failed");
    } finally {
      setActingSlug(null);
    }
  }

  const nextPage = offset + limit < total;
  const prevPage = offset > 0;

  return (
    <div className="glass-panel space-y-4 p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="admin-paste-reason">
            Moderator note
          </label>
          <Textarea
            className="min-h-[88px]"
            id="admin-paste-reason"
            onChange={(e) => setModerationReason(e.target.value)}
            placeholder="Optional note sent to the owner when notify is enabled…"
            value={moderationReason}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              checked={notifyOwner}
              className="mt-1 h-4 w-4 rounded border border-input bg-background accent-primary"
              onChange={(e) => setNotifyOwner(e.target.checked)}
              type="checkbox"
            />
            <span>Notify the paste owner by email after moderation.</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:min-w-[200px]">
          <label className="text-xs text-muted-foreground" htmlFor="admin-paste-search">
            Search slug, title, owner username, or owner email
          </label>
          <Input
            className="mt-1"
            id="admin-paste-search"
            onChange={(e) => {
              setOffset(0);
              setQ(e.target.value);
            }}
            placeholder="Search…"
            value={q}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground" htmlFor="admin-paste-status">
            Status filter
          </label>
          <select
            className={`${selectClass} mt-1 block min-w-[140px]`}
            id="admin-paste-status"
            onChange={(e) => {
              setOffset(0);
              setStatus(e.target.value);
            }}
            value={status}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-muted-foreground">
          {total} paste{total === 1 ? "" : "s"}
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

      <div className="space-y-3 md:hidden">
        {rows.map((p) => (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" key={p.id}>
            <div className="space-y-1">
              <div className="font-medium line-clamp-2">{p.title}</div>
              <Link className="text-xs text-cyan-300/90 hover:underline" href={`/p/${p.slug}`} rel="noreferrer" target="_blank">
                /p/{p.slug}
              </Link>
            </div>
            <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <dt>Owner</dt>
                <dd className="text-right">
                  {p.userId ? (
                    <Link className="hover:text-foreground hover:underline" href={`/admin/users/${p.userId}`}>
                      {p.ownerUsername ? `@${p.ownerUsername}` : p.ownerEmail ?? p.userId.slice(0, 8)}
                    </Link>
                  ) : (
                    "Anonymous"
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Visibility</dt>
                <dd className="capitalize text-right">{p.visibility}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt>Status</dt>
                <dd
                  className={
                    p.status === "active"
                      ? "text-emerald-300"
                      : p.status === "hidden"
                        ? "text-amber-200"
                        : "text-destructive-foreground"
                  }
                >
                  {p.status}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["active", "hidden", "deleted"] as const).map((s) => (
                <Button
                  className="h-8 px-2 text-xs"
                  disabled={actingSlug === p.slug || p.status === s}
                  key={s}
                  onClick={() => void setModeration(p.slug, s)}
                  type="button"
                  variant={p.status === s ? "default" : "outline"}
                >
                  {s}
                </Button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{p.updatedAt ? formatDate(p.updatedAt) : "—"}</p>
          </div>
        ))}
        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border border-white/10 px-3 py-8 text-center text-muted-foreground">
            No pastes match these filters.
          </div>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 font-medium">Paste</th>
              <th className="px-3 py-3 font-medium">Owner</th>
              <th className="px-3 py-3 font-medium">Visibility</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Actions</th>
              <th className="px-3 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={p.id}>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium line-clamp-2">{p.title}</div>
                  <Link className="text-xs text-cyan-300/90 hover:underline" href={`/p/${p.slug}`} rel="noreferrer" target="_blank">
                    /p/{p.slug}
                  </Link>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {p.userId ? (
                    <Link className="hover:text-foreground hover:underline" href={`/admin/users/${p.userId}`}>
                      {p.ownerUsername ? `@${p.ownerUsername}` : p.ownerEmail ?? p.userId.slice(0, 8)}
                    </Link>
                  ) : (
                    "Anonymous"
                  )}
                </td>
                <td className="px-3 py-3 align-top capitalize">{p.visibility}</td>
                <td className="px-3 py-3 align-top">
                  <span
                    className={
                      p.status === "active"
                        ? "text-emerald-300"
                        : p.status === "hidden"
                          ? "text-amber-200"
                          : "text-destructive-foreground"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {(["active", "hidden", "deleted"] as const).map((s) => (
                      <Button
                        className="h-8 px-2 text-xs"
                        disabled={actingSlug === p.slug || p.status === s}
                        key={s}
                        onClick={() => void setModeration(p.slug, s)}
                        type="button"
                        variant={p.status === s ? "default" : "outline"}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {p.updatedAt ? formatDate(p.updatedAt) : "—"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>
                  No pastes match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          disabled={!prevPage || loading}
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          type="button"
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Showing {rows.length ? offset + 1 : 0}–{offset + rows.length} of {total}
        </span>
        <Button disabled={!nextPage || loading} onClick={() => setOffset((o) => o + limit)} type="button" variant="outline">
          Next
        </Button>
      </div>
    </div>
  );
}
