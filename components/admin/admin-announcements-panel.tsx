"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type AnnouncementTone = "info" | "success" | "warning" | "critical";

type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  tone: AnnouncementTone;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DraftAnnouncement = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone: AnnouncementTone;
  published: boolean;
  startsAt: string;
  endsAt: string;
};

const TONE_OPTIONS: AnnouncementTone[] = ["info", "success", "warning", "critical"];

const selectClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20";

function emptyDraft(): DraftAnnouncement {
  return {
    title: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    tone: "info",
    published: false,
    startsAt: "",
    endsAt: ""
  };
}

function isoToLocalInput(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function draftFromAnnouncement(row: AnnouncementRecord): DraftAnnouncement {
  return {
    title: row.title,
    body: row.body,
    ctaLabel: row.ctaLabel ?? "",
    ctaHref: row.ctaHref ?? "",
    tone: row.tone,
    published: row.published,
    startsAt: isoToLocalInput(row.startsAt),
    endsAt: isoToLocalInput(row.endsAt)
  };
}

function payloadFromDraft(draft: DraftAnnouncement) {
  return {
    title: draft.title,
    body: draft.body,
    ctaLabel: draft.ctaLabel || null,
    ctaHref: draft.ctaHref || null,
    tone: draft.tone,
    published: draft.published,
    startsAt: draft.startsAt || null,
    endsAt: draft.endsAt || null
  };
}

function toneBadgeClass(tone: AnnouncementTone) {
  if (tone === "success") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }
  if (tone === "warning") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
  if (tone === "critical") {
    return "border-red-400/30 bg-red-500/10 text-red-100";
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

function isAnnouncementVisibleNow(row: Pick<AnnouncementRecord, "published" | "startsAt" | "endsAt">) {
  if (!row.published) {
    return false;
  }
  const now = Date.now();
  const startsAt = row.startsAt ? Date.parse(row.startsAt) : null;
  const endsAt = row.endsAt ? Date.parse(row.endsAt) : null;
  if (startsAt && !Number.isNaN(startsAt) && startsAt > now) {
    return false;
  }
  if (endsAt && !Number.isNaN(endsAt) && endsAt <= now) {
    return false;
  }
  return true;
}

export function AdminAnnouncementsPanel() {
  const [rows, setRows] = useState<AnnouncementRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftAnnouncement>>({});
  const [createDraft, setCreateDraft] = useState<DraftAnnouncement>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const liveAnnouncement = useMemo(() => rows.find((row) => isAnnouncementVisibleNow(row)) ?? null, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      const data = (await res.json()) as { announcements?: AnnouncementRecord[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load announcements.");
      }
      const announcements = data.announcements ?? [];
      setRows(announcements);
      setDrafts(
        Object.fromEntries(announcements.map((row) => [row.id, draftFromAnnouncement(row)]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements.");
      setRows([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateDraft(id: string, patch: Partial<DraftAnnouncement>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? emptyDraft()),
        ...patch
      }
    }));
  }

  async function createAnnouncement() {
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDraft(createDraft))
      });
      const data = (await res.json()) as { announcement?: AnnouncementRecord; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not create the announcement.");
      }
      setCreateDraft(emptyDraft());
      setNotice("Announcement created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the announcement.");
    } finally {
      setCreating(false);
    }
  }

  async function saveAnnouncement(id: string) {
    const draft = drafts[id];
    if (!draft) {
      return;
    }
    setSavingId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDraft(draft))
      });
      const data = (await res.json()) as { announcement?: AnnouncementRecord; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save the announcement.");
      }
      setNotice("Announcement updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the announcement.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) {
      return;
    }
    setSavingId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not delete the announcement.");
      }
      setNotice("Announcement deleted.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the announcement.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Announcements</p>
            <h1 className="mt-2 text-2xl font-semibold">Admin broadcast banner</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Publish one live site announcement at a time for maintenance windows, incident notes, launch updates, or
              routing changes.
            </p>
          </div>
          {liveAnnouncement ? (
            <Badge className={toneBadgeClass(liveAnnouncement.tone)}>Live: {liveAnnouncement.title}</Badge>
          ) : (
            <Badge className="border-white/15 bg-white/5 text-muted-foreground">No live announcement</Badge>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <p className="text-sm font-medium">New announcement</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Publishing here automatically replaces the current live site banner.
              </p>
            </div>
            <Input
              onChange={(e) => setCreateDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              value={createDraft.title}
            />
            <Textarea
              className="min-h-28"
              onChange={(e) => setCreateDraft((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Short announcement body"
              value={createDraft.body}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                placeholder="CTA label"
                value={createDraft.ctaLabel}
              />
              <Input
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, ctaHref: e.target.value }))}
                placeholder="CTA link (/support or https://...)"
                value={createDraft.ctaHref}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Tone</span>
                <select
                  className={`${selectClass} w-full`}
                  onChange={(e) =>
                    setCreateDraft((prev) => ({ ...prev, tone: e.target.value as AnnouncementTone }))
                  }
                  value={createDraft.tone}
                >
                  {TONE_OPTIONS.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Starts at</span>
                <Input
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, startsAt: e.target.value }))}
                  type="datetime-local"
                  value={createDraft.startsAt}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Ends at</span>
                <Input
                  onChange={(e) => setCreateDraft((prev) => ({ ...prev, endsAt: e.target.value }))}
                  type="datetime-local"
                  value={createDraft.endsAt}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                checked={createDraft.published}
                onChange={(e) => setCreateDraft((prev) => ({ ...prev, published: e.target.checked }))}
                type="checkbox"
              />
              Publish immediately
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={creating} onClick={() => void createAnnouncement()} type="button">
                {creating ? "Creating…" : "Create announcement"}
              </Button>
              <Button onClick={() => setCreateDraft(emptyDraft())} type="button" variant="outline">
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium">Live banner behavior</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Only one published announcement stays live at a time.</li>
              <li>Start and end windows are optional.</li>
              <li>CTA links can be internal routes or full HTTPS URLs.</li>
              <li>Visitors can dismiss the banner per browser.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="glass-panel space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Announcement history</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "Loading…" : `${rows.length} announcement${rows.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {!loading && rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
              No announcements yet.
            </div>
          ) : null}

          {rows.map((row) => {
            const draft = drafts[row.id] ?? draftFromAnnouncement(row);
            return (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={toneBadgeClass(draft.tone)}>{draft.tone}</Badge>
                      {isAnnouncementVisibleNow(row) ? (
                        <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">Live</Badge>
                      ) : row.published ? (
                        <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-100">Published</Badge>
                      ) : (
                        <Badge className="border-white/15 bg-white/5 text-muted-foreground">Draft</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created {formatDate(row.createdAt)} · Updated {formatDate(row.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={savingId === row.id}
                      onClick={() => void saveAnnouncement(row.id)}
                      size="sm"
                      type="button"
                    >
                      {savingId === row.id ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      disabled={savingId === row.id}
                      onClick={() => void deleteAnnouncement(row.id)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <Input
                    onChange={(e) => updateDraft(row.id, { title: e.target.value })}
                    value={draft.title}
                  />
                  <Textarea
                    className="min-h-24"
                    onChange={(e) => updateDraft(row.id, { body: e.target.value })}
                    value={draft.body}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      onChange={(e) => updateDraft(row.id, { ctaLabel: e.target.value })}
                      placeholder="CTA label"
                      value={draft.ctaLabel}
                    />
                    <Input
                      onChange={(e) => updateDraft(row.id, { ctaHref: e.target.value })}
                      placeholder="CTA link"
                      value={draft.ctaHref}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Tone</span>
                      <select
                        className={`${selectClass} w-full`}
                        onChange={(e) => updateDraft(row.id, { tone: e.target.value as AnnouncementTone })}
                        value={draft.tone}
                      >
                        {TONE_OPTIONS.map((tone) => (
                          <option key={tone} value={tone}>
                            {tone}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Starts at</span>
                      <Input
                        onChange={(e) => updateDraft(row.id, { startsAt: e.target.value })}
                        type="datetime-local"
                        value={draft.startsAt}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-xs text-muted-foreground">Ends at</span>
                      <Input
                        onChange={(e) => updateDraft(row.id, { endsAt: e.target.value })}
                        type="datetime-local"
                        value={draft.endsAt}
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      checked={draft.published}
                      onChange={(e) => updateDraft(row.id, { published: e.target.checked })}
                      type="checkbox"
                    />
                    Publish this announcement
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
