"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, CornerDownRight, Lock, MessageCircleMore, Send, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { decryptJsonWithKey, encryptJsonWithKey } from "@/lib/privacy-crypto";
import { cn, formatDate } from "@/lib/utils";

type RoomResponse = {
  slug: string;
  titleCiphertext: string;
  titleIv: string;
  expiresAt: string | null;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  messages: {
    id: string;
    payloadCiphertext: string;
    payloadIv: string;
    createdAt: string;
  }[];
};

type MessagePayload = {
  alias: string;
  body: string;
  replyToId?: string | null;
  replyToAlias?: string | null;
  replyToBody?: string | null;
};

type DecryptedMessage = MessagePayload & {
  id: string;
  createdAt: string;
};

export function ChatRoomClient({ slug }: { slug: string }) {
  const [key, setKey] = useState("");
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [title, setTitle] = useState("Encrypted chat");
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [alias, setAlias] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setKey(window.location.hash.replace(/^#/, "").trim());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      const response = await fetch(`/api/privacy/chats/${slug}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { error?: string } & Partial<RoomResponse>;
      if (!response.ok) {
        if (!cancelled) {
          setError(payload?.error || "Chat room could not be loaded.");
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setRoom(payload as RoomResponse);
        setLoading(false);
      }
    }

    void loadRoom();
    const timer = window.setInterval(() => void loadRoom(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function decryptRoom() {
      if (!room || !key.trim()) {
        return;
      }
      try {
        const nextTitle = await decryptJsonWithKey<{ title: string }>(key.trim(), {
          ciphertext: room.titleCiphertext,
          iv: room.titleIv
        });
        const nextMessages = await Promise.all(
          room.messages.map(async (message) => {
            const payload = await decryptJsonWithKey<MessagePayload>(key.trim(), {
              ciphertext: message.payloadCiphertext,
              iv: message.payloadIv
            });
            return {
              ...payload,
              id: message.id,
              createdAt: message.createdAt
            };
          })
        );
        if (!cancelled) {
          setTitle(nextTitle.title || "Encrypted chat");
          setMessages(nextMessages);
          setReplyTargetId((current) => (current && !nextMessages.some((message) => message.id === current) ? null : current));
          setError("");
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
          setError("This key cannot decrypt the room. Check the invite link fragment.");
        }
      }
    }

    void decryptRoom();
    return () => {
      cancelled = true;
    };
  }, [key, room]);

  const inviteUrl = useMemo(() => {
    if (!key.trim()) {
      return "";
    }
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return origin ? `${origin}/chat/${slug}#${key.trim()}` : "";
  }, [key, slug]);

  const replyTarget = useMemo(
    () => (replyTargetId ? messages.find((message) => message.id === replyTargetId) ?? null : null),
    [messages, replyTargetId]
  );

  useEffect(() => {
    if (!messages.length) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      streamRef.current?.scrollTo({
        top: streamRef.current.scrollHeight,
        behavior: "smooth"
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length]);

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function sendMessage() {
    if (!key.trim() || !body.trim()) {
      return;
    }

    setSending(true);
    try {
      const encrypted = await encryptJsonWithKey(key.trim(), {
        alias: alias.trim() || "Guest",
        body: body.trim(),
        replyToId: replyTarget?.id ?? null,
        replyToAlias: replyTarget?.alias ?? null,
        replyToBody: replyTarget?.body ? replyTarget.body.slice(0, 180) : null
      });
      const response = await fetch(`/api/privacy/chats/${slug}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          payloadCiphertext: encrypted.ciphertext,
          payloadIv: encrypted.iv
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "Message could not be sent.");
        return;
      }

      setBody("");
      setReplyTargetId(null);
      const refresh = await fetch(`/api/privacy/chats/${slug}`, { cache: "no-store" });
      const roomPayload = (await refresh.json()) as RoomResponse;
      setRoom(roomPayload);
      setError("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <MessageCircleMore className="size-4" />
              Encrypted chat room
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary">Ciphertext only</Badge>
              <Badge>{room?.messageCount.toLocaleString() ?? 0} messages</Badge>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Keep the fragment key intact when you share the invite. WOX-Bin stores only encrypted room titles and
            encrypted message payloads.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{room ? `Updated ${formatDate(room.lastMessageAt)}` : "Loading room…"}</span>
            {room?.expiresAt ? <span>Expires {formatDate(room.expiresAt)}</span> : <span>No expiry set</span>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_22rem]">
        <Card className="overflow-hidden">
          <CardContent className="flex h-full flex-col gap-4 p-0">
            <div className="border-b border-border/80 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Room stream</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {loading
                      ? "Decrypting room…"
                      : messages.length > 0
                        ? `${messages.length.toLocaleString()} decrypted message${messages.length === 1 ? "" : "s"}`
                        : "Unlock the room with the fragment key to view messages."}
                  </p>
                </div>
                <Button disabled={!inviteUrl} onClick={() => void copyInvite()} type="button" variant="outline">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied invite" : "Copy invite"}
                </Button>
              </div>
            </div>

            <div
              className="workspace-scrollbar-hide min-h-[26rem] flex-1 space-y-3 overflow-y-auto px-4 pb-4 sm:px-6"
              ref={streamRef}
            >
              {loading ? (
                <p className="px-1 pt-2 text-sm text-muted-foreground">Loading encrypted room…</p>
              ) : messages.length === 0 ? (
                <div className="mt-2 rounded-[1.5rem] border border-dashed border-border bg-background/60 px-5 py-8 text-sm text-muted-foreground">
                  Paste the fragment key to decrypt the timeline, then send your first reply.
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwnAlias =
                    alias.trim().length > 0 && message.alias.trim().toLowerCase() === alias.trim().toLowerCase();
                  const referencedMessage =
                    message.replyToId != null ? messages.find((entry) => entry.id === message.replyToId) ?? null : null;

                  return (
                    <article
                      className={cn(
                        "rounded-[1.5rem] border px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-colors",
                        isOwnAlias ? "border-primary/25 bg-primary/10" : "border-white/10 bg-white/[0.03]"
                      )}
                      key={message.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{message.alias}</p>
                            {index === 0 ? <Badge>Room opener</Badge> : null}
                            {isOwnAlias ? <Badge className="border-primary/25 bg-primary/10 text-primary">You</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                        </div>
                        <Button
                          className="shrink-0"
                          onClick={() => {
                            setReplyTargetId(message.id);
                            composerRef.current?.focus();
                          }}
                          size="sm"
                          type="button"
                          variant={replyTargetId === message.id ? "secondary" : "ghost"}
                        >
                          <CornerDownRight className="size-4" />
                          {replyTargetId === message.id ? "Replying" : "Reply"}
                        </Button>
                      </div>

                      {message.replyToAlias || referencedMessage ? (
                        <button
                          className="mt-3 block w-full rounded-[1rem] border border-border/80 bg-background/70 px-3 py-2 text-left transition hover:border-primary/25 hover:bg-background"
                          onClick={() => {
                            const nextId = message.replyToId || referencedMessage?.id;
                            const el = nextId ? document.getElementById(`chat-message-${nextId}`) : null;
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          type="button"
                        >
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            Replying to {referencedMessage?.alias || message.replyToAlias}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {referencedMessage?.body || message.replyToBody || "Referenced message"}
                          </p>
                        </button>
                      ) : null}

                      <p
                        className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground"
                        id={`chat-message-${message.id}`}
                      >
                        {message.body}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Access</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">Decrypt this room</h2>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="chat-key">
                  Room key
                </label>
                <Input id="chat-key" onChange={(event) => setKey(event.target.value)} placeholder="Paste the fragment key" value={key} />
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Without the fragment key, messages stay as ciphertext on the server and cannot be rendered here.
              </p>
              {inviteUrl ? (
                <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Invite</p>
                  <code className="mt-2 block break-all text-xs text-foreground">{inviteUrl}</code>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="size-4 text-primary" />
                    Send encrypted reply
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Every message is encrypted in the browser before it leaves this page.
                  </p>
                </div>
                <ShieldCheck className="mt-1 size-5 text-primary/80" />
              </div>

              <Input onChange={(event) => setAlias(event.target.value)} placeholder="Alias" value={alias} />

              {replyTarget ? (
                <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-primary/90">Replying to {replyTarget.alias}</p>
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{replyTarget.body}</p>
                    </div>
                    <Button onClick={() => setReplyTargetId(null)} size="sm" type="button" variant="ghost">
                      Clear
                    </Button>
                  </div>
                </div>
              ) : null}

              <Textarea
                onChange={(event) => setBody(event.target.value)}
                placeholder="Type an encrypted message"
                ref={composerRef}
                value={body}
              />
              <Button disabled={!key.trim() || !body.trim() || sending} onClick={() => void sendMessage()} type="button">
                <Send className="size-4" />
                {sending ? "Encrypting…" : replyTarget ? "Send reply" : "Send message"}
              </Button>
            </CardContent>
          </Card>

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
