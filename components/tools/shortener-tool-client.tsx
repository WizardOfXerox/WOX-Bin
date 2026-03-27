"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link as LinkIcon, Scissors, ShieldCheck, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildPrivacyRedirectHref, isPrivacyRedirectEligibleHref } from "@/lib/outbound-links";

const EXPIRY_OPTIONS = [
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "never", label: "Never" }
] as const;

export function ShortenerToolClient() {
  const [destinationUrl, setDestinationUrl] = useState("");
  const [expiresPreset, setExpiresPreset] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("30-days");
  const [shortUrl, setShortUrl] = useState("");
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [directCopied, setDirectCopied] = useState(false);

  const directRedirectUrl = useMemo(() => {
    const trimmed = destinationUrl.trim();
    if (!trimmed || !isPrivacyRedirectEligibleHref(trimmed)) {
      return "";
    }
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return origin ? `${origin}${buildPrivacyRedirectHref(trimmed)}` : "";
  }, [destinationUrl]);

  async function createShortLink() {
    setBusy(true);
    setError("");
    setShortUrl("");
    setResolvedUrl("");

    try {
      const response = await fetch("/api/privacy/short-links", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          destinationUrl,
          expiresPreset
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            url?: string;
            destinationUrl?: string;
          }
        | null;

      if (!response.ok || !payload?.url) {
        setError(payload?.error || "Short link could not be created.");
        return;
      }

      setShortUrl(payload.url);
      setResolvedUrl(payload.destinationUrl ?? destinationUrl.trim());
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shortUrl) {
      return;
    }
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyDirectLink() {
    if (!directRedirectUrl) {
      return;
    }
    await navigator.clipboard.writeText(directRedirectUrl);
    setDirectCopied(true);
    window.setTimeout(() => setDirectCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <Card className="overflow-hidden border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Scissors className="size-4" />
            Privacy shortener
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create a shorter WOX-Bin redirect that keeps the destination private.</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Use a direct privacy redirect when you do not need storage, or create a short slug when you want a cleaner share URL.
            Both routes hand visitors through WOX-Bin&apos;s no-referrer interstitial before the external destination opens.
          </p>
          <div className="grid gap-3 pt-2 md:grid-cols-3">
            <div className="rounded-[1.1rem] border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Direct redirect</p>
              <p className="mt-2 text-sm text-muted-foreground">No short link created, nothing stored, just a clean no-referrer handoff.</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Stored short link</p>
              <p className="mt-2 text-sm text-muted-foreground">Create a smaller `/go/...` link with expiry control for easier sharing.</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-background/55 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Safety handoff</p>
              <p className="mt-2 text-sm text-muted-foreground">Outbound links open through the privacy interstitial with a VirusTotal lookup option.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shortener-url">
                Destination URL
              </label>
              <Input
                id="shortener-url"
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://example.com/report"
                value={destinationUrl}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shortener-expiry">
                Expiry
              </label>
              <select
                className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                id="shortener-expiry"
                onChange={(event) => setExpiresPreset(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])}
                value={expiresPreset}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {destinationUrl.trim() && !directRedirectUrl ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Enter a valid external http:// or https:// URL. Internal WOX-Bin links do not need this tool.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-[1.35rem] border border-border bg-background/60 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Waypoints className="size-4 text-primary" />
                Direct redirect
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Similar to a classic NoRef flow: no saved slug, no stored destination, just an outbound handoff URL.
              </p>
              <div className="mt-4 rounded-[1rem] border border-border bg-background/80 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Generated redirect</p>
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {directRedirectUrl || "Paste a destination URL above to build an instant privacy redirect."}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={!directRedirectUrl} onClick={() => void copyDirectLink()} type="button">
                  {directCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {directCopied ? "Copied" : "Copy redirect"}
                </Button>
                <Button asChild disabled={!directRedirectUrl} type="button" variant="outline">
                  <a href={directRedirectUrl || "#"} rel="noreferrer noopener" target="_blank">
                    Open redirect
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-primary/20 bg-primary/10 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <LinkIcon className="size-4" />
                Stored short link
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Store a short slug on WOX-Bin with expiry control, then send visitors through the same privacy redirect flow.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button disabled={busy || !destinationUrl.trim()} onClick={() => void createShortLink()} type="button">
                  <LinkIcon className="size-4" />
                  {busy ? "Creating short link…" : "Create short link"}
                </Button>
              </div>

              {shortUrl ? (
                <div className="mt-4 space-y-4 rounded-[1.1rem] border border-primary/20 bg-background/55 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Short link ready</p>
                    <code className="block break-all text-xs text-primary/90">{shortUrl}</code>
                  </div>
                  <div className="rounded-[1rem] border border-border bg-background/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Destination</p>
                    <p className="mt-2 break-all text-sm text-muted-foreground">{resolvedUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => void copyLink()} type="button">
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? "Copied" : "Copy short link"}
                    </Button>
                    <Button asChild type="button" variant="outline">
                      <a href={shortUrl} rel="noreferrer noopener" target="_blank">
                        Open short link
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-primary/25 bg-background/45 px-4 py-4 text-sm text-muted-foreground">
                  Generate a stored short link here when you want a smaller share URL than the direct `/out?to=...` redirect.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-border bg-background/55 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                HTTPS handoff
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Redirects stay on WOX-Bin first, so the original page is not leaked as a referrer.</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-background/55 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Scissors className="size-4 text-primary" />
                NoRef-style option
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Use the direct redirect block above when you want the anonymous no-storage flow.</p>
            </div>
            <div className="rounded-[1rem] border border-border bg-background/55 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ExternalLink className="size-4 text-primary" />
                Safety interstitial
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Outgoing links now land on WOX-Bin&apos;s privacy handoff with a VirusTotal lookup option before they continue.</p>
            </div>
          </div>

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
