"use client";

import Link from "next/link";
import { ArrowRight, Link2, MessageCircleMore, ScanSearch, ShieldCheck, ShieldEllipsis, Vote } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const TOOLS = [
  {
    href: "/snapshot",
    title: "Snapshot",
    description: "Freeze a client-side encrypted text snapshot and share it with a fragment key.",
    icon: ShieldCheck
  },
  {
    href: "/scrub",
    title: "Scrub",
    description: "Strip image metadata in the browser and download a cleaner copy without uploading it.",
    icon: ScanSearch
  },
  {
    href: "/poll",
    title: "Poll",
    description: "Create quick anonymous polls with multiple-choice support and public result pages.",
    icon: Vote
  },
  {
    href: "/proof",
    title: "Proof",
    description: "Hash text or files, timestamp the digest, and share a verification receipt.",
    icon: ShieldEllipsis
  },
  {
    href: "/chat",
    title: "Chat",
    description: "Spin up an encrypted temporary room where the server only sees ciphertext.",
    icon: MessageCircleMore
  },
  {
    href: "/noref",
    title: "NoRef",
    description: "Generate referrer-hiding outbound links using WOX-Bin's built-in privacy redirect.",
    icon: Link2
  }
] as const;

export function PrivacyHub() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/90">Privacy tools</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Encrypted shares, proofs, polls, and metadata cleanup.</h1>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            This suite brings together the privacy-first features that fit WOX-Bin cleanly on Vercel: encrypted
            snapshots and chat, browser-side metadata scrubbing, public proof receipts, anonymous polls, and a
            first-class NoRef link generator.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link className="group" href={tool.href} key={tool.href}>
              <Card className="h-full transition group-hover:border-primary/30">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-border bg-background/70">
                      <Icon className="size-5 text-primary" />
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{tool.title}</h2>
                    <p className="text-sm leading-7 text-muted-foreground">{tool.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
