"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlanId, PlanStatus } from "@/lib/plans";
import { formatDate } from "@/lib/utils";

type UserRole = "user" | "moderator" | "admin";

type AdminUserRow = {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  plan: PlanId;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const ROLES: UserRole[] = ["user", "moderator", "admin"];
const PLANS: PlanId[] = ["free", "pro", "team", "admin"];
const PLAN_STATUSES: PlanStatus[] = ["active", "trialing", "past_due", "canceled"];

const selectClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20";

export function AdminUsersPanel() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const limit = 30;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (debouncedQ) {
        params.set("q", debouncedQ);
      }
      const res = await fetch(`/api/admin/users?${params}`);
      const data = (await res.json()) as { users?: AdminUserRow[]; total?: number; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load users");
      }
      setRows(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(
    userId: string,
    body: Partial<{ role: UserRole; plan: PlanId; planStatus: PlanStatus }>
  ) {
    setSavingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        throw new Error(data.error ?? "Update failed");
      }
      if (data.user) {
        setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, ...data.user } : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  const nextPage = offset + limit < total;
  const prevPage = offset > 0;

  return (
    <div className="glass-panel space-y-4 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-muted-foreground" htmlFor="admin-user-search">
            Search username or email
          </label>
          <Input
            className="mt-1"
            id="admin-user-search"
            onChange={(e) => {
              setOffset(0);
              setQ(e.target.value);
            }}
            placeholder="Search…"
            value={q}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total} user{total === 1 ? "" : "s"}
          {loading ? " · loading…" : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Plan status</th>
              <th className="px-3 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={u.id}>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium">{u.displayName || u.username || u.email || u.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                  {u.username ? (
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <select
                    aria-label={`Role for ${u.username ?? u.email ?? u.id}`}
                    className={selectClass}
                    disabled={savingId === u.id}
                    onChange={(e) => {
                      const role = e.target.value as UserRole;
                      void patchUser(u.id, { role });
                    }}
                    value={u.role}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 align-top">
                  <select
                    aria-label={`Plan for ${u.username ?? u.email ?? u.id}`}
                    className={selectClass}
                    disabled={savingId === u.id}
                    onChange={(e) => {
                      const plan = e.target.value as PlanId;
                      void patchUser(u.id, { plan });
                    }}
                    value={u.plan}
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 align-top">
                  <select
                    aria-label={`Plan status for ${u.username ?? u.email ?? u.id}`}
                    className={selectClass}
                    disabled={savingId === u.id}
                    onChange={(e) => {
                      const planStatus = e.target.value as PlanStatus;
                      void patchUser(u.id, { planStatus });
                    }}
                    value={u.planStatus}
                  >
                    {PLAN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {u.updatedAt ? formatDate(u.updatedAt) : "—"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                  No users match this search.
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

      <p className="text-xs text-muted-foreground">
        Plan changes here override the user&apos;s stored plan fields for quotas and UI. For Stripe-linked billing, also update the
        customer in your payment dashboard if needed.{" "}
        <Link className="underline hover:text-foreground" href="/admin/pastes">
          Moderate pastes →
        </Link>
      </p>
    </div>
  );
}
