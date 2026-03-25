"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link as LinkIcon, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
            Unlike the standard NoRef generator, this stores a short redirect slug on WOX-Bin and sends visitors
            through a no-referrer handoff before opening the external destination.
          </p>
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

          <Button disabled={busy || !destinationUrl.trim()} onClick={() => void createShortLink()} type="button">
            <LinkIcon className="size-4" />
            {busy ? "Creating short link…" : "Create short link"}
          </Button>

          {shortUrl ? (
            <div className="space-y-4 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
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
          ) : null}

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
