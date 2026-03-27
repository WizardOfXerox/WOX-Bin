import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDiscordControlSnapshot } from "@/lib/discord/control-center";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function AdminDiscordPage() {
  const snapshot = await getDiscordControlSnapshot();

  const statCards = [
    { label: "Linked guilds", value: snapshot.summary.totalGuilds },
    { label: "Site ops mirrors", value: snapshot.summary.siteOpsGuilds },
    { label: "Webhook-linked guilds", value: snapshot.summary.webhookGuilds },
    { label: "Ready setups", value: snapshot.summary.readyGuilds }
  ];

  const envCards = [
    { label: "Application ID", enabled: snapshot.config.hasApplicationId },
    { label: "Bot token", enabled: snapshot.config.hasToken },
    { label: "Public key", enabled: snapshot.config.hasPublicKey },
    { label: "Dev guild", enabled: snapshot.config.hasDevGuildId },
    { label: "Bot site API key", enabled: snapshot.config.hasSiteApiKey }
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Discord</p>
            <h1 className="text-2xl font-semibold">Discord bot control dashboard</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Track invite readiness, operator coverage, guild bootstrap status, and webhook linkage for the first-party
              WOX-Bin Discord bot.
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
          </div>
        </div>

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Guild integrations</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {snapshot.integrations.length} guild{snapshot.integrations.length === 1 ? "" : "s"} linked to the bot
                </p>
              </div>
            </div>

            {snapshot.integrations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">
                No guild integrations yet. Invite the bot and run <code>/wox setup</code> in your server.
              </div>
            ) : (
              <div className="space-y-4">
                {snapshot.integrations.map((guild) => (
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

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Welcome</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{guild.welcomeChannelId ?? "—"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Announcements</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{guild.announcementsChannelId ?? "—"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Support</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{guild.supportChannelId ?? "—"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bot room</p>
                        <p className="mt-2 font-mono text-xs text-foreground">{guild.botChannelId ?? "—"}</p>
                      </div>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
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
                <p>
                  Interactions endpoint:{" "}
                  <span className="font-mono text-foreground">{snapshot.interactionEndpointUrl ?? "Unavailable"}</span>
                </p>
                <p>
                  Webhook events endpoint:{" "}
                  <span className="font-mono text-foreground">{snapshot.webhookEventsUrl ?? "Unavailable"}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Discord portal values</p>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.22em] text-muted-foreground">Linked Roles Verification URL</p>
                  <p className="mt-2 break-all font-mono text-foreground">
                    {snapshot.linkedRolesVerificationUrl ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.22em] text-muted-foreground">Terms of Service URL</p>
                  <p className="mt-2 break-all font-mono text-foreground">{snapshot.termsUrl ?? "Unavailable"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.22em] text-muted-foreground">Privacy Policy URL</p>
                  <p className="mt-2 break-all font-mono text-foreground">{snapshot.privacyUrl ?? "Unavailable"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="uppercase tracking-[0.22em] text-muted-foreground">Optional custom install landing</p>
                  <p className="mt-2 break-all font-mono text-foreground">{snapshot.landingUrl ?? "Unavailable"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Ops runbook</p>
              <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>1. Use the install URL to add the bot to your Discord server.</li>
                <li>2. Run <code>/wox setup</code> once so the bot can create channels, roles, and the announcement webhook.</li>
                <li>3. Run <code>/wox siteops enabled:true</code> in the one guild that should mirror live site notices.</li>
                <li>
                  4. Set Discord’s Interactions Endpoint URL to <code>{snapshot.interactionEndpointUrl ?? "/api/discord/interactions"}</code>{" "}
                  so slash commands run from the Vercel app without your PC.
                </li>
                <li>
                  5. Set the Webhooks Endpoint URL to <code>{snapshot.webhookEventsUrl ?? "/api/discord/events"}</code> and
                  the Linked Roles Verification URL to <code>{snapshot.linkedRolesVerificationUrl ?? "/discord/linked-roles"}</code>.
                </li>
                <li>
                  6. Keep a dedicated <code>DISCORD_BOT_SITE_API_KEY</code> as a site-owned secret in env, not as a normal
                  user account API key, so bot quickpaste access is easy to rotate.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-medium">Useful commands</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <code>npm run discord:invite</code>
                </p>
                <p>
                  <code>npm run discord:bot</code>
                </p>
                <p className="leading-7">
                  Slash commands can run through the interactions endpoint on Vercel, while the gateway companion should
                  stay on an always-on worker or VPS for presence and guild lifecycle events.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
