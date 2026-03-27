"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Link2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type InstallValue = {
  key: string;
  label: string;
  value: string | null;
};

type Props = {
  inviteUrl: string | null;
  landingUrl: string | null;
  interactionEndpointUrl: string | null;
  webhookEventsUrl: string | null;
  linkedRolesVerificationUrl: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  viewerIsAdmin?: boolean;
};

function CopyValueButton({
  copied,
  onCopy,
  disabled
}: {
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <Button disabled={disabled} onClick={onCopy} size="sm" type="button" variant="outline">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

function PortalValueRow({
  label,
  value,
  copied,
  onCopy
}: {
  label: string;
  value: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="mt-2 break-all font-mono text-xs text-foreground">{value ?? "Unavailable"}</p>
        </div>
        <CopyValueButton copied={copied} disabled={!value} onCopy={onCopy} />
      </div>
    </div>
  );
}

export function DiscordInstallFunnel({
  inviteUrl,
  landingUrl,
  interactionEndpointUrl,
  webhookEventsUrl,
  linkedRolesVerificationUrl,
  termsUrl,
  privacyUrl,
  viewerIsAdmin = false
}: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const portalValues: InstallValue[] = [
    { key: "landing", label: "Custom Install Link", value: landingUrl },
    { key: "interactions", label: "Interactions Endpoint URL", value: interactionEndpointUrl },
    { key: "events", label: "Webhooks Endpoint URL", value: webhookEventsUrl },
    { key: "linked-roles", label: "Linked Roles Verification URL", value: linkedRolesVerificationUrl },
    { key: "terms", label: "Terms of Service URL", value: termsUrl },
    { key: "privacy", label: "Privacy Policy URL", value: privacyUrl }
  ];

  const copyValue = async (key: string, value: string | null) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1800);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="px-3 py-1 text-xs">Install funnel</Badge>
            <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Discord onboarding</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Make the custom install link worth clicking.</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Send people here first, then let them launch the actual Discord add-app flow with the right context,
              portal URLs, and next commands already lined up.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {inviteUrl ? (
              <>
                <Button asChild size="lg">
                  <a href={inviteUrl} rel="noreferrer" target="_blank">
                    Add app in Discord
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <CopyValueButton copied={copiedKey === "invite"} onCopy={() => void copyValue("invite", inviteUrl)} />
              </>
            ) : (
              <Button disabled size="lg" type="button">
                Invite URL unavailable
              </Button>
            )}
            {viewerIsAdmin ? (
              <Button asChild size="lg" variant="secondary">
                <Link href="/admin/discord">Open admin dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="secondary">
                <Link href="/bookmarkfs/sync">Hosted sync</Link>
              </Button>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4 text-primary" />
              Official invite URL
            </div>
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{inviteUrl ?? "Unavailable"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 1</p>
              <p className="mt-2 text-sm font-medium text-foreground">Add the bot to your server</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the official Discord invite flow so permissions and app scopes stay correct.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 2</p>
              <p className="mt-2 text-sm font-medium text-foreground">Paste the portal URLs</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Copy the install, verification, interaction, webhook, terms, and privacy values from the panel here.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 3</p>
              <p className="mt-2 text-sm font-medium text-foreground">Run setup inside Discord</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start with <code>/wox setup</code>, then use <code>/wox help</code> and <code>/wox siteops</code>.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Recommended install settings
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              <li>Keep <strong>Guild Install</strong> on so the app can be added to servers.</li>
              <li>Leave <strong>User Install</strong> off unless you later build user-scoped flows.</li>
              <li>Use <code>{landingUrl ?? "/discord"}</code> as the custom install link if you want people to land here first.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            Copy-ready Discord portal values
          </div>
          <div className="space-y-3">
            {portalValues.map((item) => (
              <PortalValueRow
                copied={copiedKey === item.key}
                key={item.key}
                label={item.label}
                onCopy={() => void copyValue(item.key, item.value)}
                value={item.value}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
