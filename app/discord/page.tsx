import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Command, Link2, MessageSquareMore, ShieldCheck, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isAdminSession } from "@/lib/admin-auth";
import { getDiscordControlSnapshot } from "@/lib/discord/control-center";

const COMMANDS = [
  "/wox help",
  "/wox links",
  "/wox tools",
  "/wox feed",
  "/wox status",
  "/wox roll",
  "/wox coinflip",
  "/wox choose",
  "/wox magic8",
  "/wox rps",
  "/wox music",
  "/wox setup",
  "/wox siteops",
  "/wox announce",
  "/wox quickpaste"
] as const;

const BOOTSTRAP_CHANNELS = ["#wox-start-here", "#wox-announcements", "#wox-support", "#wox-bot"] as const;
const BOOTSTRAP_ROLES = ["WOX Admin", "WOX Support"] as const;

export const metadata: Metadata = {
  title: "Discord Bot",
  description: "Install and manage the official WOX-Bin Discord bot for announcements, feed mirrors, and server bootstrap."
};

export const dynamic = "force-dynamic";

export default async function DiscordBotPage() {
  const session = await auth();
  const snapshot = await getDiscordControlSnapshot();
  const viewerIsAdmin = isAdminSession(session);

  const statCards = [
    { label: "Linked guilds", value: snapshot.summary.totalGuilds },
    { label: "Site ops mirrors", value: snapshot.summary.siteOpsGuilds },
    { label: "Webhook-enabled guilds", value: snapshot.summary.webhookGuilds },
    { label: "Fully bootstrapped guilds", value: snapshot.summary.readyGuilds }
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-35" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <SiteHeader />

        <section className="glass-panel overflow-hidden px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div className="space-y-5">
              <Badge className="px-3 py-1 text-xs">Discord</Badge>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin bot</p>
                <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  Mirror site activity, bootstrap servers, and give your ops team a single Discord command surface.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                  The first-party WOX-Bin bot can set up announcement/support channels, mirror live site broadcasts, expose
                  feed and health checks, and create quick hosted pastes when the bot site key is configured.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {snapshot.inviteUrl ? (
                  <Button asChild size="lg">
                    <a href={snapshot.inviteUrl} rel="noreferrer" target="_blank">
                      Install Discord bot
                    </a>
                  </Button>
                ) : (
                  <Button disabled size="lg" type="button">
                    Invite URL not configured yet
                  </Button>
                )}
                {viewerIsAdmin ? (
                  <Button asChild size="lg" variant="outline">
                    <Link href="/admin/discord">Open admin dashboard</Link>
                  </Button>
                ) : null}
                <Button asChild size="lg" variant="secondary">
                  <Link href="/bookmarkfs/sync">Hosted sync</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  Base URL: <span className="font-mono text-foreground">{snapshot.siteBaseUrl}</span>
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  {snapshot.config.hasSiteApiKey ? "Quickpaste ready" : "Quickpaste disabled"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  {snapshot.config.hasPublicKey ? "Webhook commands ready" : "Webhook commands pending"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bot className="h-4 w-4 text-primary" />
                    Server bootstrap
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    On join or via <code>/wox setup</code>, the bot can create the WOX-Bin category, support channels,
                    helper roles, and an announcement webhook.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquareMore className="h-4 w-4 text-primary" />
                    Live site bridge
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Published site announcements can fan out to configured guild webhooks, operators can create quick
                    hosted notes directly from Discord, and slash commands can run from the Vercel interactions endpoint.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <Card className="border-white/10 bg-white/[0.03]" key={card.label}>
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <Command className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Slash command bundle</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMANDS.map((command) => (
                  <span
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-foreground"
                    key={command}
                  >
                    {command}
                  </span>
                ))}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Use the bot to inspect live feed health, bootstrap a guild, mark one server as the site-ops mirror, publish
                urgent announcements, or drop a quick paste from Discord.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Bootstrap layout</p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Channels</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BOOTSTRAP_CHANNELS.map((channel) => (
                      <span className="rounded-full border border-white/10 px-3 py-1.5" key={channel}>
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground">Roles</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BOOTSTRAP_ROLES.map((role) => (
                      <span className="rounded-full border border-white/10 px-3 py-1.5" key={role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                Guild setup flow
              </div>
              <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>1. Invite the bot to your server.</li>
                <li>2. Set Discord’s Interactions Endpoint URL to <code>{snapshot.interactionEndpointUrl ?? "/api/discord/interactions"}</code>.</li>
                <li>3. Run <code>/wox setup</code> once.</li>
                <li>4. Use <code>/wox siteops enabled:true</code> in the one ops guild that should mirror site notices.</li>
              </ol>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Operator guardrails
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Sensitive commands stay behind the operator allowlist. Use a dedicated bot API key so you can revoke bot
                posting access without touching your personal workspace keys.
              </p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bot className="h-4 w-4 text-primary" />
                Control center
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                The Vercel app now includes an admin dashboard for invite status, guild linkage, webhook coverage, and
                rollout health.
              </p>
              {viewerIsAdmin ? (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/discord">Open admin dashboard</Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">The control dashboard is only available to signed-in admins.</p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4 text-primary" />
                Discord portal URLs
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Linked Roles Verification URL</p>
                  <p className="mt-2 break-all font-mono text-xs text-foreground">
                    {snapshot.linkedRolesVerificationUrl ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Terms of Service URL</p>
                  <p className="mt-2 break-all font-mono text-xs text-foreground">{snapshot.termsUrl ?? "Unavailable"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Privacy Policy URL</p>
                  <p className="mt-2 break-all font-mono text-xs text-foreground">
                    {snapshot.privacyUrl ?? "Unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Webhook Events Endpoint URL</p>
                  <p className="mt-2 break-all font-mono text-xs text-foreground">
                    {snapshot.webhookEventsUrl ?? "Unavailable"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Recommended Discord app settings
              </div>
              <ol className="space-y-2 text-sm leading-7 text-muted-foreground">
                <li>1. Keep <strong>Guild Install</strong> enabled so the bot can be added to servers.</li>
                <li>2. Leave <strong>User Install</strong> off unless you later build user-scoped Discord app flows.</li>
                <li>
                  3. Use Discord’s own invite URL for the main add-app flow, or set the optional custom install link to{" "}
                  <code>{snapshot.landingUrl ?? "/discord"}</code> if you want users to land on WOX-Bin’s bot page first.
                </li>
                <li>
                  4. Paste <code>{snapshot.interactionEndpointUrl ?? "/api/discord/interactions"}</code> into Interactions
                  Endpoint URL and <code>{snapshot.webhookEventsUrl ?? "/api/discord/events"}</code> into Webhooks Endpoint
                  URL.
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
