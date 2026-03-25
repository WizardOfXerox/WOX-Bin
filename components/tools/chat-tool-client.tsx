"use client";

import { useMemo, useState } from "react";
import { Check, Clock3, Copy, ExternalLink, LockKeyhole, MessageCircleMore, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createShareKey, encryptJsonWithKey } from "@/lib/privacy-crypto";

const EXPIRY_OPTIONS = [
  { value: "1-day", label: "1 day" },
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "never", label: "Never" }
] as const;

export function ChatToolClient() {
  const [title, setTitle] = useState("");
  const [alias, setAlias] = useState("");
  const [message, setMessage] = useState("");
  const [expiresPreset, setExpiresPreset] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7-days");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const openingLength = useMemo(() => new Blob([message]).size, [message]);

  async function createRoom() {
    setBusy(true);
    setError("");
    setShareUrl("");
    try {
      if (!message.trim()) {
        setError("Add the opening message first.");
        return;
      }
      const key = createShareKey();
      const [encryptedTitle, encryptedMessage] = await Promise.all([
        encryptJsonWithKey(key, { title: title.trim() || "Untitled chat" }),
        encryptJsonWithKey(key, { alias: alias.trim() || "Guest", body: message.trim() })
      ]);

      const response = await fetch("/api/privacy/chats", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          titleCiphertext: encryptedTitle.ciphertext,
          titleIv: encryptedTitle.iv,
          firstMessageCiphertext: encryptedMessage.ciphertext,
          firstMessageIv: encryptedMessage.iv,
          expiresPreset
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error || "Chat room could not be created.");
        return;
      }

      setShareUrl(`${payload.url}#${key}`);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
      <Card className="overflow-hidden border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <MessageCircleMore className="size-4" />
              Encrypted chat
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary">Client-side encrypted</Badge>
              <Badge>Temporary room</Badge>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Start a temporary room that only participants can decrypt.</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Chat room titles and messages are encrypted in the browser before they are stored. Share the generated link
            with the fragment key intact so the other side can join the room.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
        <Card>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="chat-title">
                  Room title
                </label>
                <Input
                  id="chat-title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Release war room"
                  value={title}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="chat-expiry">
                  Expiry
                </label>
                <select
                  className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                  id="chat-expiry"
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

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="chat-alias">
                Your alias
              </label>
              <Input id="chat-alias" onChange={(event) => setAlias(event.target.value)} placeholder="Ops lead" value={alias} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="chat-message">
                Opening message
              </label>
              <Textarea
                id="chat-message"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="The build failed on staging. Here's what changed..."
                value={message}
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{openingLength.toLocaleString()} bytes</span>
                <span>First message ships encrypted with the room invite.</span>
              </div>
            </div>

            <Button disabled={busy} onClick={() => void createRoom()} type="button">
              <LockKeyhole className="size-4" />
              {busy ? "Encrypting room…" : "Create encrypted room"}
            </Button>

            {shareUrl ? (
              <div className="space-y-3 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
                <p className="text-sm font-medium">Chat room ready</p>
                <code className="block break-all text-xs text-primary/90">{shareUrl}</code>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void copyLink()} type="button">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copied" : "Copy invite"}
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={shareUrl} rel="noreferrer noopener" target="_blank">
                      Open room
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">How it works</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Private by link</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <div className="rounded-[1.25rem] border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  Browser-side encryption
                </div>
                <p className="mt-2">Room titles and messages are encrypted before upload. The server stores ciphertext only.</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Clock3 className="size-4 text-primary" />
                  Temporary rooms
                </div>
                <p className="mt-2">Use expiry presets when you need a short-lived room instead of a permanent thread.</p>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-background/60 px-4 py-3">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <MessageCircleMore className="size-4 text-primary" />
                  Reply-ready flow
                </div>
                <p className="mt-2">The room view supports inline replies, so handoffs and follow-ups stay attached to the right message.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
