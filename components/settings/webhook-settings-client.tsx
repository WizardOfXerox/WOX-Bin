"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { getWebhookSettingsForUser } from "@/lib/webhooks";

type WebhookSnapshot = Awaited<ReturnType<typeof getWebhookSettingsForUser>>;

type Props = {
  initial: WebhookSnapshot;
};

export function WebhookSettingsClient({ initial }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [webhookUrl, setWebhookUrl] = useState(initial.webhookUrl ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function saveWebhook() {
    setSaving(true);
    setStatus(null);
    setError(null);

    const response = await fetch("/api/settings/webhook", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        webhookUrl
      })
    });

    const body = (await response.json().catch(() => null)) as WebhookSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not save the webhook.");
      setSaving(false);
      return;
    }

    setSnapshot(body);
    setWebhookUrl(body.webhookUrl ?? "");
    setStatus(body.webhookUrl ? "Saved the webhook destination." : "Webhook destination cleared.");
    setSaving(false);
  }

  async function testWebhook() {
    setTesting(true);
    setStatus(null);
    setError(null);

    const response = await fetch("/api/settings/webhook", {
      method: "POST"
    });

    const body = (await response.json().catch(() => null)) as { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Webhook test failed.");
      setTesting(false);
      return;
    }

    setStatus("Sent a webhook test event.");
    setTesting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Outgoing events</p>
              <h2 className="mt-2 text-2xl font-semibold">Webhooks</h2>
            </div>
            <Badge
              className={
                snapshot.available
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-white/15 bg-transparent text-muted-foreground"
              }
            >
              {snapshot.available ? "Enabled on this plan" : "Upgrade to Pro or Team"}
            </Badge>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            WOX-Bin can POST JSON events when pastes are created, updated, or deleted, plus billing and team events.
          </p>
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Destination URL</span>
            <Input
              disabled={!snapshot.available}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://example.com/hooks/woxbin"
              value={webhookUrl}
            />
          </label>
          {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button disabled={!snapshot.available || saving} onClick={() => void saveWebhook()} type="button">
              {saving ? "Saving..." : "Save webhook"}
            </Button>
            <Button
              disabled={!snapshot.available || !snapshot.webhookUrl || testing}
              onClick={() => void testWebhook()}
              type="button"
              variant="outline"
            >
              {testing ? "Sending test..." : "Send test event"}
            </Button>
          </div>
          {!snapshot.available ? (
            <div className="rounded-[1rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
              Webhooks are locked on the current plan. Upgrade to Pro or Team from Billing to configure them.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
