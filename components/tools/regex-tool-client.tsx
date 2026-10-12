"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Layers,
  ListOrdered,
  RotateCcw,
  Sparkles,
  Split,
  Trash2
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

type RegexFlag = "g" | "i" | "m" | "s" | "u";

const ALL_FLAGS: { key: RegexFlag; label: string; description: string }[] = [
  { key: "g", label: "Global", description: "Match all occurrences" },
  { key: "i", label: "Insensitive", description: "Case-insensitive match" },
  { key: "m", label: "Multiline", description: "^ and $ match line boundaries" },
  { key: "s", label: "dotAll", description: ". matches newline character" },
  { key: "u", label: "Unicode", description: "Treat pattern as unicode sequence" }
];

type Preset = {
  name: string;
  pattern: string;
  flags: RegexFlag[];
  testText: string;
  description: string;
};

const PRESETS: Preset[] = [
  {
    name: "Email Address",
    pattern: "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})",
    flags: ["g", "i"],
    testText:
      "Contact support@wox-bin.com or sales@company.org. For urgent matters write to alex.doe+urgent@sub.domain.io.",
    description: "Extract email address with username, domain, and TLD capture groups."
  },
  {
    name: "ISO 8601 Date",
    pattern: "(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])",
    flags: ["g"],
    testText:
      "Events are scheduled for 2026-10-12, 2026-12-25, and next year on 2027-01-01. Invalid dates like 2026-13-45 won't match.",
    description: "Extract dates in YYYY-MM-DD format with year, month, and day capture groups."
  },
  {
    name: "IPv4 Address",
    pattern: "\\b(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}\\b",
    flags: ["g"],
    testText: "Server routers: 192.168.1.1, 10.0.0.254, DNS 8.8.8.8 and local 127.0.0.1. Invalid 999.999.999.999.",
    description: "Match valid IPv4 addresses (0.0.0.0 through 255.255.255.255)."
  },
  {
    name: "URL / Web Links",
    pattern: "https?:\\/\\/([a-zA-Z0-9.-]+)(:[0-9]+)?(\\/[^\\s]*)?",
    flags: ["g", "i"],
    testText:
      "Visit https://wox-bin.com/tools or local dev http://localhost:3000/dashboard?user=123 for preview.",
    description: "Matches HTTP/HTTPS URLs with domain, port, and path capture groups."
  },
  {
    name: "Hex Colors",
    pattern: "#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b",
    flags: ["g", "i"],
    testText: "Brand palette: primary is #3b82f6, accent #f43f5e, dark #0f172a, short #fff and #10b981.",
    description: "Match 3-character and 6-character hexadecimal color codes."
  },
  {
    name: "HTML Tags",
    pattern: "<([a-z0-9]+)([^>]*)>(.*?)<\\/\\1>",
    flags: ["g", "i", "s"],
    testText: `<div class="card"><h1 id="title">Hello World</h1><p>Welcome to WOX-Bin tools suite.</p></div>`,
    description: "Match open/closing HTML tags with tag name, attributes, and inner content."
  }
];

type MatchItem = {
  index: number;
  end: number;
  matchText: string;
  groups: (string | undefined)[];
  namedGroups?: Record<string, string>;
};

// Alternating highlight styles for matches
const MATCH_COLORS = [
  "bg-amber-500/20 text-amber-500 border-amber-500/40",
  "bg-sky-500/20 text-sky-400 border-sky-500/40",
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  "bg-purple-500/20 text-purple-400 border-purple-500/40",
  "bg-rose-500/20 text-rose-400 border-rose-500/40",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
];

