import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, Sparkles, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { CHANGELOG_ENTRIES } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Recent WOX-Bin product changes, shipped features, and operational updates."
};

export default function ChangelogPage() {
  const [latest] = CHANGELOG_ENTRIES;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Visual background layers */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl rounded-full pointer-events-none opacity-60" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-10" />

        {/* Hero Section */}
        <section className="grid gap-8 border-b border-border/50 pb-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-6 motion-safe:animate-wox-fade-up">
            <Badge className="px-3 py-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">
              Changelog
            </Badge>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] font-semibold text-muted-foreground/80">WOX-Bin</p>
              <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1] bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                A running record of what changed.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                This page tracks the shipped product surface: workspace behavior, account/security changes, admin tools,
                support, and companion extension work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild className="rounded-full shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <Link href="/app">
                  Open workspace
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/bookmarkfs">BookmarkFS</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full">
                <Link href="/support">Support</Link>
              </Button>
            </div>
          </div>

          {/* Latest Entry Card */}
          {latest ? (
            <div className="rounded-[2rem] border border-primary/30 bg-gradient-to-b from-primary/10 via-card/70 to-card/90 p-6 backdrop-blur-md shadow-[0_12px_40px_rgba(59,130,246,0.06)] hover:border-primary/45 transition-all duration-500 relative group motion-safe:animate-wox-fade-up">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-gradient-to-r from-primary to-accent text-accent-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                Latest
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary animate-pulse" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Latest Release</p>
              </div>
              <time className="mt-4 block text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground/80">{latest.date}</time>
              <h2 className="mt-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{latest.title}</h2>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{latest.summary}</p>
            </div>
          ) : null}
        </section>

        {/* Timeline Grid Section */}
        <section className="mt-14 relative pl-4 md:pl-0">
          {/* Vertical timeline line (desktop only) */}
          <div className="absolute left-[4.5rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/40 via-border/50 to-border/10 hidden md:block" />

          <div className="space-y-10">
            {CHANGELOG_ENTRIES.map((entry, index) => (
              <div
                className="relative grid gap-4 md:grid-cols-[9rem_1fr] items-start"
                key={entry.slug}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Timeline node & Date */}
                <div className="flex items-center md:justify-end gap-3 md:gap-0 relative">
                  {/* Timeline point indicator */}
                  <div className="absolute left-[4.25rem] top-2 w-2.5 h-2.5 rounded-full border-2 border-primary bg-background z-10 hidden md:block shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                  
                  <div className="text-left md:text-right md:pr-8">
                    <time className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground/80">
                      {entry.date}
                    </time>
                  </div>
                  <Badge className="md:hidden bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold py-0.5">
                    Shipped
                  </Badge>
                </div>

                {/* Content Card */}
                <article className="rounded-2xl border border-border/50 bg-gradient-to-b from-card/85 to-muted/10 p-6 backdrop-blur-md shadow-sm hover:border-primary/25 hover:shadow-[0_8px_30px_rgba(59,130,246,0.03)] hover:-translate-y-0.5 transition-all duration-300 relative group">
                  <div className="absolute top-6 right-6 hidden md:block">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15 text-[10px] uppercase font-bold transition-colors">
                      Shipped
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2 pr-0 md:pr-16">
                      <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {entry.title}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground font-normal">
                        {entry.summary}
                      </p>
                    </div>
                    
                    <div className="h-px bg-border/40 w-full" />
                    
                    <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground/90">
                      {entry.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70 shadow-[0_0_4px_rgba(59,130,246,0.4)]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
