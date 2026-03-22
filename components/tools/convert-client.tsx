"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Cpu, ExternalLink, HardDrive, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CONVERTIO_FORMAT_COUNT,
  CONVERT_TOOL_CATEGORY_LABELS,
  CONVERT_TOOL_CATEGORY_ORDER,
  CONVERT_TOOLS,
  categoriesWithHubContent,
  filterConvertioFormats,
  filterConvertTools,
  toolsInCategory,
  type ConvertToolCategory,
  type ConvertToolDefinition,
  type ConvertioFormatCatalogEntry
} from "@/lib/tools/convert-registry";
import ConvertioPairsPanel from "@/components/tools/convertio-pairs-panel";
import { cn } from "@/lib/utils";

function ToolCard({ tool }: { tool: ConvertToolDefinition }) {
  const isLive = tool.status === "live" && tool.href;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-3 transition sm:p-4",
        isLive ? "border-border bg-card/60 hover:border-primary/40" : "border-dashed border-border/80 bg-muted/20"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold tracking-tight text-foreground">{tool.name}</h3>
        <div className="flex flex-wrap gap-1">
          <Badge
            className={
              tool.tier === "client"
                ? "border-primary/25 bg-primary/10 text-foreground"
                : "border-border bg-transparent"
            }
          >
            {tool.tier === "client" ? "Browser" : "Worker"}
          </Badge>
          <Badge className={isLive ? "border-primary/40 bg-primary text-primary-foreground" : "border-dashed"}>
            {isLive ? "Live" : "Planned"}
          </Badge>
        </div>
      </div>
      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">{tool.description}</p>
      {tool.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {tool.tags.map((tag) => (
            <span className="text-muted-foreground rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[10px]" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4">
        {isLive ? (
          <Button asChild className="min-h-10 w-full touch-manipulation gap-2 sm:min-h-9 sm:w-auto" size="sm">
            <Link href={tool.href!}>
              Open tool
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">Roadmap — implement under /tools or worker queue</p>
        )}
      </div>
    </div>
  );
}

function FormatChips({ formats }: { formats: ConvertioFormatCatalogEntry[] }) {
  if (formats.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {formats.map((f) => (
        <a
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] font-medium tracking-tight transition hover:border-primary/35"
          href={`https://convertio.co${f.convertioPath}`}
          key={f.id}
          rel="noopener noreferrer"
          target="_blank"
          title={`${f.label} — ${f.convertioSection} on Convertio`}
        >
          {f.label}
          <ExternalLink aria-hidden className="size-2.5 shrink-0 opacity-50" />
        </a>
      ))}
    </div>
  );
}

export default function ConvertClient() {
  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => filterConvertTools(query), [query]);
  const filteredFormats = useMemo(() => filterConvertioFormats(query), [query]);

  const stats = useMemo(() => {
    const live = CONVERT_TOOLS.filter((t) => t.status === "live").length;
    const planned = CONVERT_TOOLS.length - live;
    const client = CONVERT_TOOLS.filter((t) => t.tier === "client").length;
    const worker = CONVERT_TOOLS.filter((t) => t.tier === "worker").length;
    return { live, planned, client, worker, totalTools: CONVERT_TOOLS.length };
  }, []);

  const categoriesToShow = useMemo(
    () => categoriesWithHubContent(filteredTools, filteredFormats),
    [filteredTools, filteredFormats]
  );

  return (
    <div className="flex w-full flex-col gap-6 sm:gap-8 lg:gap-10">
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:gap-x-4 sm:text-sm">
        <Link className="touch-manipulation text-foreground hover:underline" href="/">
          Home
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Convert</span>
      </nav>

      <header className="glass-panel px-4 py-4 sm:px-6 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          WOX-Bin tools
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight sm:mt-3 sm:text-2xl md:text-3xl">File converter hub</h1>
        <p className="mt-3 text-xs leading-6 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-7">
          <strong className="font-medium text-foreground">Browser</strong> tools stay private; many image pairs also run via{" "}
          <strong className="font-medium text-foreground">server sharp</strong> (<span className="font-mono text-xs">/api/convert/image</span>
          , in-memory only). PDF, Markdown, text, CSV/JSON, and ZIP are covered; video/Office/OCR remain{" "}
          <strong className="font-medium text-foreground">worker</strong> backlog. This hub includes the Convertio{" "}
          <strong className="font-medium text-foreground">formats index</strong> ({CONVERTIO_FORMAT_COUNT} rows) and the{" "}
          <strong className="font-medium text-foreground">25,600+</strong> pair list — supported pairs open in WOX-Bin; the rest link to
          Convertio as reference.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge className="border-primary/30 bg-primary/10 text-foreground">{stats.totalTools} WOX-Bin tools</Badge>
          <Badge className="border-violet-500/30 bg-violet-500/10 text-foreground">25,600+ Convertio routes (JSON)</Badge>
          <Badge className="border-sky-500/30 bg-sky-500/10 text-foreground">{CONVERTIO_FORMAT_COUNT} Convertio formats (index)</Badge>
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-foreground">{stats.live} live</Badge>
          <Badge className="border-amber-500/25 bg-amber-500/10 text-foreground">{stats.planned} planned tools</Badge>
          <Badge className="border-border bg-muted/50">{stats.client} browser</Badge>
          <Badge className="border-border bg-muted/50">{stats.worker} worker</Badge>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search tools and formats"
            className="h-10 pl-9"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search WOX-Bin tools + Convertio format names…"
            value={query}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Browser</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">Runs locally in your tab.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
            <Cpu className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Worker</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">FFmpeg, LibreOffice, OCR, RAR/7z…</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
            <HardDrive className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Jobs</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                <code className="font-mono text-[10px]">conversion_jobs</code> in Postgres when workers ship.
              </p>
            </div>
          </div>
        </div>
      </header>

      <ConvertioPairsPanel />

      <nav aria-label="Jump to category" className="flex flex-wrap gap-1.5 sm:gap-2">
        {CONVERT_TOOL_CATEGORY_ORDER.map((cat) => (
          <a
            className="min-h-9 touch-manipulation rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground sm:min-h-0 sm:py-1"
            href={`#convert-${cat}`}
            key={cat}
          >
            {CONVERT_TOOL_CATEGORY_LABELS[cat]}
          </a>
        ))}
      </nav>

      {categoriesToShow.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          No tools or formats match “{query}”. Try another keyword or clear the search.
        </p>
      ) : (
        categoriesToShow.map((category) => {
          const inCatTools = toolsInCategory(category).filter((t) => filteredTools.some((f) => f.id === t.id));
          const inCatFormats = filteredFormats.filter((f) => f.category === category);
          return (
            <section className="scroll-mt-24 space-y-4" id={`convert-${category}`} key={category}>
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {CONVERT_TOOL_CATEGORY_LABELS[category as ConvertToolCategory]}
                </h2>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {inCatTools.length} tool(s) · {inCatFormats.length} format(s)
                </span>
              </div>

              {inCatTools.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inCatTools.map((t) => (
                    <ToolCard key={t.id} tool={t} />
                  ))}
                </div>
              ) : null}

              {inCatFormats.length > 0 ? (
                <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">Convertio format index</h3>
                    <span className="text-muted-foreground text-[10px]">External reference — not WOX-Bin routes yet</span>
                  </div>
                  <FormatChips formats={inCatFormats} />
                </div>
              ) : null}
            </section>
          );
        })
      )}

      <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
        Tools: <span className="font-mono text-[10px] text-foreground/90">lib/tools/convert-registry.ts</span> · Formats:{" "}
        <span className="font-mono text-[10px] text-foreground/90">lib/tools/convertio-formats.generated.ts</span> (
        <span className="font-mono text-[10px]">npm run gen:convertio-formats</span>) ·         Pairs:{" "}
        <span className="font-mono text-[10px] text-foreground/90">public/data/convertio-pairs.json</span> (
        <span className="font-mono text-[10px]">npm run fetch:convertio-pairs</span>) · Sharp API:{" "}
        <span className="font-mono text-[10px] text-foreground/90">POST /api/convert/image</span> · Architecture:{" "}
        <span className="font-mono text-[10px] text-foreground/90">docs/CONVERSION-PLATFORM.md</span>
      </p>
    </div>
  );
}
