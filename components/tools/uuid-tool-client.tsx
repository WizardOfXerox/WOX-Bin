"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Fingerprint,
  Info,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

type IdType = "uuidv4" | "uuidv7" | "ulid" | "nanoid";

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const DEFAULT_NANOID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";

function generateUUIDv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // v4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, "0"));
  }
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

function generateUUIDv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const timestamp = Date.now();
  // 48-bit timestamp
  bytes[0] = Math.floor(timestamp / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(timestamp / 0x100000000) & 0xff;
  bytes[2] = Math.floor(timestamp / 0x1000000) & 0xff;
  bytes[3] = Math.floor(timestamp / 0x10000) & 0xff;
  bytes[4] = Math.floor(timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  // version 7 (0b0111)
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant RFC 4122 (0b10)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, "0"));
  }
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

function generateULID(): string {
  const timestamp = Date.now();
  let timeStr = "";
  let t = timestamp;
  for (let i = 9; i >= 0; i--) {
    timeStr = CROCKFORD_BASE32[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }

  const randBytes = new Uint8Array(16);
  crypto.getRandomValues(randBytes);
  let randStr = "";
  for (let i = 0; i < 16; i++) {
    randStr += CROCKFORD_BASE32[randBytes[i]! % 32];
  }

  return timeStr + randStr;
}

function generateNanoID(alphabet: string, length: number): string {
  if (!alphabet || length <= 0) return "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

export function UuidToolClient() {
  const [idType, setIdType] = useState<IdType>("uuidv4");
  const [count, setCount] = useState<number>(10);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [hyphens, setHyphens] = useState<boolean>(true);

  // NanoID specific config
  const [nanoidLength, setNanoidLength] = useState<number>(21);
  const [nanoidAlphabet, setNanoidAlphabet] = useState<string>(DEFAULT_NANOID_ALPHABET);

  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const generateList = useCallback(() => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      let raw = "";
      if (idType === "uuidv4") {
        raw = generateUUIDv4();
      } else if (idType === "uuidv7") {
        raw = generateUUIDv7();
      } else if (idType === "ulid") {
        raw = generateULID();
      } else if (idType === "nanoid") {
        raw = generateNanoID(nanoidAlphabet, nanoidLength);
      }

      // Formatting
      if (idType === "uuidv4" || idType === "uuidv7") {
        if (!hyphens) {
          raw = raw.replace(/-/g, "");
        }
      }

      raw = uppercase ? raw.toUpperCase() : raw.toLowerCase();
      list.push(raw);
    }
    setGeneratedIds(list);
  }, [idType, count, uppercase, hyphens, nanoidAlphabet, nanoidLength]);

  // Initial and reactive generation
  useEffect(() => {
    generateList();
  }, [generateList]);

  // Inspect timestamp embedded inside UUIDv7 or ULID
  const timestampInspection = useMemo(() => {
    if (!generatedIds.length) return null;
    const sample = generatedIds[0]!;

    if (idType === "uuidv7") {
      try {
        const clean = sample.replace(/-/g, "").toLowerCase();
        if (clean.length === 32) {
          const timestampHex = clean.slice(0, 12);
          const ms = parseInt(timestampHex, 16);
          if (!isNaN(ms)) {
            const date = new Date(ms);
            return {
              type: "UUIDv7 Timestamp",
              date: date.toISOString(),
              local: date.toLocaleString(),
              epoch: ms
            };
          }
        }
      } catch {
        return null;
      }
    } else if (idType === "ulid") {
      try {
        const upper = sample.toUpperCase();
        if (upper.length === 26) {
          const timePart = upper.slice(0, 10);
          let ms = 0;
          for (let i = 0; i < 10; i++) {
            const char = timePart[i]!;
            const val = CROCKFORD_BASE32.indexOf(char);
            if (val === -1) return null;
            ms = ms * 32 + val;
          }
          const date = new Date(ms);
          return {
            type: "ULID Timestamp",
            date: date.toISOString(),
            local: date.toLocaleString(),
            epoch: ms
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }, [generatedIds, idType]);

  const copySingle = async (id: string, index: number) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(`${index}`);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(generatedIds.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // ignore
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([generatedIds.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idType}-list-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const data = JSON.stringify(generatedIds, null, 2);
    const blob = new Blob([data], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${idType}-list-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        <span className="font-medium text-foreground">UUID / ULID / NanoID Generator</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Fingerprint className="size-4" />
          Unique Identifier Suite
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">UUID, ULID & NanoID Generator</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Generate cryptographically secure UUIDv4, time-ordered UUIDv7, ULID, and customizable NanoIDs. Fast bulk
          generation with copy and export options.
        </p>
      </header>

      {/* Type Selector Tabs */}
      <div className="glass-panel p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setIdType("uuidv4")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              idType === "uuidv4"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            <span className="text-xs font-bold">UUIDv4</span>
            <span className="text-[11px] opacity-80">128-bit Random RFC 4122</span>
          </button>

          <button
            type="button"
            onClick={() => setIdType("uuidv7")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              idType === "uuidv7"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            <span className="text-xs font-bold">UUIDv7</span>
            <span className="text-[11px] opacity-80">Time-ordered RFC 9562</span>
          </button>

          <button
            type="button"
            onClick={() => setIdType("ulid")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              idType === "ulid"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            <span className="text-xs font-bold">ULID</span>
            <span className="text-[11px] opacity-80">26-char Base32 sortable</span>
          </button>

          <button
            type="button"
            onClick={() => setIdType("nanoid")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
              idType === "nanoid"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
            )}
          >
            <span className="text-xs font-bold">NanoID</span>
            <span className="text-[11px] opacity-80">Custom alphabet & length</span>
          </button>
        </div>

        {/* Generator Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Count:</span>
            {[1, 5, 10, 25, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={cn(
                  "h-7 min-w-[28px] rounded-lg border px-2 text-xs font-semibold transition-colors",
                  count === num
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Uppercase / Lowercase toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUppercase(!uppercase)}
              className="h-7 text-xs"
            >
              {uppercase ? "UPPERCASE" : "lowercase"}
            </Button>

            {/* Hyphens toggle (only for UUIDs) */}
            {(idType === "uuidv4" || idType === "uuidv7") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setHyphens(!hyphens)}
                className="h-7 text-xs"
              >
                {hyphens ? "With Hyphens" : "No Hyphens"}
              </Button>
            )}

            {/* Regenerate Button */}
            <Button size="sm" onClick={generateList} className="h-7 gap-1.5 text-xs">
              <RefreshCw className="size-3" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* NanoID Settings Panel (if selected) */}
        {idType === "nanoid" && (
          <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Settings2 className="size-3.5 text-primary" />
              NanoID Configuration
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Length ({nanoidLength})</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={4}
                    max={128}
                    value={nanoidLength}
                    onChange={(e) => setNanoidLength(Math.max(1, parseInt(e.target.value) || 21))}
                    className="h-8 font-mono text-xs"
                  />
                  {[12, 16, 21, 32].map((presetLen) => (
                    <button
                      key={presetLen}
                      type="button"
                      onClick={() => setNanoidLength(presetLen)}
                      className={cn(
                        "h-8 rounded-lg border px-2 text-xs font-mono transition-colors",
                        nanoidLength === presetLen
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {presetLen}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Alphabet ({nanoidAlphabet.length} characters)
                </label>
                <Input
                  type="text"
                  value={nanoidAlphabet}
                  onChange={(e) => setNanoidAlphabet(e.target.value || DEFAULT_NANOID_ALPHABET)}
                  placeholder="Allowed characters..."
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Timestamp Decoded Inspector Banner */}
        {timestampInspection && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <Clock className="size-4 shrink-0" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{timestampInspection.type}:</span>
              <span>UTC: <code className="font-mono">{timestampInspection.date}</code></span>
              <span>Local: <code className="font-mono">{timestampInspection.local}</code></span>
            </div>
          </div>
        )}
      </div>

      {/* Generated IDs Results Box */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Generated Identifiers ({generatedIds.length})</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyAll} className="h-7 gap-1 text-xs">
              {copiedAll ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  All Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy All
                </>
              )}
            </Button>

            <Button size="sm" variant="outline" onClick={downloadTxt} className="h-7 gap-1 text-xs">
              <Download className="size-3" />
              .txt
            </Button>

            <Button size="sm" variant="outline" onClick={downloadJson} className="h-7 gap-1 text-xs">
              <Download className="size-3" />
              .json
            </Button>
          </div>
        </div>

        <div className="glass-panel space-y-1.5 p-2 sm:p-3 max-h-[460px] overflow-y-auto">
          {generatedIds.map((id, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">
                  #{index + 1}
                </span>
                <span className="font-mono text-xs sm:text-sm font-medium tracking-tight text-foreground truncate select-all">
                  {id}
                </span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => copySingle(id, index)}
                className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                title="Copy identifier"
              >
                {copiedId === `${index}` ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
