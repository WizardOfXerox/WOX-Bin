"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPrivacyRedirectHref, isPrivacyRedirectEligibleHref } from "@/lib/outbound-links";

export function NorefToolClient() {
  const [rawUrl, setRawUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generatedUrl = useMemo(() => {
    const trimmed = rawUrl.trim();
    if (!trimmed || !isPrivacyRedirectEligibleHref(trimmed)) {
      return "";
    }
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return origin ? `${origin}${buildPrivacyRedirectHref(trimmed)}` : "";
  }, [rawUrl]);

  async function copyLink() {
    if (!generatedUrl) {
      return;
    }
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Link2 className="size-4" />
            NoRef generator
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create shareable links that hide the referring page.</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            WOX-Bin already uses an internal privacy redirect for outbound links. This tool exposes it directly so you
            can generate a cleaner share URL for any public HTTP or HTTPS link.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="noref-url">
              Destination URL
            </label>
            <Input
              id="noref-url"
              onChange={(event) => setRawUrl(event.target.value)}
              placeholder="https://example.com/article"
              value={rawUrl}
            />
          </div>

          {rawUrl.trim() && !generatedUrl ? (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Enter a valid external http:// or https:// URL. Internal WOX-Bin links do not need the redirect.
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">Generated redirect</p>
            <div className="rounded-[1.25rem] border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
              {generatedUrl || "Paste a destination URL above to generate a NoRef link."}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={!generatedUrl} onClick={() => void copyLink()} type="button">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button asChild disabled={!generatedUrl} type="button" variant="outline">
              <a href={generatedUrl || "#"} rel="noreferrer noopener" target="_blank">
                Open redirect
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
