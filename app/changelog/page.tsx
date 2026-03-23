import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHANGELOG_ENTRIES } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Recent WOX-Bin product changes, shipped features, and operational updates."
};

export default function ChangelogPage() {
  const [latest] = CHANGELOG_ENTRIES;

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-35" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <section className="grid gap-8 border-b border-border/60 pb-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-5 motion-safe:animate-wox-fade-up">
            <Badge className="px-3 py-1 text-xs">Changelog</Badge>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">WOX-Bin</p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                A running record of what changed.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                This page tracks the shipped product surface: workspace behavior, account/security changes, admin tools,
                support, and companion extension work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app">
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/bookmarkfs">BookmarkFS</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/support">Support</Link>
              </Button>
            </div>
          </div>

          {latest ? (
            <div className="rounded-[2rem] border border-border/70 bg-card/65 p-6 backdrop-blur-sm motion-safe:animate-wox-fade-up">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Latest entry</p>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{latest.date}</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">{latest.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{latest.summary}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-10 space-y-6">
          {CHANGELOG_ENTRIES.map((entry, index) => (
            <article
              className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-card/55 px-5 py-5 backdrop-blur-sm md:grid-cols-[9rem_minmax(0,1fr)]"
              key={entry.slug}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{entry.date}</p>
                <Badge className="w-fit px-2.5 py-1 text-[0.7rem]">Shipped</Badge>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{entry.title}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{entry.summary}</p>
                </div>
                <ul className="space-y-2 text-sm leading-7 text-muted-foreground">
                  {entry.bullets.map((bullet) => (
                    <li key={bullet}>- {bullet}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
