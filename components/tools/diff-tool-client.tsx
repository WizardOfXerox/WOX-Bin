"use client";

import { useMemo, useState } from "react";
import DiffMatchPatch from "diff-match-patch";
import { ArrowLeftRight, Check, Copy, FileDiff, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

const SAMPLE_OLD = `function calculateTotal(items, taxRate) {
  let subtotal = 0;
  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

export default calculateTotal;`;

const SAMPLE_NEW = `function calculateTotal(items = [], taxRate = 0.05, discount = 0) {
  const subtotal = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const discounted = Math.max(0, subtotal - discount);
  const tax = discounted * taxRate;
  return Number((discounted + tax).toFixed(2));
}

export { calculateTotal };`;

export function DiffToolClient() {
  const [textA, setTextA] = useState(SAMPLE_OLD);
  const [textB, setTextB] = useState(SAMPLE_NEW);
  const [viewMode, setViewMode] = useState<"unified" | "split" | "patch">("unified");
  const [copied, setCopied] = useState(false);

  const dmp = useMemo(() => new DiffMatchPatch(), []);

  const { diffs, stats, patchText } = useMemo(() => {
    const rawDiffs = dmp.diff_main(textA, textB);
    dmp.diff_cleanupSemantic(rawDiffs);

    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const [op, text] of rawDiffs) {
      if (op === 1) {
        additions += text.length;
      } else if (op === -1) {
        deletions += text.length;
      } else {
        unchanged += text.length;
      }
    }

    const patches = dmp.patch_make(textA, textB);
    const patchString = dmp.patch_toText(patches);

    const linesA = textA.split(/\r?\n/);
    const linesB = textB.split(/\r?\n/);

    return {
      diffs: rawDiffs,
      stats: { additions, deletions, unchanged, lineCountA: linesA.length, lineCountB: linesB.length },
      patchText: patchString
    };
  }, [dmp, textA, textB]);

  function handleSwap() {
    setTextA(textB);
    setTextB(textA);
  }

  function handleClear() {
    setTextA("");
    setTextB("");
  }

  function handleLoadSample() {
    setTextA(SAMPLE_OLD);
    setTextB(SAMPLE_NEW);
  }

  async function handleCopyPatch() {
    await navigator.clipboard.writeText(patchText || "No changes detected.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={TOOLS_CLIENT_WIDE}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">Diff Checker</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <FileDiff className="size-4" />
          Offline Diff Engine
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Compare Text & Code</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Compare two versions of code, configuration, or text side-by-side with character-level accuracy. Runs
          100% locally in your browser with zero server uploads.
        </p>
      </header>

      {/* Control Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1 text-xs font-medium">
            <button
              onClick={() => setViewMode("unified")}
              type="button"
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                viewMode === "unified" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode("split")}
              type="button"
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                viewMode === "split" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode("patch")}
              type="button"
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                viewMode === "patch" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unified Patch
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              +{stats.additions} chars
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              -{stats.deletions} chars
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSwap} size="sm" variant="outline" className="gap-1.5 text-xs">
            <ArrowLeftRight className="size-3.5" />
            Swap
          </Button>
          <Button onClick={handleLoadSample} size="sm" variant="outline" className="gap-1.5 text-xs">
            <Sparkles className="size-3.5" />
            Sample
          </Button>
          <Button onClick={handleClear} size="sm" variant="outline" className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
            <Trash2 className="size-3.5" />
            Clear
          </Button>
          <Button onClick={handleCopyPatch} size="sm" variant="secondary" className="gap-1.5 text-xs">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? "Copied Patch" : "Copy Patch"}
          </Button>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Original (Old) Text</span>
            <span className="font-mono text-[10px]">{stats.lineCountA} lines · {textA.length} chars</span>
          </div>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste original text or code here..."
            className="h-44 w-full rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Modified (New) Text</span>
            <span className="font-mono text-[10px]">{stats.lineCountB} lines · {textB.length} chars</span>
          </div>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste modified text or code here..."
            className="h-44 w-full rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Results View */}
      <Card className="overflow-hidden border-border/70 bg-card/60">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Comparison Output</span>
            <span>{diffs.length} diff chunks</span>
          </div>

          {viewMode === "patch" ? (
            <pre className="max-h-[500px] overflow-auto p-4 font-mono text-xs leading-relaxed select-text text-foreground">
              {patchText || "No changes between original and modified text."}
            </pre>
          ) : viewMode === "split" ? (
            <div className="grid max-h-[500px] divide-x divide-border/60 overflow-auto font-mono text-xs md:grid-cols-2">
              <div className="p-4 space-y-1 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-2">Original</p>
                {diffs.map(([op, text], idx) => {
                  if (op === 1) return null; // Ignore inserts on old side
                  return (
                    <span
                      key={idx}
                      className={cn(
                        op === -1 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-sm px-0.5" : "text-foreground"
                      )}
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
              <div className="p-4 space-y-1 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Modified</p>
                {diffs.map(([op, text], idx) => {
                  if (op === -1) return null; // Ignore deletes on new side
                  return (
                    <span
                      key={idx}
                      className={cn(
                        op === 1 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-sm px-0.5" : "text-foreground"
                      )}
                    >
                      {text}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
              {diffs.length === 0 || (diffs.length === 1 && diffs[0]![0] === 0) ? (
                <p className="text-muted-foreground italic">Original and modified text are completely identical.</p>
              ) : (
                diffs.map(([op, text], idx) => {
                  if (op === 1) {
                    return (
                      <ins
                        key={idx}
                        className="bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 no-underline rounded-sm px-0.5"
                      >
                        {text}
                      </ins>
                    );
                  }
                  if (op === -1) {
                    return (
                      <del
                        key={idx}
                        className="bg-rose-500/25 text-rose-700 dark:text-rose-300 line-through rounded-sm px-0.5"
                      >
                        {text}
                      </del>
                    );
                  }
                  return (
                    <span key={idx} className="text-foreground">
                      {text}
                    </span>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DiffToolClient;
