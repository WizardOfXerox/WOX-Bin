"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isImplementedInWoxBin, resolveConversionPair } from "@/lib/convert/resolver";
import { cn } from "@/lib/utils";

type ConvertioPairsPayload = {
  generatedAt: string;
  source: string;
  uniquePairCount: number;
  pairs: { path: string; href: string; label: string }[];
};

const MAX_RENDER = 600;

export default function ConvertioPairsPanel({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ConvertioPairsPayload | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    if (!open || payload) {
      return;
    }
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/data/convertio-pairs.json", { cache: "force-cache" });
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        const data = (await r.json()) as ConvertioPairsPayload;
        if (!cancelled) {
          setPayload(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, payload, retryKey]);

  const filtered = useMemo(() => {
    if (!payload?.pairs?.length) {
      return [];
    }
    const q = deferredQuery;
    if (!q) {
      return payload.pairs;
    }
    return payload.pairs.filter(
      (p) => p.label.toLowerCase().includes(q) || p.path.includes(q) || p.href.toLowerCase().includes(q)
    );
  }, [payload, deferredQuery]);

  const visible = useMemo(() => filtered.slice(0, MAX_RENDER), [filtered]);
  const truncated = filtered.length > MAX_RENDER;

  return (
    <section className={cn("glass-panel overflow-hidden", className)}>
      <button
        className="flex w-full touch-manipulation items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-muted/30 sm:gap-3 sm:px-6 sm:py-4"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">Every Convertio conversion route</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {payload
              ? `${payload.uniquePairCount.toLocaleString()} unique URLs scraped from all format pages (reference links to Convertio).`
              : "Load the full ~25,600+ source → target list we mirror from their site."}
          </p>
        </div>
        {open ? <ChevronUp className="size-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-5 shrink-0 text-muted-foreground" />}
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
          {error ? (
            <p className="text-destructive text-sm">
              Could not load <code className="font-mono text-xs">/data/convertio-pairs.json</code>: {error}. Run{" "}
              <code className="font-mono text-xs">npm run fetch:convertio-pairs</code> to generate it.
            </p>
          ) : null}

          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading conversion index… (~2 MB)
            </div>
          ) : null}

          {payload ? (
            <>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Generated <span className="font-mono text-[10px] text-foreground/90">{payload.generatedAt}</span> · Pairs we can run in
                your browser link to <span className="font-mono text-[10px]">/tools/c/…</span> (PDF presets redirect to the PDF tool; others
                open the in-app converter or a “worker needed” page). Remaining pairs still open Convertio as reference.
              </p>
              <div className="relative">
                <Input
                  aria-label="Search conversion pairs"
                  className="h-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search e.g. PDF to DOCX, mp4-webm…"
                  value={query}
                />
              </div>
              <p className="text-muted-foreground text-xs tabular-nums">
                {filtered.length.toLocaleString()} match(es)
                {truncated ? ` · showing first ${MAX_RENDER.toLocaleString()}` : ""}
              </p>
              <ul className="max-h-[min(28rem,55vh)] space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-muted/15 p-2 text-sm">
                {visible.map((p) => {
                  const r = resolveConversionPair(p.path);
                  const inWox = r != null && isImplementedInWoxBin(r);
                  const href = inWox ? `/tools/c/${p.path}` : p.href;
                  return (
                    <li key={p.path}>
                      {inWox ? (
                        <Link
                          className="text-foreground hover:text-primary flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted/60"
                          href={href}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{p.label}</span>
                          <span className="text-primary shrink-0 text-[10px] font-semibold uppercase tracking-wide">WOX-Bin</span>
                        </Link>
                      ) : (
                        <a
                          className="text-foreground hover:text-primary flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-muted/60"
                          href={href}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{p.label}</span>
                          <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
              {truncated ? (
                <p className="text-muted-foreground text-[11px]">
                  Narrow your search to see more specific results (full list has {payload.uniquePairCount.toLocaleString()} entries).
                </p>
              ) : null}
            </>
          ) : null}

          {error ? (
            <Button onClick={() => setRetryKey((k) => k + 1)} size="sm" variant="secondary">
              Retry load
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
