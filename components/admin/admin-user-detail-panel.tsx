"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlanId, PlanStatus } from "@/lib/plans";
import { formatDate } from "@/lib/utils";

type UserRole = "user" | "moderator" | "admin";
type PasteStatus = "active" | "hidden" | "deleted";
type AccountStatus = "active" | "suspended" | "banned";

type UserDetail = {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  emailVerified: string | null;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  moderationReason: string | null;
  moderatedAt: string | null;
  moderatedByUserId: string | null;
  role: UserRole;
  plan: PlanId;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  onboardingComplete: boolean;
  hasPassword: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  pasteCounts: {
    total: number;
    active: number;
    hidden: number;
    deleted: number;
  };
};

type UserPasteRow = {
  id: string;
  slug: string;
  title: string;
  status: PasteStatus;
  visibility: string;
  viewCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

const ROLES: UserRole[] = ["user", "moderator", "admin"];
const PLANS: PlanId[] = ["free", "pro", "team", "admin"];
const PLAN_STATUSES: PlanStatus[] = ["active", "trialing", "past_due", "canceled"];
const PASTE_STATUSES: Array<PasteStatus | "all"> = ["all", "active", "hidden", "deleted"];
const ACCOUNT_STATUSES: AccountStatus[] = ["active", "suspended", "banned"];

const selectClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20";

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60_000);
  return local.toISOString().slice(0, 16);
}

function accountStatusBadgeClass(status: AccountStatus) {
  if (status === "active") {
    return "text-emerald-300";
  }
  if (status === "suspended") {
    return "text-amber-200/90";
  }
  return "text-destructive-foreground";
}

