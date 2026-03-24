"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Lock, MessageCircleMore, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { decryptJsonWithKey, encryptJsonWithKey } from "@/lib/privacy-crypto";
import { formatDate } from "@/lib/utils";

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
};

export function ChatRoomClient({ slug }: { slug: string }) {
  const [key, setKey] = useState(() => (typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "").trim()));
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [title, setTitle] = useState("Encrypted chat");
  const [messages, setMessages] = useState<(MessagePayload & { id: string; createdAt: string })[]>([]);
  const [alias, setAlias] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
    const encrypted = await encryptJsonWithKey(key.trim(), {
      alias: alias.trim() || "Guest",
      body: body.trim()
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
    const refresh = await fetch(`/api/privacy/chats/${slug}`, { cache: "no-store" });
    const roomPayload = (await refresh.json()) as RoomResponse;
    setRoom(roomPayload);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <MessageCircleMore className="size-4" />
            Encrypted chat room
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            {room ? `${room.messageCount.toLocaleString()} message${room.messageCount === 1 ? "" : "s"} · updated ${formatDate(room.lastMessageAt)}` : "Loading room…"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading encrypted room…</p>
            ) : (
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                    Unlock the room with the fragment key to view messages.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3" key={message.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{message.alias}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{message.body}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="chat-key">
                  Room key
                </label>
                <Input id="chat-key" onChange={(event) => setKey(event.target.value)} placeholder="Paste the fragment key" value={key} />
              </div>
              <Button disabled={!inviteUrl} onClick={() => void copyInvite()} type="button" variant="outline">
                <Copy className="size-4" />
                {copied ? "Copied invite" : "Copy invite"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4 text-primary" />
                Send message
              </div>
              <Input onChange={(event) => setAlias(event.target.value)} placeholder="Alias" value={alias} />
              <Textarea onChange={(event) => setBody(event.target.value)} placeholder="Type an encrypted message" value={body} />
              <Button disabled={!key.trim() || !body.trim()} onClick={() => void sendMessage()} type="button">
                <Send className="size-4" />
                Send
              </Button>
            </CardContent>
          </Card>

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
