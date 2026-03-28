"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clipboard, KeyRound, ShieldCheck, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeOptionalSlug } from "@/lib/utils";

const ADJECTIVES = ["fast", "quiet", "cobalt", "mint", "ember", "silent", "tidy", "swift"];
const NOUNS = ["clip", "note", "drop", "bucket", "handoff", "stash", "relay", "paste"];

function randomClipboardKey() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Math.random().toString(36).slice(2, 5);
  return `${adjective}-${noun}-${suffix}`;
}

export function ClipboardLauncherClient() {
  const router = useRouter();
  const [slug, setSlug] = useState(() => randomClipboardKey());

  const normalized = useMemo(() => normalizeOptionalSlug(slug).slice(0, 48), [slug]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-0">
          <div className="border-b border-border/70 bg-gradient-to-br from-emerald-500/12 via-transparent to-cyan-500/12 px-6 py-6">
            <Badge className="px-3 py-1 text-xs">Clipboard buckets</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Claim a short key, paste text, and hand it off.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Clipboard buckets are text-first, temporary, and easy to remember. Open a bucket key on another device to read
              or update it, and switch on client-side encryption inside the bucket when plain server storage is not enough.
            </p>
          </div>

          <div className="space-y-5 px-6 pb-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Bucket key</label>
              <Input onChange={(event) => setSlug(event.target.value)} placeholder="team-standup-1" value={slug} />
              <p className="text-xs text-muted-foreground">Use letters, numbers, dashes, or underscores. 3–48 characters.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={!normalized} onClick={() => router.push(`/c/${normalized}`)} type="button">
                Open bucket
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={() => setSlug(randomClipboardKey())} type="button" variant="outline">
                Random key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clipboard className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">What it does</p>
                <p className="text-sm text-muted-foreground">A temporary text transfer surface built for speed.</p>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                A key maps directly to a bucket URL.
              </li>
              <li className="flex gap-2">
                <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Default expiry is 24 hours, with short and long presets in the bucket editor.
              </li>
              <li className="flex gap-2">
                <Clipboard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                The first device that creates the bucket receives a local manage token for edits and deletion.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Buckets can stay plain for speed or switch to fragment-key encryption for zero-knowledge text handoff.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
