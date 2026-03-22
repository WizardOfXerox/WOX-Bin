import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Cloud,
  ExternalLink,
  FolderTree,
  HardDriveDownload,
  KeyRound,
  ShieldCheck,
  Workflow
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WORKFLOW = [
  {
    title: "Connect one or more WOX-Bin sites",
    body: "Save multiple hosted profiles, switch between environments, and keep API keys in the browser companion instead of retyping them every session."
  },
  {
    title: "Publish from the browser",
    body: "Create, edit, delete, and cache hosted pastes directly from the extension. The cloud side is the primary mode and mirrors the main workspace."
  },
  {
    title: "Keep a local vault when needed",
    body: "BookmarkFS still exists as an experimental local vault for offline-heavy or sync-through-bookmarks workflows. It is kept separate from the hosted cloud layer."
  }
] as const;

const SURFACES = [
  {
    title: "Cloud companion first",
    icon: Cloud,
    copy:
      "WOX-Bin is now the default startup surface. The extension is built to manage API-key profiles, open the hosted workspace quickly, and publish pastes without a full tab round-trip."
  },
  {
    title: "Local vault, clearly labeled",
    icon: Bookmark,
    copy:
      "The original BookmarkFS idea remains available, but it is treated as an advanced local mode rather than the first thing every user sees."
  },
  {
    title: "Bridge between both",
    icon: Workflow,
    copy:
      "Move content between local vault files and hosted pastes, cache cloud content for offline reading, and keep the browser companion useful even when you are away from the full app."
  }
] as const;

const GUARDS = [
  {
    title: "Profile-aware credentials",
    icon: KeyRound,
    copy: "Multiple site profiles, optional passphrase-protected stored keys, and API-key lifecycle management directly from the extension UI."
  },
  {
    title: "Operational limits are explicit",
    icon: ShieldCheck,
    copy: "The page calls out that the local vault is experimental and still inherits bookmark-sync limits. Hosted mode remains the stable path."
  },
  {
    title: "Built for real file movement",
    icon: HardDriveDownload,
    copy: "Offline cache, import/export, backup, and recovery tooling are part of the companion story instead of being hidden implementation detail."
  }
] as const;

export const metadata: Metadata = {
  title: "BookmarkFS — WOX-Bin",
  description:
    "BookmarkFS is the WOX-Bin browser companion: hosted paste profiles, API-key workflows, offline cache, and an experimental local vault."
};

export default function BookmarkFsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="grid gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:px-10 lg:py-10">
            <div className="space-y-6 motion-safe:animate-wox-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="px-3 py-1 text-xs">Browser companion</Badge>
                <Badge className="border-primary/20 bg-primary/10 px-3 py-1 text-xs text-foreground">
                  Cloud-first
                </Badge>
                <Badge className="border-border/70 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                  Local vault experimental
                </Badge>
              </div>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">BookmarkFS</p>
                <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  The WOX-Bin browser companion for cloud pastes, offline cache, and advanced local vault workflows.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  BookmarkFS is no longer positioned as a separate product with a confusing split identity. It is the
                  browser-side companion to WOX-Bin: multiple hosted profiles, API-key publishing, quick compose, and a
                  clearly labeled local vault mode for users who want the original bookmark-backed storage model.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg">
                  <a href="https://github.com/WizardOfXerox/WOX-Bin/tree/main/bookmarkfs" rel="noreferrer" target="_blank">
                    Open source package
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/app">
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/doc">Read docs</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 motion-safe:animate-wox-fade-up lg:pl-4">
              <div className="rounded-[1.75rem] border border-primary/20 bg-primary/10 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Cloud className="h-4 w-4 text-primary" />
                  Hosted mode
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Save profiles for production, staging, or local WOX-Bin deployments, then manage cloud pastes from the
                  extension without giving up the main web app.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Local vault
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Files can still live inside the bookmark-backed vault, but that mode is explicitly marked experimental,
                  with backup, recovery, and import/export support instead of pretending it is a normal file system.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-border/70 bg-background/70 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Positioning</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  The companion is meant to extend WOX-Bin, not compete with it. Cloud workflows lead. The local vault
                  exists for advanced users who specifically want that storage model.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">How it fits</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">One extension, two modes, one clear hierarchy.</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              The extension was refocused so the first impression is the hosted WOX-Bin workflow. The local vault stays
              available, but it no longer hijacks startup or hides the core cloud companion story.
            </p>
          </div>
          <div className="grid gap-4">
            {SURFACES.map((surface) => {
              const Icon = surface.icon;
              return (
                <div className="border-t border-border/70 pt-4" key={surface.title}>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    {surface.title}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{surface.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-border/70 bg-card/55 px-5 py-6 backdrop-blur-sm sm:px-8 sm:py-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Workflow</p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What users actually do with it.</h2>
            </div>
            <div className="space-y-6">
              {WORKFLOW.map((item, index) => (
                <div className="grid gap-2 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4" key={item.title}>
                  <div className="text-sm font-medium text-primary">0{index + 1}</div>
                  <div>
                    <h3 className="text-base font-medium text-foreground">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3">
          {GUARDS.map((item) => {
            const Icon = item.icon;
            return (
              <div className="rounded-[1.5rem] border border-border/70 bg-background/75 p-5" key={item.title}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {item.title}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.copy}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-12 rounded-[2rem] border border-border/70 bg-card/60 px-5 py-6 text-center backdrop-blur-sm sm:px-8 sm:py-8">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Next step</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Use WOX-Bin in the browser, then bring the companion alongside it.</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Start with the hosted workspace, create an API key, then add BookmarkFS when you want a browser-native
            companion with quick publishing, offline cache, and the optional local vault layer.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/app">Open WOX-Bin</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">Compare plans</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="https://github.com/WizardOfXerox/WOX-Bin/tree/main/bookmarkfs" rel="noreferrer" target="_blank">
                View extension source
              </a>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
