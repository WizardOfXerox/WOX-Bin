"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnnouncementTone } from "@/lib/announcements";
import type { DiscordControlSnapshot } from "@/lib/discord/control-center";
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

  const statCards = useMemo(
    () => [
      { label: "Linked guilds", value: snapshot.summary.totalGuilds },
      { label: "Site ops mirrors", value: snapshot.summary.siteOpsGuilds },
      { label: "Webhook-linked guilds", value: snapshot.summary.webhookGuilds },
      { label: "Ready setups", value: snapshot.summary.readyGuilds }
    ],
    [snapshot.summary]
  );

  const envCards = useMemo(
    () => [
      { label: "Application ID", enabled: snapshot.config.hasApplicationId },
      { label: "Bot token", enabled: snapshot.config.hasToken },
      { label: "Public key", enabled: snapshot.config.hasPublicKey },
      { label: "Dev guild", enabled: snapshot.config.hasDevGuildId },
      { label: "Bot site API key", enabled: snapshot.config.hasSiteApiKey }
    ],
    [snapshot.config]
  );

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

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Discord</p>
            <h1 className="text-2xl font-semibold">Discord bot operator console</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Run guild bootstrap actions, flip site-ops mirroring, test announcement webhooks, publish broadcasts, and
              create bot-owned quick pastes without leaving the admin area.
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Guild controls</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {snapshot.integrations.length} guild{snapshot.integrations.length === 1 ? "" : "s"} registered
                </p>
              </div>
            </div>

            {snapshot.integrations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
                No guild integrations yet. Install the bot in Discord, then run <code>/wox setup</code> once or use the
                install URL above.
              </div>
            ) : (
              <div className="space-y-4">
                {snapshot.integrations.map((guild) => {
                  const setupBusy = actingKey === `setup:${guild.guildId}`;
                  const siteOpsBusy = actingKey === `siteops:${guild.guildId}`;
                  const webhookBusy = actingKey === `webhook:${guild.guildId}`;
                  const channelList = [
                    { label: "Welcome", value: guild.welcomeChannelId },
                    { label: "Announcements", value: guild.announcementsChannelId },
                    { label: "Support", value: guild.supportChannelId },
                    { label: "Bot room", value: guild.botChannelId }
                  ];

                  return (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4" key={guild.guildId}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold">{guild.guildName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Guild ID <span className="font-mono text-foreground">{guild.guildId}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {statusBadge(guild.siteOpsEnabled, guild.siteOpsEnabled ? "Site ops" : "Standard")}
                          {statusBadge(Boolean(guild.announcementWebhookUrl), "Webhook")}
                          {statusBadge(
                            Boolean(guild.welcomeChannelId) &&
                              Boolean(guild.announcementsChannelId) &&
                              Boolean(guild.supportChannelId) &&
                              Boolean(guild.botChannelId),
                            "Bootstrapped"
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          disabled={setupBusy}
                          onClick={() => void runAction({ action: "setup", guildId: guild.guildId }, `setup:${guild.guildId}`)}
                          size="sm"
                          type="button"
                        >
                          {setupBusy ? "Running setup…" : "Refresh setup"}
                        </Button>
                        <Button
                          disabled={siteOpsBusy}
                          onClick={() =>
                            void runAction(
                              {
                                action: "siteops",
                                guildId: guild.guildId,
                                enabled: !guild.siteOpsEnabled
                              },
                              `siteops:${guild.guildId}`
                            )
                          }
                          size="sm"
                          type="button"
                          variant={guild.siteOpsEnabled ? "secondary" : "outline"}
                        >
                          {siteOpsBusy
                            ? "Saving…"
                            : guild.siteOpsEnabled
                              ? "Disable site ops"
                              : "Enable site ops"}
                        </Button>
                        <Button
                          disabled={webhookBusy || !guild.announcementWebhookUrl}
                          onClick={() =>
                            void runAction(
                              { action: "webhook-test", guildId: guild.guildId },
                              `webhook:${guild.guildId}`
                            )
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {webhookBusy ? "Sending…" : "Test webhook"}
                        </Button>
                        <Button
                          onClick={() => void copyText(guild.guildId, "Guild ID")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Copy guild ID
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                        {channelList.map((channel) => (
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={channel.label}>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{channel.label}</p>
                            <p className="mt-2 break-all font-mono text-xs text-foreground">{channel.value ?? "—"}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                        <p>
                          Installed <span className="text-foreground">{formatDate(guild.installedAt)}</span>
                        </p>
                        <p>
                          Last setup <span className="text-foreground">{formatDate(guild.lastSetupAt)}</span>
                        </p>
                        <p>
                          Last seen <span className="text-foreground">{formatDate(guild.lastSeenAt)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Bot quickpaste</p>
              <p className="text-sm text-muted-foreground">
                Create a site-owned paste for bot responses, release notes, or moderation handoff without using a user
                API key.
              </p>
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
                    Publishes a live site announcement and mirrors it into site-ops guilds.
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
              <p className="text-sm font-medium">Environment readiness</p>
              <div className="flex flex-wrap gap-2">
                {envCards.map((card) => (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5" key={card.label}>
                    {statusBadge(card.enabled, card.label)}
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Operators configured: <span className="font-semibold text-foreground">{snapshot.config.operatorCount}</span>
                </p>
                <p>
                  Site base URL: <span className="font-mono text-foreground">{snapshot.siteBaseUrl}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Portal values</p>
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
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" key={item.label}>
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
    </div>
  );
}
