"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clipboard, Copy, ExternalLink, FileLock2, Flame, Link2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/constants";

type PublishResponse = {
  paste: {
    slug: string;
    secretMode: boolean;
  };
};

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "unlisted", label: "Unlisted" }
] as const;

export function QuickPasteClient() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("markdown");
  const [visibility, setVisibility] = useState<(typeof VISIBILITY_OPTIONS)[number]["value"]>("unlisted");
  const [secretMode, setSecretMode] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  async function handlePublish() {
    setLoading(true);
    setError(null);
    setPublishedUrl(null);

    try {
      const response = await fetch("/api/public/pastes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: title.trim() || "Quick paste",
          content,
          language,
          visibility: secretMode ? "unlisted" : visibility,
          password: password.trim() || null,
          secretMode,
          burnAfterRead,
          captchaRequired,
          burnAfterViews: 0,
          tags: [],
          folderName: null,
          category: null,
          files: [],
          turnstileToken: readTurnstileToken()
        })
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | PublishResponse | null;
      if (!response.ok || !body || !("paste" in body)) {
        setError(body && "error" in body ? body.error ?? "Could not publish the paste." : "Could not publish the paste.");
        return;
      }

      const nextUrl = `${window.location.origin}/${body.paste.secretMode ? "s" : "p"}/${body.paste.slug}`;
      setPublishedUrl(nextUrl);
    } catch {
      setError("Could not publish the paste.");
    } finally {
      resetTurnstileFields();
      setLoading(false);
    }
  }

  async function copyPublishedUrl() {
    if (!publishedUrl) {
      return;
    }
    await navigator.clipboard.writeText(publishedUrl);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-cyan-500/12 via-transparent to-emerald-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">Quick paste</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Publish fast without opening the full workspace.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This route is for fast plaintext text and code sharing. If you need zero-knowledge secret links, encrypted
              clipboard handoff, fragment-only shares, or encrypted file vaults, use the dedicated quick-share routes in the
              hub beside this editor.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Title</label>
                <Input onChange={(event) => setTitle(event.target.value)} placeholder="Quick paste" value={title} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Language</label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  {LANGUAGES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Content</label>
              <Textarea
                className="min-h-[20rem] font-mono text-[13px]"
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste text, code, notes, or a temporary secret."
                value={content}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Visibility</label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                  disabled={secretMode}
                  onChange={(event) => setVisibility(event.target.value as "public" | "unlisted")}
                  value={secretMode ? "unlisted" : visibility}
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 rounded-[1.25rem] border border-dashed border-border bg-muted/25 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Custom URL</p>
                <p className="text-sm text-foreground">Reserved for Pro and Team accounts</p>
                <p className="text-xs leading-6 text-muted-foreground">
                  Quick paste keeps anonymous sharing simple. If you need a custom path, open the full workspace and save
                  from a paid account.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                <input
                  checked={secretMode}
                  className="mt-1 size-4 accent-primary"
                  onChange={(event) => {
                    setSecretMode(event.target.checked);
                    if (event.target.checked) {
                      setVisibility("unlisted");
                    }
                  }}
                  type="checkbox"
                />
                <span className="leading-snug">
                  Secret link mode
                  <span className="mt-1 block text-xs text-muted-foreground">Uses `/s/...` and stays out of archive and feed.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                <input
                  checked={captchaRequired}
                  className="mt-1 size-4 accent-primary"
                  onChange={(event) => setCaptchaRequired(event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-snug">
                  Require Turnstile
                  <span className="mt-1 block text-xs text-muted-foreground">Adds a human check before the content is shown.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                <input
                  checked={burnAfterRead}
                  className="mt-1 size-4 accent-primary"
                  onChange={(event) => setBurnAfterRead(event.target.checked)}
                  type="checkbox"
                />
                <span className="leading-snug">
                  Burn after read
                  <span className="mt-1 block text-xs text-muted-foreground">Good for one-time handoff and temporary credentials.</span>
                </span>
              </label>
              <div className="space-y-2 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3">
                <label className="block text-xs uppercase tracking-[0.24em] text-muted-foreground">Optional password</label>
                <Input
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Protect this paste"
                  type="password"
                  value={password}
                />
              </div>
            </div>

            <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={loading || !content.trim()} onClick={() => void handlePublish()} type="button">
                {loading ? "Publishing..." : "Publish quick paste"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {publishedUrl ? (
                <>
                  <Button onClick={() => void copyPublishedUrl()} type="button" variant="outline">
                    <Copy className="h-4 w-4" />
                    Copy link
                  </Button>
                  <Button asChild type="button" variant="secondary">
                    <Link href={publishedUrl}>
                      Open
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Fast paths</p>
                <p className="text-sm text-muted-foreground">Use the right tool for the kind of share you need.</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/secret">
                <span className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  Encrypted secret link
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/fragment">
                <span className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  Fragment share
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/clipboard">
                <span className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-primary" />
                  Clipboard buckets
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/vault">
                <span className="flex items-center gap-2">
                  <FileLock2 className="h-4 w-4 text-primary" />
                  Encrypted file vault
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/app">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Full workspace
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium text-foreground">Best use cases</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Plain quick snippets or incident notes that do not need a full workspace session.
              </li>
              <li className="flex gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Zero-knowledge handoff belongs in the encrypted secret link or file vault flows.
              </li>
              <li className="flex gap-2">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Clipboard buckets and fragment shares cover the lightweight browser-to-browser cases.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
