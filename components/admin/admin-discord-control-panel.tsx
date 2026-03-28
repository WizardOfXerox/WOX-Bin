"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnnouncementTone } from "@/lib/announcements";
import type { DiscordControlSnapshot } from "@/lib/discord/control-center";
import type { DiscordOperatorActivity } from "@/lib/discord/operator-activity";
import { formatDate } from "@/lib/utils";

type Props = {
  initialSnapshot: DiscordControlSnapshot;
};

type QuickPasteDraft = {
  title: string;
  content: string;
  visibility: "private" | "unlisted" | "public";
};

type AnnouncementDraft = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone: AnnouncementTone;
  published: boolean;
  startsAt: string;
  endsAt: string;
};

type QuickPastePreset = {
  id: string;
  label: string;
  description: string;
  draft: QuickPasteDraft;
};

const QUICK_PASTE_PRESETS: QuickPastePreset[] = [
  {
    id: "ops-hand-off",
    label: "Ops hand-off",
    description: "Short internal hand-off note for moderators or server operators.",
    draft: {
      title: "WOX-Bin ops hand-off",
      content:
        "Context:\n\nWhat changed:\n\nWho owns the next step:\n\nEscalation notes:\n\nUseful links:\n",
      visibility: "unlisted"
    }
  },
  {
    id: "support-reply",
    label: "Support reply",
    description: "A clean reply block for support or onboarding help.",
    draft: {
      title: "WOX-Bin support follow-up",
      content:
        "Issue summary:\n\nSteps already taken:\n\nRecommended next action:\n\nEscalate if:\n",
      visibility: "unlisted"
    }
  },
  {
    id: "release-note",
    label: "Release note",
    description: "Quick release note or changelog drop from the bot-owned key.",
    draft: {
      title: "WOX-Bin release note",
      content:
        "What shipped:\n\nWhy it matters:\n\nKnown follow-ups:\n\nOpen the site: https://wox-bin.vercel.app/changelog",
      visibility: "public"
    }
  },
  {
    id: "incident",
    label: "Incident note",
    description: "Short incident timeline or status stub for ops channels.",
    draft: {
      title: "WOX-Bin incident update",
      content:
        "Current status:\n\nImpact:\n\nMitigation in progress:\n\nNext update:\n",
      visibility: "unlisted"
    }
  }
];

const selectClass =
  "h-11 w-full rounded-2xl border border-border bg-card/80 px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function statusBadge(enabled: boolean, label: string) {
  return (
    <Badge
      className={
        enabled
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
          : "border-white/15 bg-white/5 text-muted-foreground"
      }
    >
      {label}
    </Badge>
  );
}

function activityBadge(activity: DiscordOperatorActivity["status"]) {
  if (activity === "success") {
    return <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100">Success</Badge>;
  }

  if (activity === "failed") {
    return <Badge className="border-red-400/30 bg-red-500/10 text-red-100">Failed</Badge>;
  }

  return <Badge className="border-white/15 bg-white/5 text-muted-foreground">Info</Badge>;
}

function emptyQuickPaste(): QuickPasteDraft {
  return {
    title: "",
    content: "",
    visibility: "unlisted"
  };
}

function emptyAnnouncement(): AnnouncementDraft {
  return {
    title: "",
    body: "",
    ctaLabel: "",
    ctaHref: "",
    tone: "info",
    published: true,
    startsAt: "",
    endsAt: ""
  };
}