export function AdminUserDetailPanel({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [pasteRows, setPasteRows] = useState<UserPasteRow[]>([]);
  const [pasteTotal, setPasteTotal] = useState(0);
  const [pasteOffset, setPasteOffset] = useState(0);
  const [pasteQ, setPasteQ] = useState("");
  const [debouncedPasteQ, setDebouncedPasteQ] = useState("");
  const [pasteStatus, setPasteStatus] = useState<string>("all");
  const [pasteLoading, setPasteLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actingSlug, setActingSlug] = useState<string | null>(null);
  const [verificationAction, setVerificationAction] = useState(false);
  const [moderationSaving, setModerationSaving] = useState(false);
  const [accountStatusForm, setAccountStatusForm] = useState<AccountStatus>("active");
  const [suspendedUntilInput, setSuspendedUntilInput] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [pasteModerationReason, setPasteModerationReason] = useState("");
  const [notifyPasteOwners, setNotifyPasteOwners] = useState(false);
  const pasteLimit = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPasteQ(pasteQ.trim()), 250);
    return () => clearTimeout(t);
  }, [pasteQ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setAccountStatusForm(user.accountStatus);
    setSuspendedUntilInput(toLocalDateTimeInput(user.suspendedUntil));
    setModerationReason(user.moderationReason ?? "");
  }, [user]);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = (await res.json()) as { user?: UserDetail; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load user");
      }
      setUser(data.user ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, [userId]);

  const loadPastes = useCallback(async () => {
    setPasteLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(pasteLimit),
        offset: String(pasteOffset),
        status: pasteStatus
      });
      if (debouncedPasteQ) {
        params.set("q", debouncedPasteQ);
      }
      const res = await fetch(`/api/admin/users/${userId}/pastes?${params}`);
      const data = (await res.json()) as { pastes?: UserPasteRow[]; total?: number; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load user pastes");
      }
      setPasteRows(data.pastes ?? []);
      setPasteTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user pastes");
      setPasteRows([]);
      setPasteTotal(0);
    } finally {
      setPasteLoading(false);
    }
  }, [debouncedPasteQ, pasteOffset, pasteStatus, userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    void loadPastes();
  }, [loadPastes]);

  async function patchUser(body: Partial<{ role: UserRole; plan: PlanId; planStatus: PlanStatus; emailVerified: boolean }>) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { error?: string; user?: Partial<UserDetail> };
      if (!res.ok) {
        throw new Error(data.error ?? "Update failed");
      }
      if (data.user) {
        setUser((prev) => (prev ? ({ ...prev, ...data.user } as UserDetail) : prev));
      }
      setNotice("Account fields updated.");
      await loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    setVerificationAction(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verification`, {
        method: "POST"
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not send verification email");
      }
      setNotice("Verification email sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification email");
    } finally {
      setVerificationAction(false);
    }
  }

  async function submitModeration() {
    setModerationSaving(true);
    setError(null);
    setNotice(null);
    try {
      const suspendedUntilIso =
        accountStatusForm === "suspended" && suspendedUntilInput
          ? new Date(suspendedUntilInput).toISOString()
          : null;

      const res = await fetch(`/api/admin/users/${userId}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountStatus: accountStatusForm,
          suspendedUntil: accountStatusForm === "suspended" ? suspendedUntilIso : null,
          moderationReason: moderationReason.trim() || null,
          notifyUser
        })
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        emailSent?: boolean;
        user?: Partial<UserDetail>;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Moderation update failed");
      }
      if (data?.user) {
        setUser((prev) => (prev ? ({ ...prev, ...data.user } as UserDetail) : prev));
      }
      setNotice(
        data?.emailSent
          ? "Account moderation updated and notification email sent."
          : "Account moderation updated."
      );
      await loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation update failed");
    } finally {
      setModerationSaving(false);
    }
  }

  async function setModeration(slug: string, status: PasteStatus) {
    setActingSlug(slug);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/pastes/${encodeURIComponent(slug)}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: pasteModerationReason.trim() || undefined,
          notifyOwner: notifyPasteOwners
        })
      });
      const data = (await res.json().catch(() => null)) as { error?: string; emailSent?: boolean } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Moderation failed");
      }
      setNotice(
        data?.emailSent
          ? `Paste set to ${status} and owner notification sent.`
          : `Paste set to ${status}.`
      );
      await Promise.all([loadPastes(), loadUser()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation failed");
    } finally {
      setActingSlug(null);
    }
  }

  if (userLoading && !user) {
    return <div className="glass-panel p-5 text-sm text-muted-foreground">Loading user…</div>;
  }

  if (!user) {
    return <div className="glass-panel p-5 text-sm text-destructive">{error ?? "User not found."}</div>;
  }

  const nextPage = pasteOffset + pasteLimit < pasteTotal;
  const prevPage = pasteOffset > 0;

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{user.displayName || user.username || user.email || user.id}</h2>
                  <Badge className={user.emailVerified ? "text-emerald-300" : "text-amber-200/90"}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge className={accountStatusBadgeClass(user.accountStatus)}>{user.accountStatus}</Badge>
                  <Badge>{user.role}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{user.email ?? "No email on file"}</p>
                {user.username ? <p className="text-sm text-muted-foreground">@{user.username}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">User ID: {user.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/users">Back to users</Link>
                </Button>
                {user.email && !user.emailVerified ? (
                  <Button disabled={verificationAction} onClick={() => void resendVerification()} size="sm" type="button" variant="outline">
                    {verificationAction ? "Sending…" : "Resend verification"}
                  </Button>
                ) : null}
                <Button
                  disabled={saving || !user.email}
                  onClick={() => void patchUser({ emailVerified: !user.emailVerified })}
                  size="sm"
                  type="button"
                  variant={user.emailVerified ? "outline" : "default"}
                >
                  {user.emailVerified ? "Mark unverified" : "Mark verified"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Role</p>
                <select
                  className={`${selectClass} w-full`}
                  disabled={saving}
                  onChange={(e) => void patchUser({ role: e.target.value as UserRole })}
                  value={user.role}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Plan</p>
                <select
                  className={`${selectClass} w-full`}
                  disabled={saving}
                  onChange={(e) => void patchUser({ plan: e.target.value as PlanId })}
                  value={user.plan}
                >
                  {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Plan status</p>
                <select
                  className={`${selectClass} w-full`}
                  disabled={saving}
                  onChange={(e) => void patchUser({ planStatus: e.target.value as PlanStatus })}
                  value={user.planStatus}
                >
                  {PLAN_STATUSES.map((planStatus) => (
                    <option key={planStatus} value={planStatus}>
                      {planStatus}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total pastes", value: user.pasteCounts.total },
                { label: "Active", value: user.pasteCounts.active },
                { label: "Hidden", value: user.pasteCounts.hidden },
                { label: "Deleted", value: user.pasteCounts.deleted }
              ].map((stat) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" key={stat.label}>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Account moderation</p>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Account status</p>
                  <select
                    className={`${selectClass} w-full`}
                    disabled={moderationSaving}
                    onChange={(e) => setAccountStatusForm(e.target.value as AccountStatus)}
                    value={accountStatusForm}
                  >
                    {ACCOUNT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                {accountStatusForm === "suspended" ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Suspended until</p>
                    <Input
                      disabled={moderationSaving}
                      onChange={(e) => setSuspendedUntilInput(e.target.value)}
                      type="datetime-local"
                      value={suspendedUntilInput}
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Reason shown to the user</p>
                  <Textarea
                    className="min-h-[112px]"
                    disabled={moderationSaving}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Moderator note or reason for this action…"
                    value={moderationReason}
                  />
                </div>
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input
                    checked={notifyUser}
                    className="mt-1 h-4 w-4 rounded border border-input bg-background accent-primary"
                    disabled={moderationSaving || !user.email}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    type="checkbox"
                  />
                  <span>Send moderation email to this user when the status changes.</span>
                </label>
                <Button disabled={moderationSaving} onClick={() => void submitModeration()} type="button">
                  {moderationSaving ? "Saving moderation…" : "Apply moderation"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Account facts</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Created: {user.createdAt ? formatDate(user.createdAt) : "—"}</p>
                <p>Updated: {user.updatedAt ? formatDate(user.updatedAt) : "—"}</p>
                <p>Password sign-in: {user.hasPassword ? "Enabled" : "No password set"}</p>
                <p>Onboarding complete: {user.onboardingComplete ? "Yes" : "No"}</p>
                <p>Plan expires: {user.planExpiresAt ? formatDate(user.planExpiresAt) : "—"}</p>
                <p>Moderated at: {user.moderatedAt ? formatDate(user.moderatedAt) : "—"}</p>
                <p>Suspended until: {user.suspendedUntil ? formatDate(user.suspendedUntil) : "—"}</p>
                <p>Moderated by: {user.moderatedByUserId ?? "—"}</p>
                <p>Moderation reason: {user.moderationReason || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="admin-user-paste-reason">
                Paste moderation note
              </label>
              <Textarea
                className="min-h-[88px]"
                id="admin-user-paste-reason"
                onChange={(e) => setPasteModerationReason(e.target.value)}
                placeholder="Optional note sent to the paste owner when notify is enabled…"
                value={pasteModerationReason}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input
                  checked={notifyPasteOwners}
                  className="mt-1 h-4 w-4 rounded border border-input bg-background accent-primary"
                  onChange={(e) => setNotifyPasteOwners(e.target.checked)}
                  type="checkbox"
                />
                <span>Notify the paste owner when moderation actions are applied.</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground" htmlFor="admin-user-paste-search">
                Search this user&apos;s pastes
              </label>
              <Input
                className="mt-1"
                id="admin-user-paste-search"
                onChange={(e) => {
                  setPasteOffset(0);
                  setPasteQ(e.target.value);
                }}
                placeholder="Search slug or title…"
                value={pasteQ}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground" htmlFor="admin-user-paste-status">
                Status
              </label>
              <select
                className={`${selectClass} mt-1 min-w-[140px]`}
                id="admin-user-paste-status"
                onChange={(e) => {
                  setPasteOffset(0);
                  setPasteStatus(e.target.value);
                }}
                value={pasteStatus}
              >
                {PASTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground">
              {pasteTotal} paste{pasteTotal === 1 ? "" : "s"}
              {pasteLoading ? " · loading…" : ""}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Paste</th>
                  <th className="px-3 py-3 font-medium">Visibility</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Views</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {pasteRows.map((paste) => (
                  <tr className="border-b border-white/5 hover:bg-white/[0.02]" key={paste.id}>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium line-clamp-2">{paste.title}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <Link className="text-cyan-300/90 hover:underline" href={`/p/${paste.slug}`} rel="noreferrer" target="_blank">
                          /p/{paste.slug}
                        </Link>
                        <Link className="hover:text-foreground hover:underline" href={`/admin/pastes?q=${encodeURIComponent(paste.slug)}`}>
                          open in paste search
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top capitalize">{paste.visibility}</td>
                    <td className="px-3 py-3 align-top">
                      <Badge>{paste.status}</Badge>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">{paste.viewCount}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {(["active", "hidden", "deleted"] as const).map((status) => (
                          <Button
                            className="h-8 px-2 text-xs"
                            disabled={actingSlug === paste.slug || paste.status === status}
                            key={status}
                            onClick={() => void setModeration(paste.slug, status)}
                            type="button"
                            variant={paste.status === status ? "default" : "outline"}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">
                      {paste.updatedAt ? formatDate(paste.updatedAt) : "—"}
                    </td>
                  </tr>
                ))}
                {!pasteLoading && pasteRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>
                      No pastes matched these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              disabled={!prevPage || pasteLoading}
              onClick={() => setPasteOffset((value) => Math.max(0, value - pasteLimit))}
              type="button"
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Showing {pasteRows.length ? pasteOffset + 1 : 0}–{pasteOffset + pasteRows.length} of {pasteTotal}
            </span>
            <Button
              disabled={!nextPage || pasteLoading}
              onClick={() => setPasteOffset((value) => value + pasteLimit)}
              type="button"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
