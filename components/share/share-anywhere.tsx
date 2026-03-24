"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Send, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ShareAnywhereBaseProps = {
  title: string;
  url: string;
  text?: string;
  rawUrl?: string;
  className?: string;
};

type ShareAnywhereDialogProps = ShareAnywhereBaseProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShareTarget = {
  label: string;
  href: string;
  description: string;
};

function buildShareTargets(title: string, url: string, text: string): ShareTarget[] {
  const combinedText = text.trim() ? `${text.trim()} ${url}` : url;

  return [
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`.trim())}`,
      description: "Compose an email with the link"
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(combinedText)}`,
      description: "Send in WhatsApp"
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      description: "Send in Telegram"
    },
    {
      label: "X",
      href: `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      description: "Post on X"
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      description: "Share on Facebook"
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      description: "Submit to Reddit"
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      description: "Post on LinkedIn"
    }
  ];
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ShareAnywherePanel({ title, url, text, rawUrl, className }: ShareAnywhereBaseProps) {
  const [copied, setCopied] = useState<"share" | "raw" | null>(null);
  const [nativeSharePending, setNativeSharePending] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const shareText = text?.trim() || `Shared from WOX-Bin: ${title}`;
  const targets = useMemo(() => buildShareTargets(title, url, shareText), [shareText, title, url]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeout = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy(kind: "share" | "raw", value: string) {
    try {
      await copyText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  async function handleNativeShare() {
    if (!canNativeShare || nativeSharePending) {
      return;
    }
    setNativeSharePending(true);
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // User cancellation and platform share-sheet failures should stay silent.
    } finally {
      setNativeSharePending(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border bg-muted/35 p-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Share URL</p>
        <p className="mt-2 break-all font-mono text-xs text-foreground">{url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void handleCopy("share", url)} size="sm" type="button" variant="outline">
            <Copy className="h-3.5 w-3.5" />
            {copied === "share" ? "Copied" : "Copy link"}
          </Button>
          {rawUrl ? (
            <Button onClick={() => void handleCopy("raw", rawUrl)} size="sm" type="button" variant="outline">
              <Copy className="h-3.5 w-3.5" />
              {copied === "raw" ? "Copied raw" : "Copy raw URL"}
            </Button>
          ) : null}
          {canNativeShare ? (
            <Button disabled={nativeSharePending} onClick={() => void handleNativeShare()} size="sm" type="button">
              <Share2 className="h-3.5 w-3.5" />
              {nativeSharePending ? "Opening..." : "System share"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Share anywhere</p>
        </div>
        <p className="text-xs text-muted-foreground">Pick a service below, or use your device&apos;s native share sheet.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {targets.map((target) => (
            <Button asChild className="h-auto min-h-12 justify-start rounded-2xl px-4 py-3 text-left" key={target.label} variant="outline">
              <a href={target.href} rel="noreferrer noopener" target="_blank">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">{target.label}</span>
                  <span className="text-[11px] text-muted-foreground">{target.description}</span>
                </span>
              </a>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border/80 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
        <Mail className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
        Links open with <code className="rounded bg-muted px-1">noopener noreferrer</code> and work on mobile apps or web where
        available.
      </div>
    </div>
  );
}

export function ShareAnywhereDialog({ open, onOpenChange, title, url, text, rawUrl }: ShareAnywhereDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share this paste</DialogTitle>
          <DialogDescription>Use native share when supported, or send the link through a service below.</DialogDescription>
        </DialogHeader>
        <ShareAnywherePanel rawUrl={rawUrl} text={text} title={title} url={url} />
      </DialogContent>
    </Dialog>
  );
}
