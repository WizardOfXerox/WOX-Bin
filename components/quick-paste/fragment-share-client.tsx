"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, FileCode2, Link2, RefreshCcw, ShieldCheck, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES } from "@/lib/constants";

type FragmentPayload = {
  v: 1;
  title: string;
  language: string;
  content: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function cloneBytes(bytes: Uint8Array) {
  const cloned = new Uint8Array(bytes.byteLength);
  cloned.set(bytes);
  return cloned;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function maybeCompress(bytes: Uint8Array) {
  if (typeof CompressionStream === "undefined") {
    return { mode: "raw" as const, bytes };
  }
  const stream = new Blob([cloneBytes(bytes)]).stream().pipeThrough(new CompressionStream("gzip"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  if (compressed.byteLength >= bytes.byteLength) {
    return { mode: "raw" as const, bytes };
  }
  return { mode: "gz" as const, bytes: compressed };
}

async function maybeDecompress(mode: "raw" | "gz", bytes: Uint8Array) {
  if (mode !== "gz") {
    return bytes;
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open compressed fragment shares.");
  }
  const stream = new Blob([cloneBytes(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodeFragmentPayload(payload: FragmentPayload) {
  const raw = encoder.encode(JSON.stringify(payload));
  const compressed = await maybeCompress(raw);
  return `${compressed.mode}.${bytesToBase64Url(compressed.bytes)}`;
}

async function decodeFragmentPayload(hash: string) {
  const trimmed = hash.replace(/^#/, "").trim();
  if (!trimmed) {
    return null;
  }

  const [modeRaw, encoded] = trimmed.split(".", 2);
  const mode = modeRaw === "gz" ? "gz" : "raw";
  if (!encoded) {
    throw new Error("Fragment payload is incomplete.");
  }

  const bytes = await maybeDecompress(mode, base64UrlToBytes(encoded));
  const parsed = JSON.parse(decoder.decode(bytes)) as Partial<FragmentPayload>;
  if (parsed.v !== 1 || typeof parsed.content !== "string") {
    throw new Error("Fragment payload is invalid.");
  }

  return {
    v: 1,
    title: typeof parsed.title === "string" ? parsed.title : "",
    language: typeof parsed.language === "string" ? parsed.language : "none",
    content: parsed.content
  } satisfies FragmentPayload;
}

export function FragmentShareClient() {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("markdown");
  const [content, setContent] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFromFragment, setLoadedFromFragment] = useState(false);

  const estimatedSize = useMemo(() => new Blob([content]).size, [content]);

  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined" || !window.location.hash) {
        return;
      }
      try {
        const payload = await decodeFragmentPayload(window.location.hash);
        if (!payload) {
          return;
        }
        setTitle(payload.title);
        setLanguage(payload.language);
        setContent(payload.content);
        setLoadedFromFragment(true);
        setStatus("Loaded content from the URL fragment.");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Could not open the fragment share.");
      }
    })();
  }, []);

  async function buildShareUrl() {
    setBusy(true);
    setError(null);
    setStatus(null);

    try {
      const payload: FragmentPayload = {
        v: 1,
        title: title.trim(),
        language,
        content
      };
      const encoded = await encodeFragmentPayload(payload);
      const nextUrl = `${window.location.origin}/fragment#${encoded}`;
      window.history.replaceState(null, "", `/fragment#${encoded}`);
      setShareUrl(nextUrl);
      setLoadedFromFragment(true);
      setStatus("Fragment share link is ready. The server never receives the content.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create the fragment share.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareUrl() {
    const target = shareUrl || window.location.href;
    await navigator.clipboard.writeText(target);
    setStatus("Copied the fragment share URL.");
  }

  function resetEditor() {
    setTitle("");
    setLanguage("markdown");
    setContent("");
    setShareUrl("");
    setError(null);
    setStatus(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/fragment");
    }
    setLoadedFromFragment(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-violet-500/12 via-transparent to-cyan-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">No server storage</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Share text directly in the URL fragment.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              This route never sends the text to WOX-Bin. It packs the payload into the URL fragment so the receiver can open
              it directly in the browser.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Title</label>
                <Input onChange={(event) => setTitle(event.target.value)} placeholder="Fragment note" value={title} />
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
                placeholder="Write or paste content here."
                value={content}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge className="border-border bg-transparent text-muted-foreground">~{estimatedSize.toLocaleString()} bytes raw</Badge>
              {loadedFromFragment ? <Badge className="border-emerald-600/30 bg-emerald-600/10 text-emerald-100">Loaded from fragment</Badge> : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

            <div className="flex flex-wrap gap-3">
              <Button disabled={busy || !content.trim()} onClick={() => void buildShareUrl()} type="button">
                {busy ? "Encoding..." : "Create fragment share"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button disabled={!content.trim() && !shareUrl} onClick={() => void copyShareUrl()} type="button" variant="outline">
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button onClick={resetEditor} type="button" variant="ghost">
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Why use this</p>
                <p className="text-sm text-muted-foreground">Useful when you do not want the server to store the content at all.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Good for small snippets, one-off notes, or code examples.
              </li>
              <li className="flex gap-2">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                The server sees only the route; the content stays in the fragment.
              </li>
              <li className="flex gap-2">
                <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Pairs well with the full workspace when you need a quick, disposable share.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Related routes</p>
            <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/quick">
              <span>Quick paste</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link className="flex items-center justify-between rounded-xl border border-border px-3 py-3 hover:bg-muted/50" href="/clipboard">
              <span>Clipboard buckets</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