export function AdminDiscordControlPanel({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [quickPaste, setQuickPaste] = useState<QuickPasteDraft>(emptyQuickPaste());
  const [announcement, setAnnouncement] = useState<AnnouncementDraft>(emptyAnnouncement());
  const [lastQuickPasteUrl, setLastQuickPasteUrl] = useState<string | null>(null);
  const [guildQuery, setGuildQuery] = useState("");
  const deferredGuildQuery = useDeferredValue(guildQuery);
  const [selectedGuildId, setSelectedGuildId] = useState(initialSnapshot.integrations[0]?.guildId ?? "");

  const statCards = useMemo(
    () => [
      { label: "Linked guilds", value: snapshot.summary.totalGuilds },
      { label: "Site ops mirrors", value: snapshot.summary.siteOpsGuilds },
      { label: "Webhook-linked guilds", value: snapshot.summary.webhookGuilds },
      { label: "Ready setups", value: snapshot.summary.readyGuilds },
      { label: "Discord accounts linked", value: snapshot.linkedRoles.connectedAccountCount }
    ],
    [snapshot.linkedRoles.connectedAccountCount, snapshot.summary]
  );

  const guilds = useMemo(() => {
    const query = deferredGuildQuery.trim().toLowerCase();
    if (!query) {
      return snapshot.integrations;
    }

    return snapshot.integrations.filter((guild) => {
      return (
        guild.guildName.toLowerCase().includes(query) ||
        guild.guildId.toLowerCase().includes(query) ||
        guild.recentActivity.some((entry) => entry.label.toLowerCase().includes(query))
      );
    });
  }, [deferredGuildQuery, snapshot.integrations]);

  useEffect(() => {
    if (!guilds.length) {
      if (selectedGuildId) {
        setSelectedGuildId("");
      }
      return;
    }

    if (!guilds.some((guild) => guild.guildId === selectedGuildId)) {
      setSelectedGuildId(guilds[0].guildId);
    }
  }, [guilds, selectedGuildId]);

  const selectedGuild =
    guilds.find((guild) => guild.guildId === selectedGuildId) ??
    snapshot.integrations.find((guild) => guild.guildId === selectedGuildId) ??
    guilds[0] ??
    null;

  async function refreshSnapshot() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/discord", { cache: "no-store" });
      const payload = (await response.json()) as { snapshot?: DiscordControlSnapshot; error?: string };
      if (!response.ok || !payload.snapshot) {
        throw new Error(payload.error ?? "Could not refresh the Discord dashboard.");
      }
      setSnapshot(payload.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the Discord dashboard.");
    } finally {
      setRefreshing(false);
    }
  }

  async function runAction(
    action: Record<string, unknown>,
    pendingKey: string
  ): Promise<{ paste?: { slug: string | null; url: string | null } } | null> {
    setActingKey(pendingKey);
    setError(null);
    setNotice(null);
    setLastQuickPasteUrl(null);
    try {
      const response = await fetch("/api/admin/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(action)
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        snapshot?: DiscordControlSnapshot;
        paste?: { slug: string | null; url: string | null };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Discord action failed.");
      }
      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
      setNotice(payload.message ?? "Discord action complete.");
      if (payload.paste?.url) {
        setLastQuickPasteUrl(payload.paste.url);
      }
      return payload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discord action failed.");
      return null;
    } finally {
      setActingKey(null);
    }
  }

  async function createQuickPaste() {
    const payload = await runAction(
      {
        action: "quickpaste",
        title: quickPaste.title,
        content: quickPaste.content,
        visibility: quickPaste.visibility
      },
      "quickpaste"
    );
    if (payload) {
      setQuickPaste(emptyQuickPaste());
    }
  }

  async function createAnnouncement() {
    const payload = await runAction(
      {
        action: "announce",
        title: announcement.title,
        body: announcement.body,
        ctaLabel: announcement.ctaLabel || null,
        ctaHref: announcement.ctaHref || null,
        tone: announcement.tone,
        published: announcement.published,
        startsAt: announcement.startsAt || null,
        endsAt: announcement.endsAt || null
      },
      "announce"
    );
    if (payload) {
      setAnnouncement(emptyAnnouncement());
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setLastQuickPasteUrl(null);
      setNotice(`${label} copied.`);
      setError(null);
    } catch {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  const selectedGuildActionPrefix = selectedGuild?.guildId ?? "guild";

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Discord</p>
            <h1 className="text-2xl font-semibold">Discord bot operator console</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              v1.2 turns the Discord dashboard into a real operator surface: per-guild focus, webhook health, recent
              Discord activity, quickpaste presets, and live linked-role readiness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {snapshot.inviteUrl ? (
              <Button asChild size="sm">
                <a href={snapshot.inviteUrl} rel="noreferrer" target="_blank">
                  Open install URL
                </a>
              </Button>
            ) : (
              <Button disabled size="sm" type="button">
                Install URL unavailable
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <a href="/discord" rel="noreferrer" target="_blank">
                View landing page
              </a>
            </Button>
            <Button disabled={refreshing} onClick={() => void refreshSnapshot()} size="sm" type="button" variant="ghost">
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
            {lastQuickPasteUrl ? (
              <>
                {" "}
                <a className="underline underline-offset-4" href={lastQuickPasteUrl} rel="noreferrer" target="_blank">
                  Open paste
                </a>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <Card className="border-white/10 bg-white/[0.03]" key={card.label}>
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Guild picker</p>
              <p className="text-xs text-muted-foreground">
                Focus a single guild to inspect setup health, webhook status, and recent operator activity.
              </p>
            </div>
            <Input
              onChange={(event) => setGuildQuery(event.target.value)}
              placeholder="Search guild name or id"
              value={guildQuery}
            />
            <div className="space-y-3">
              {guilds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  No guilds match this filter yet.
                </div>
              ) : (
                guilds.map((guild) => {
                  const selected = guild.guildId === selectedGuild?.guildId;

                  return (
                    <button
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-primary/40 bg-primary/10 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                          : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                      key={guild.guildId}
                      onClick={() => setSelectedGuildId(guild.guildId)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{guild.guildName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{guild.guildId}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {statusBadge(guild.siteOpsEnabled, guild.siteOpsEnabled ? "Site ops" : "Standard")}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {statusBadge(guild.bootstrapReady, guild.bootstrapReady ? "Ready" : `${guild.bootstrapCoverage}/4 channels`)}
                        {statusBadge(Boolean(guild.announcementWebhookUrl), "Webhook")}
                        {guild.lastAnnouncementDelivery ? activityBadge(guild.lastAnnouncementDelivery.status) : statusBadge(false, "No delivery")}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedGuild ? (
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="space-y-5 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Selected guild</p>
                    <h2 className="mt-2 text-2xl font-semibold">{selectedGuild.guildName}</h2>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{selectedGuild.guildId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusBadge(selectedGuild.siteOpsEnabled, selectedGuild.siteOpsEnabled ? "Site ops mirror on" : "Standard guild")}
                    {statusBadge(selectedGuild.bootstrapReady, selectedGuild.bootstrapReady ? "Bootstrapped" : "Needs setup")}
                    {statusBadge(Boolean(selectedGuild.announcementWebhookUrl), "Webhook linked")}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Setup status</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {selectedGuild.bootstrapReady ? "Ready" : `${selectedGuild.bootstrapCoverage}/4`}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Version {selectedGuild.setupVersion}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Webhook check</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {selectedGuild.lastWebhookCheck ? selectedGuild.lastWebhookCheck.label : "Not tested yet"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedGuild.lastWebhookCheck ? formatDate(selectedGuild.lastWebhookCheck.createdAt) : "Run a webhook test to verify delivery."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Mirror delivery</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {selectedGuild.lastAnnouncementDelivery ? selectedGuild.lastAnnouncementDelivery.label : "No mirrored announcement yet"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {selectedGuild.lastAnnouncementDelivery
                        ? formatDate(selectedGuild.lastAnnouncementDelivery.createdAt)
                        : "Publish a site announcement to test live mirroring."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last seen</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{formatDate(selectedGuild.lastSeenAt)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Installed {formatDate(selectedGuild.installedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={actingKey === `setup:${selectedGuildActionPrefix}`}
                    onClick={() => void runAction({ action: "setup", guildId: selectedGuild.guildId }, `setup:${selectedGuild.guildId}`)}
                    size="sm"
                    type="button"
                  >
                    {actingKey === `setup:${selectedGuildActionPrefix}` ? "Running setup…" : "Refresh setup"}
                  </Button>
                  <Button
                    disabled={actingKey === `siteops:${selectedGuildActionPrefix}`}
                    onClick={() =>
                      void runAction(
                        { action: "siteops", guildId: selectedGuild.guildId, enabled: !selectedGuild.siteOpsEnabled },
                        `siteops:${selectedGuild.guildId}`
                      )
                    }
                    size="sm"
                    type="button"
                    variant={selectedGuild.siteOpsEnabled ? "secondary" : "outline"}
                  >
                    {actingKey === `siteops:${selectedGuildActionPrefix}`
                      ? "Saving…"
                      : selectedGuild.siteOpsEnabled
                        ? "Disable site ops"
                        : "Enable site ops"}
                  </Button>
                  <Button
                    disabled={actingKey === `webhook:${selectedGuildActionPrefix}` || !selectedGuild.announcementWebhookUrl}
                    onClick={() => void runAction({ action: "webhook-test", guildId: selectedGuild.guildId }, `webhook:${selectedGuild.guildId}`)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {actingKey === `webhook:${selectedGuildActionPrefix}` ? "Sending…" : "Test webhook"}
                  </Button>
                  <Button onClick={() => void copyText(selectedGuild.guildId, "Guild ID")} size="sm" type="button" variant="ghost">
                    Copy guild ID
                  </Button>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Welcome", value: selectedGuild.welcomeChannelId },
                    { label: "Announcements", value: selectedGuild.announcementsChannelId },
                    { label: "Support", value: selectedGuild.supportChannelId },
                    { label: "Bot room", value: selectedGuild.botChannelId }
                  ].map((channel) => (
                    <div className="rounded-xl border border-white/10 bg-black/10 p-3" key={channel.label}>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{channel.label}</p>
                      <p className="mt-2 break-all font-mono text-xs text-foreground">{channel.value ?? "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Recent guild activity</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Setup refreshes, webhook tests, and mirrored announcement deliveries.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedGuild.recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No Discord activity is recorded for this guild yet.</p>
                    ) : (
                      selectedGuild.recentActivity.map((entry) => (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={`${entry.id}:${entry.action}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{entry.label}</p>
                              {entry.detail ? <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p> : null}
                            </div>
                            {activityBadge(entry.status)}
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {formatDate(entry.createdAt)} · {entry.actorLabel}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-white/[0.03]">
              <CardContent className="px-6 py-16 text-center text-sm text-muted-foreground">
                No guild is selected yet. Install the bot in a server and run <code>/wox setup</code> once, or clear the
                current search filter.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Linked roles readiness</p>
              <div className="flex flex-wrap gap-2">
                {statusBadge(snapshot.linkedRoles.oauthReady, snapshot.linkedRoles.oauthReady ? "Discord OAuth ready" : "Discord OAuth missing")}
                {statusBadge(
                  snapshot.linkedRoles.metadataSyncReady,
                  snapshot.linkedRoles.metadataSyncReady ? "Metadata sync ready" : "Bot token or app id missing"
                )}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Users can now connect Discord from account settings and synchronize their plan, staff level, verification
                state, onboarding state, and account age to Discord linked roles.
              </p>
              <div className="space-y-2">
                {snapshot.linkedRoles.metadataRecords.map((record) => (
                  <div className="rounded-xl border border-white/10 bg-black/10 p-3" key={record.key}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{record.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{record.description}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
                        {record.key}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild size="sm" type="button" variant="outline">
                <a href="/discord/linked-roles" rel="noreferrer" target="_blank">
                  Open linked-roles flow
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="text-sm font-medium">Bot quickpaste</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create site-owned hosted notes for ops, support, and release work.
                </p>
              </div>
              <div className="grid gap-2">
                {QUICK_PASTE_PRESETS.map((preset) => (
                  <button
                    className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                    key={preset.id}
                    onClick={() => setQuickPaste(preset.draft)}
                    type="button"
                  >
                    <p className="font-medium text-foreground">{preset.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                  </button>
                ))}
              </div>
              <Input
                onChange={(event) => setQuickPaste((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Paste title"
                value={quickPaste.title}
              />
              <Textarea
                className="min-h-32"
                onChange={(event) => setQuickPaste((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Paste body"
                value={quickPaste.content}
              />
              <select
                className={selectClass}
                onChange={(event) =>
                  setQuickPaste((prev) => ({
                    ...prev,
                    visibility: event.target.value as QuickPasteDraft["visibility"]
                  }))
                }
                value={quickPaste.visibility}
              >
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
              <Button disabled={actingKey === "quickpaste"} onClick={() => void createQuickPaste()} type="button">
                {actingKey === "quickpaste" ? "Creating…" : "Create quickpaste"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Announcement composer</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publish a live site announcement and mirror it to every site-ops guild.
                  </p>
                </div>
                <Button asChild size="sm" type="button" variant="ghost">
                  <a href="/admin/announcements" rel="noreferrer" target="_blank">
                    Full history
                  </a>
                </Button>
              </div>
              <Input
                onChange={(event) => setAnnouncement((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Announcement title"
                value={announcement.title}
              />
              <Textarea
                className="min-h-28"
                onChange={(event) => setAnnouncement((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Announcement body"
                value={announcement.body}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  onChange={(event) => setAnnouncement((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                  placeholder="CTA label"
                  value={announcement.ctaLabel}
                />
                <Input
                  onChange={(event) => setAnnouncement((prev) => ({ ...prev, ctaHref: event.target.value }))}
                  placeholder="CTA link (/docs or https://...)"
                  value={announcement.ctaHref}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  className={selectClass}
                  onChange={(event) =>
                    setAnnouncement((prev) => ({
                      ...prev,
                      tone: event.target.value as AnnouncementTone
                    }))
                  }
                  value={announcement.tone}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <Input
                  onChange={(event) => setAnnouncement((prev) => ({ ...prev, startsAt: event.target.value }))}
                  type="datetime-local"
                  value={announcement.startsAt}
                />
                <Input
                  onChange={(event) => setAnnouncement((prev) => ({ ...prev, endsAt: event.target.value }))}
                  type="datetime-local"
                  value={announcement.endsAt}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  checked={announcement.published}
                  onChange={(event) => setAnnouncement((prev) => ({ ...prev, published: event.target.checked }))}
                  type="checkbox"
                />
                Publish immediately
              </label>
              <Button disabled={actingKey === "announce"} onClick={() => void createAnnouncement()} type="button">
                {actingKey === "announce" ? "Publishing…" : "Create announcement"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Runtime and portal values</p>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-muted-foreground">
                Commands are served through the hosted interactions endpoint. A gateway companion remains optional for
                presence or lifecycle-only features.
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                {[
                  { label: "Custom install link", value: snapshot.landingUrl },
                  { label: "Interactions Endpoint URL", value: snapshot.interactionEndpointUrl },
                  { label: "Webhooks Endpoint URL", value: snapshot.webhookEventsUrl },
                  { label: "Linked Roles Verification URL", value: snapshot.linkedRolesVerificationUrl },
                  { label: "Terms of Service URL", value: snapshot.termsUrl },
                  { label: "Privacy Policy URL", value: snapshot.privacyUrl }
                ].map((item) => {
                  const value = item.value;

                  return (
                    <div className="rounded-xl border border-white/10 bg-black/10 p-3" key={item.label}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                          <p className="mt-2 break-all font-mono text-foreground">{value ?? "Unavailable"}</p>
                        </div>
                        {value ? (
                          <Button onClick={() => void copyText(value, item.label)} size="sm" type="button" variant="ghost">
                            Copy
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Recent Discord operator activity</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Setup refreshes, webhook tests, linked-role sync events, and mirrored site announcements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusBadge(snapshot.config.hasApplicationId, "Application ID")}
              {statusBadge(snapshot.config.hasToken, "Bot token")}
              {statusBadge(snapshot.config.hasPublicKey, "Public key")}
              {statusBadge(snapshot.config.hasSiteApiKey, "Bot site key")}
            </div>
          </div>
          <div className="space-y-3">
            {snapshot.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Discord operator activity has been recorded yet.</p>
            ) : (
              snapshot.recentActivity.map((entry) => (
                <div className="rounded-xl border border-white/10 bg-black/10 p-4" key={`${entry.id}:${entry.action}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{entry.label}</p>
                      {entry.guildName ? <p className="mt-1 text-xs text-muted-foreground">{entry.guildName}</p> : null}
                      {entry.detail ? <p className="mt-2 text-sm text-muted-foreground">{entry.detail}</p> : null}
                    </div>
                    {activityBadge(entry.status)}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)} · {entry.actorLabel}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