export function RegexToolClient() {
  const [pattern, setPattern] = useState("([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})");
  const [flags, setFlags] = useState<RegexFlag[]>(["g", "i"]);
  const [testText, setTestText] = useState(PRESETS[0]!.testText);
  const [activeTab, setActiveTab] = useState<"matches" | "replace">("matches");
  const [replacement, setReplacement] = useState("[$1 AT $2.$3]");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const flagString = useMemo(() => flags.join(""), [flags]);

  const toggleFlag = (flag: RegexFlag) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const applyPreset = (preset: Preset) => {
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setTestText(preset.testText);
  };

  // Compile regex and perform matches
  const { regex, error, matches } = useMemo(() => {
    if (!pattern) {
      return { regex: null, error: null, matches: [] };
    }

    let compiled: RegExp;
    try {
      compiled = new RegExp(pattern, flagString);
    } catch (err) {
      return {
        regex: null,
        error: err instanceof Error ? err.message : "Invalid Regular Expression syntax",
        matches: []
      };
    }

    const items: MatchItem[] = [];
    if (!testText) {
      return { regex: compiled, error: null, matches: items };
    }

    try {
      const isGlobal = flags.includes("g");
      const clone = new RegExp(pattern, flagString);

      if (isGlobal) {
        let m: RegExpExecArray | null;
        let lastIdx = -1;
        let count = 0;
        const maxMatches = 500; // safety ceiling

        while ((m = clone.exec(testText)) !== null && count < maxMatches) {
          count++;
          items.push({
            index: m.index,
            end: m.index + m[0].length,
            matchText: m[0],
            groups: m.slice(1),
            namedGroups: m.groups
          });

          // Prevent infinite loop on zero-length matches (e.g. ^ or \b)
          if (clone.lastIndex === lastIdx) {
            clone.lastIndex++;
          }
          lastIdx = clone.lastIndex;
        }
      } else {
        const m = clone.exec(testText);
        if (m) {
          items.push({
            index: m.index,
            end: m.index + m[0].length,
            matchText: m[0],
            groups: m.slice(1),
            namedGroups: m.groups
          });
        }
      }
    } catch (err) {
      return {
        regex: compiled,
        error: err instanceof Error ? err.message : "Error executing regex",
        matches: []
      };
    }

    return { regex: compiled, error: null, matches: items };
  }, [pattern, flagString, testText, flags]);

  // Compute substitution result
  const substitutionResult = useMemo(() => {
    if (!regex || error) return testText;
    try {
      return testText.replace(regex, replacement);
    } catch (err) {
      return err instanceof Error ? `Replacement error: ${err.message}` : "Replacement error";
    }
  }, [regex, error, testText, replacement]);

  // Generate visual highlighted segments of the test text
  const highlightedSegments = useMemo(() => {
    if (!matches.length || error) {
      return [{ text: testText, isMatch: false, matchIndex: -1 }];
    }

    const segments: { text: string; isMatch: boolean; matchIndex: number }[] = [];
    let currentPos = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]!;
      // Text before match
      if (m.index > currentPos) {
        segments.push({
          text: testText.slice(currentPos, m.index),
          isMatch: false,
          matchIndex: -1
        });
      }

      // Matched text
      if (m.end > m.index) {
        segments.push({
          text: testText.slice(m.index, m.end),
          isMatch: true,
          matchIndex: i
        });
        currentPos = m.end;
      }
    }

    // Trailing text after last match
    if (currentPos < testText.length) {
      segments.push({
        text: testText.slice(currentPos),
        isMatch: false,
        matchIndex: -1
      });
    }

    return segments;
  }, [matches, testText, error]);

  const copyText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // ignore
    }
  };

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
        <span className="font-medium text-foreground">Regex Tester & Debugger</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Code2 className="size-4" />
          Pattern Matcher & Analyzer
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Regex Tester & Debugger</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Test, analyze, and debug regular expressions in real-time. Features visual match highlighting, capture group
          breakdowns, flags control, and substitution previews.
        </p>
      </header>

      {/* Preset Library Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pr-2">
          <Sparkles className="size-3 text-primary" />
          Presets:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(p)}
            className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Regex Expression & Flags Input Bar */}
      <div className="glass-panel space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex flex-1 items-center">
            <span className="pointer-events-none pl-3 font-mono text-sm font-bold text-primary">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regular expression pattern..."
              className="h-10 w-full bg-transparent px-2 font-mono text-xs sm:text-sm text-foreground focus:outline-none"
            />
            <span className="pointer-events-none pr-3 font-mono text-sm font-bold text-primary">
              /{flagString}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:border-l sm:border-border sm:pl-3">
            {ALL_FLAGS.map(({ key, label, description }) => {
              const active = flags.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  title={`${label} (${key}): ${description}`}
                  onClick={() => toggleFlag(key)}
                  className={cn(
                    "h-8 min-w-[28px] rounded-lg border px-2 font-mono text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error notification if syntax is invalid */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Regular Expression Syntax Error</span>
              <p className="font-mono text-[11px] opacity-90">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Test String Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Test String</label>
            {!error && pattern && (
              <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                {matches.length} {matches.length === 1 ? "match" : "matches"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setTestText("")}
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3" />
              Clear
            </Button>
          </div>
        </div>
        <Textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Type or paste text to test regex matches..."
          className="min-h-[120px] font-mono text-xs sm:text-sm"
        />
      </div>

      {/* Visual Match Highlighting Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Match Highlighting Preview</label>
          <span className="text-[11px] text-muted-foreground">
            {matches.length > 0 ? "Hover or inspect individual match spans" : "No matches found"}
          </span>
        </div>
        <div className="glass-panel min-h-[90px] whitespace-pre-wrap p-3 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed break-all">
          {highlightedSegments.map((seg, idx) => {
            if (!seg.isMatch) {
              return <span key={idx}>{seg.text}</span>;
            }
            const colorClass = MATCH_COLORS[seg.matchIndex % MATCH_COLORS.length];
            return (
              <mark
                key={idx}
                className={cn(
                  "rounded-md border px-1 py-0.5 font-semibold transition-all",
                  colorClass
                )}
                title={`Match #${seg.matchIndex + 1}`}
              >
                {seg.text}
              </mark>
            );
          })}
        </div>
      </div>

      {/* Tabs: Match Breakdown vs Substitution */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("matches")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === "matches"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListOrdered className="size-3.5" />
            Match Breakdown ({matches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("replace")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === "replace"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Split className="size-3.5" />
            Substitution & Replace
          </button>
        </div>

        {activeTab === "matches" ? (
          <div className="space-y-2">
            {matches.length === 0 ? (
              <div className="glass-panel flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <CheckCircle2 className="size-8 opacity-40 mb-2" />
                <p className="text-xs sm:text-sm">
                  {error ? "Fix the regex syntax error to see matches" : "No matches found for the current pattern"}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {matches.map((m, idx) => {
                  const colorClass = MATCH_COLORS[idx % MATCH_COLORS.length];
                  return (
                    <Card key={idx} className="overflow-hidden">
                      <CardContent className="p-3 sm:p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-xs font-bold font-mono",
                                colorClass
                              )}
                            >
                              Match #{idx + 1}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Index: [{m.index}..{m.end}] ({m.matchText.length} chars)
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyText(m.matchText, `match-${idx}`)}
                            className="h-6 gap-1 px-2 text-xs"
                          >
                            {copiedType === `match-${idx}` ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Full Match */}
                        <div className="rounded-lg border border-border bg-card/50 p-2 font-mono text-xs break-all select-all text-foreground">
                          {m.matchText}
                        </div>

                        {/* Capture Groups */}
                        {m.groups.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2">
                            <div className="text-[11px] font-semibold text-muted-foreground">
                              Capture Groups ({m.groups.length}):
                            </div>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {m.groups.map((grpVal, grpIdx) => (
                                <div
                                  key={grpIdx}
                                  className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-2 py-1 text-xs"
                                >
                                  <span className="text-muted-foreground font-mono text-[11px]">
                                    ${grpIdx + 1}:
                                  </span>
                                  <span className="font-mono text-foreground font-medium truncate max-w-[200px]">
                                    {grpVal !== undefined ? grpVal : <em className="text-muted-foreground">undefined</em>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-panel space-y-2 p-3 sm:p-4">
              <label className="text-xs font-semibold text-foreground">Replacement String</label>
              <Input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Enter replacement pattern, e.g. [$1], $&, etc."
                className="font-mono text-xs sm:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports special tokens: <code className="text-foreground">$1</code>, <code className="text-foreground">$2</code> (captured groups), <code className="text-foreground">$&amp;</code> (whole match), <code className="text-foreground">$`</code> (before match), <code className="text-foreground">$&apos;</code> (after match).
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Replacement Output</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(substitutionResult, "replace-result")}
                  className="h-7 gap-1 text-xs"
                >
                  {copiedType === "replace-result" ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy Output
                    </>
                  )}
                </Button>
              </div>
              <div className="glass-panel min-h-[120px] whitespace-pre-wrap p-3 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed break-all select-all">
                {substitutionResult}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
