"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MigrateResponse = {
  ok?: boolean;
  imported?: number;
  failed?: { key: string; title: string; error: string }[];
  slugs?: string[];
  stoppedByLimit?: boolean;
  error?: string | Record<string, unknown>;
};

export function PastebinMigrateSettingsClient() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [limit, setLimit] = useState(100);
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrateResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/migrate/pastebin");
        const data = (await res.json().catch(() => null)) as {
          enabled?: boolean;
          hint?: string | null;
          error?: string;
        };
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setEnabled(false);
          setHint(null);
          setFetchError(typeof data?.error === "string" ? data.error : "Could not load migration status.");
          return;
        }
        setEnabled(Boolean(data?.enabled));
        setHint(typeof data?.hint === "string" ? data.hint : null);
      } catch {
        if (!cancelled) {
          setEnabled(false);
          setFetchError("Could not load migration status.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runMigrate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setFetchError(null);

    const res = await fetch("/api/migrate/pastebin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password,
        limit: Math.min(500, Math.max(1, Math.floor(limit))),
        folderName: folderName.trim() || null
      })
    });

    const body = (await res.json().catch(() => null)) as MigrateResponse;
    setLoading(false);

    if (!res.ok) {
      const err = body?.error;
      const msg =
        typeof err === "string"
          ? err
          : err && typeof err === "object"
            ? JSON.stringify(err)
            : `Request failed (${res.status})`;
      setResult({ error: msg });
      return;
    }

    setResult(body);
    setPassword("");
  }

  if (enabled === null) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <h3 className="font-semibold">Migration not available</h3>
          <div className="mt-2 space-y-2 text-muted-foreground">
            <p>
              The server admin must set <code className="rounded bg-muted px-1 py-0.5 text-xs">PASTEBIN_API_DEV_KEY</code>{" "}
              (your Pastebin API developer key). Credentials you enter here are only used for the request and are not
              stored.
            </p>
            {hint ? <p className="text-xs">{hint}</p> : null}
            <p className="text-xs">See docs/PASTEBIN-MIGRATE.md in the repository for setup steps.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetchError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <h3 className="font-semibold">Error</h3>
          <p className="mt-1">{fetchError}</p>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Integrations</p>
            <h2 className="mt-2 text-2xl font-semibold">Import from Pastebin</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Sign in to Pastebin with your username and password once. We fetch your paste list and raw contents over
              Pastebin&apos;s API and create new pastes in your WOX-Bin account. Your Pastebin password is not saved.
            </p>
          </div>

          <form className="max-w-md space-y-4" onSubmit={runMigrate}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pb-user">
                Pastebin username
              </label>
              <Input
                autoComplete="username"
                id="pb-user"
                onChange={(ev) => setUsername(ev.target.value)}
                required
                value={username}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pb-pass">
                Pastebin password
              </label>
              <Input
                autoComplete="current-password"
                id="pb-pass"
                onChange={(ev) => setPassword(ev.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pb-limit">
                Max pastes to import (1–500)
              </label>
              <Input
                id="pb-limit"
                max={500}
                min={1}
                onChange={(ev) => setLimit(Number(ev.target.value))}
                type="number"
                value={limit}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pb-folder">
                WOX-Bin folder (optional)
              </label>
              <Input
                id="pb-folder"
                onChange={(ev) => setFolderName(ev.target.value)}
                placeholder="e.g. Pastebin import (optional)"
                value={folderName}
              />
              <p className="text-xs text-muted-foreground">Created if it does not exist. Leave empty for no folder.</p>
            </div>
            <Button disabled={loading} type="submit">
              {loading ? "Importing…" : "Start import"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {result.error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <h3 className="font-semibold">Import failed</h3>
                <p className="mt-1">{typeof result.error === "string" ? result.error : JSON.stringify(result.error)}</p>
              </div>
            ) : (
              <>
                <p className="font-medium">
                  Imported {result.imported ?? 0} paste(s)
                  {result.stoppedByLimit ? " (stopped: plan or paste limit reached)" : ""}.
                </p>
                {result.failed && result.failed.length > 0 ? (
                  <div className="text-sm">
                    <p className="mb-2 font-medium text-destructive">Some pastes failed:</p>
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {result.failed.map((f) => (
                        <li key={f.key}>
                          {f.title || f.key}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.slugs && result.slugs.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Open your workspace to see new pastes, or browse recent slugs:{" "}
                    {result.slugs.slice(0, 5).map((s, i) => (
                      <span key={s}>
                        {i > 0 ? ", " : ""}
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/p/${s}`}>
                          {s}
                        </Link>
                      </span>
                    ))}
                    {result.slugs.length > 5 ? "…" : ""}
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
