"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type Props = {
  siteKey?: string | null;
};

type TurnstileWidgetContainer = HTMLDivElement & {
  __woxResetTurnstile?: () => void;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "compact" | "flexible";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __woxTurnstileLoadPromise?: Promise<void>;
  }
}

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__woxTurnstileLoadPromise) {
    return window.__woxTurnstileLoadPromise;
  }

  window.__woxTurnstileLoadPromise = new Promise<void>((resolve, reject) => {
    const finish = () => resolve();
    const fail = () => reject(new Error("Could not load Turnstile"));
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');

    if (existing) {
      if (window.turnstile) {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return window.__woxTurnstileLoadPromise;
}

export function readTurnstileToken(scope: ParentNode | Document = document): string {
  return (scope.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value ?? "";
}

export function resetTurnstileFields(scope: ParentNode | Document = document) {
  scope.querySelectorAll<HTMLElement>("[data-turnstile-widget-id]").forEach((node) => {
    const widget = node as TurnstileWidgetContainer;
    widget.__woxResetTurnstile?.();
  });
}

export function TurnstileField({ siteKey }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<TurnstileWidgetContainer | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [scale, setScale] = useState(1);
  const resolvedSiteKey = siteKey ?? "";

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateScale = () => {
      const nextScale = Math.min(1, Math.max(0.7, shell.clientWidth / 300));
      setScale(Number.isFinite(nextScale) ? nextScale : 1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!resolvedSiteKey || !widgetRef.current) {
      return;
    }

    let cancelled = false;
    const widgetEl = widgetRef.current;

    const resetWidget = () => {
      setToken("");
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile?.reset) {
        window.turnstile.reset(widgetId);
      }
    };

    widgetEl.__woxResetTurnstile = resetWidget;

    const handlePageShow = () => resetWidget();

    async function mountWidget() {
      await ensureTurnstileScript();
      if (cancelled || !widgetRef.current || !window.turnstile) {
        return;
      }

      widgetRef.current.innerHTML = "";
      const widgetId = window.turnstile.render(widgetRef.current, {
        sitekey: resolvedSiteKey,
        theme: "auto",
        size: "normal",
        callback: (nextToken) => setToken(nextToken),
        "expired-callback": () => setToken(""),
        "timeout-callback": () => setToken(""),
        "error-callback": () => setToken("")
      });

      widgetIdRef.current = widgetId;
      widgetRef.current.dataset.turnstileWidgetId = widgetId;
    }

    void mountWidget();
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
      delete widgetEl.__woxResetTurnstile;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [resolvedSiteKey]);

  const shellStyle = useMemo(
    () =>
      ({
        height: `${Math.round(65 * scale)}px`
      }) satisfies CSSProperties,
    [scale]
  );

  const widgetStyle = useMemo(
    () =>
      ({
        transform: `scale(${scale})`,
        width: "300px"
      }) satisfies CSSProperties,
    [scale]
  );

  if (!resolvedSiteKey) {
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
    <div className="w-full max-w-full min-w-0">
      <div
        className="relative w-full min-w-0 overflow-visible"
        ref={shellRef}
        style={shellStyle}
      >
        <div
          className="origin-left overflow-visible"
          ref={widgetRef}
          style={widgetStyle}
        />
      </div>
      <input name="cf-turnstile-response" type="hidden" value={token} />
    </div>
  );
}
