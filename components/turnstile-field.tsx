"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

type Props = {
  siteKey?: string | null;
};

export function TurnstileField({ siteKey }: Props) {
  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }, [siteKey]);

  if (!siteKey) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground",
          "dark:bg-black/20"
        )}
      >
        <p className="font-medium text-foreground/90">Turnstile is not configured</p>
        <p className="mt-2">
          The app needs a Cloudflare Turnstile <strong>site key</strong> to show the challenge widget. Add{" "}
          <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.65rem] dark:bg-black/40">
            NEXT_PUBLIC_TURNSTILE_SITE_KEY
          </code>{" "}
          and{" "}
          <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.65rem] dark:bg-black/40">
            TURNSTILE_SECRET_KEY
          </code>{" "}
          to <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.65rem] dark:bg-black/40">.env.local</code>,
          restart the dev server, then refresh. In <strong>production</strong>, both keys are required for registration and
          anonymous publish; in local dev the server may allow requests without a secret only when{" "}
          <code className="font-mono text-[0.65rem]">NODE_ENV</code> is not production.
        </p>
        <p className="mt-2">
          <a
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="https://developers.cloudflare.com/turnstile/get-started/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Cloudflare Turnstile setup
          </a>
          <span aria-hidden> · </span>
          <span className="text-muted-foreground">Repo guide: </span>
          <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.65rem] dark:bg-black/40">docs/TURNSTILE.md</code>
        </p>
      </div>
    );
  }

  return (
    <div
      className="cf-turnstile"
      data-sitekey={siteKey}
      data-theme="auto"
      data-size="flexible"
    />
  );
}
