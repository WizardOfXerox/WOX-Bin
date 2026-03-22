"use client";

import { Braces, Copy, FileJson, Hash, KeyRound, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TabId = "csv-json" | "json-format" | "base64" | "hash" | "escapes";

function parseDelimited(text: string, delim: "," | "\t"): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    rows.push(line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim()));
  }
  return rows;
}

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) {
    return [];
  }
  const headers = rows[0]!;
  return rows.slice(1).map((cells) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      o[h || `col_${i}`] = cells[i] ?? "";
    });
    return o;
  });
}

function objectsToCsv(rows: Record<string, string>[], delim: "," | "\t"): string {
  if (rows.length === 0) {
    return "";
  }
  const keys = Object.keys(rows[0]!);
  const esc = (v: string) => {
    if (v.includes('"') || v.includes("\n") || v.includes(delim)) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const head = keys.map(esc).join(delim);
  const body = rows.map((r) => keys.map((k) => esc(r[k] ?? "")).join(delim)).join("\n");
  return `${head}\n${body}`;
}

function tabFromHash(hash: string): TabId {
  const h = hash.replace(/^#/, "");
  if (h.startsWith("json-format")) {
    return "json-format";
  }
  if (h.startsWith("base64")) {
    return "base64";
  }
  if (h.startsWith("hash") || h === "hash") {
    return "hash";
  }
  if (h.startsWith("escapes") || h.startsWith("url-encode") || h.startsWith("html-escape")) {
    return "escapes";
  }
  return "csv-json";
}

export default function DataLabClient({ className }: { className?: string }) {
  const csvId = useId();
  const jsonId = useId();
  const [tab, setTab] = useState<TabId>("csv-json");

  useEffect(() => {
    const apply = () => {
      const h = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      if (h === "csv-json" || h === "json-format" || h === "base64" || h === "hash" || h === "escapes") {
        setTab(h as TabId);
        return;
      }
      if (h === "csv-to-json" || h === "json-to-csv") {
        setDelimMode("csv");
        setTab("csv-json");
        return;
      }
      if (h === "tsv-to-json" || h === "json-to-tsv") {
        setDelimMode("tsv");
        setTab("csv-json");
        return;
      }
      setTab(tabFromHash(`#${h}`));
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const tabs: { id: TabId; label: string }[] = useMemo(
    () => [
      { id: "csv-json", label: "CSV / JSON / TSV" },
      { id: "json-format", label: "JSON format" },
      { id: "base64", label: "Base64" },
      { id: "hash", label: "SHA-256" },
      { id: "escapes", label: "URL & HTML" }
    ],
    []
  );

  /* —— CSV/JSON —— */
  const [delimMode, setDelimMode] = useState<"csv" | "tsv">("csv");
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [csvErr, setCsvErr] = useState<string | null>(null);

  const csvToJson = useCallback(() => {
    setCsvErr(null);
    try {
      const delim = delimMode === "tsv" ? "\t" : ",";
      const rows = parseDelimited(csvText, delim);
      const objs = rowsToObjects(rows);
      setJsonText(JSON.stringify(objs, null, 2));
    } catch (e) {
      setCsvErr(e instanceof Error ? e.message : "Failed");
    }
  }, [csvText, delimMode]);

  const jsonToDelimited = useCallback(() => {
    setCsvErr(null);
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0] !== "object") {
        setCsvErr("JSON must be a non-empty array of objects.");
        return;
      }
      const rows = parsed as Record<string, string>[];
      const delim = delimMode === "tsv" ? "\t" : ",";
      setCsvText(objectsToCsv(rows, delim));
    } catch (e) {
      setCsvErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [jsonText, delimMode]);

  /* —— JSON format —— */
  const [rawJson, setRawJson] = useState("");
  const [fmtErr, setFmtErr] = useState<string | null>(null);
  const [prettyJson, setPrettyJson] = useState("");

  const formatJson = useCallback((minify: boolean) => {
    setFmtErr(null);
    try {
      const v = JSON.parse(rawJson) as unknown;
      setPrettyJson(JSON.stringify(v, null, minify ? undefined : 2));
    } catch (e) {
      setFmtErr(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, [rawJson]);

  /* —— Base64 —— */
  const [b64Input, setB64Input] = useState("");
  const [b64Out, setB64Out] = useState("");
  const [b64Err, setB64Err] = useState<string | null>(null);

  const encode64 = useCallback(() => {
    setB64Err(null);
    try {
      const enc = new TextEncoder().encode(b64Input);
      let bin = "";
      enc.forEach((b) => (bin += String.fromCharCode(b)));
      setB64Out(btoa(bin));
    } catch (e) {
      setB64Err(e instanceof Error ? e.message : "Encode failed");
    }
  }, [b64Input]);

  const decode64 = useCallback(() => {
    setB64Err(null);
    try {
      const bin = atob(b64Input.trim());
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      setB64Out(new TextDecoder().decode(bytes));
    } catch (e) {
      setB64Err(e instanceof Error ? e.message : "Invalid Base64");
    }
  }, [b64Input]);

  /* —— Hash —— */
  const [hashFile, setHashFile] = useState<File | null>(null);
  const [hashHex, setHashHex] = useState("");
  const [hashBusy, setHashBusy] = useState(false);

  const runHash = useCallback(async () => {
    if (!hashFile) {
      return;
    }
    setHashBusy(true);
    setHashHex("");
    try {
      const buf = await hashFile.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      setHashHex(hex);
    } finally {
      setHashBusy(false);
    }
  }, [hashFile]);

  /* —— URL & HTML escapes —— */
  const [escInput, setEscInput] = useState("");
  const [escOut, setEscOut] = useState("");
  const [escErr, setEscErr] = useState<string | null>(null);

  const encodeUrl = useCallback(() => {
    setEscErr(null);
    try {
      setEscOut(encodeURIComponent(escInput));
    } catch (e) {
      setEscErr(e instanceof Error ? e.message : "Encode failed");
    }
  }, [escInput]);

  const decodeUrl = useCallback(() => {
    setEscErr(null);
    try {
      setEscOut(decodeURIComponent(escInput.trim()));
    } catch (e) {
      setEscErr(e instanceof Error ? e.message : "Invalid percent-encoding");
    }
  }, [escInput]);

  const encodeHtml = useCallback(() => {
    setEscErr(null);
    setEscOut(
      escInput
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
    );
  }, [escInput]);

  const decodeHtml = useCallback(() => {
    setEscErr(null);
    try {
      if (typeof document === "undefined") {
        setEscErr("Not available");
        return;
      }
      const t = document.createElement("textarea");
      t.innerHTML = escInput;
      setEscOut(t.value);
    } catch (e) {
      setEscErr(e instanceof Error ? e.message : "Decode failed");
    }
  }, [escInput]);

  return (
    <div className={cn("flex w-full max-w-4xl flex-col gap-4 sm:gap-6", className)}>
      <nav className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:gap-x-3 sm:text-sm">
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">Data lab</span>
      </nav>

      <header className="glass-panel space-y-1.5 px-4 py-4 sm:space-y-2 sm:px-6 sm:py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">
          Browser · no upload (except hash file)
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Text & data tools</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          CSV ↔ JSON, TSV ↔ JSON, JSON pretty/minify, Base64, URL/HTML escapes, and file SHA-256 — all local.
        </p>
      </header>

      <div className="glass-panel flex flex-wrap gap-1.5 p-2 sm:gap-2 sm:p-3">
        {tabs.map((t) => (
          <button
            className={cn(
              "min-h-9 touch-manipulation rounded-full border px-3 py-1.5 text-xs font-medium transition sm:min-h-0",
              tab === t.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
            )}
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (typeof window !== "undefined") {
                window.history.replaceState(null, "", `#${t.id}`);
              }
            }}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "csv-json" ? (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDelimMode("csv")} size="sm" type="button" variant={delimMode === "csv" ? "default" : "secondary"}>
              CSV
            </Button>
            <Button onClick={() => setDelimMode("tsv")} size="sm" type="button" variant={delimMode === "tsv" ? "default" : "secondary"}>
              TSV
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground text-xs font-medium">{delimMode.toUpperCase()}</span>
              <textarea
                className="border-input bg-background min-h-[min(200px,38dvh)] w-full rounded-md border p-3 font-mono text-xs sm:min-h-[200px]"
                id={csvId}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,age&#10;Ada,36"
                value={csvText}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground text-xs font-medium">JSON array</span>
              <textarea
                className="border-input bg-background min-h-[min(200px,38dvh)] w-full rounded-md border p-3 font-mono text-xs sm:min-h-[200px]"
                id={jsonId}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{ "name": "Ada", "age": "36" }]'
                value={jsonText}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={csvToJson} type="button" variant="secondary">
              <FileJson className="mr-2 size-4" />
              {delimMode === "tsv" ? "TSV → JSON" : "CSV → JSON"}
            </Button>
            <Button onClick={jsonToDelimited} type="button" variant="secondary">
              <Braces className="mr-2 size-4" />
              JSON → {delimMode === "tsv" ? "TSV" : "CSV"}
            </Button>
          </div>
          {csvErr ? <p className="text-destructive text-sm">{csvErr}</p> : null}
        </section>
      ) : null}

      {tab === "json-format" ? (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <textarea
            className="border-input bg-background min-h-[min(220px,38dvh)] w-full rounded-md border p-3 font-mono text-xs sm:min-h-[220px]"
            onChange={(e) => setRawJson(e.target.value)}
            placeholder='{"a":1}'
            value={rawJson}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => formatJson(false)} type="button">
              Pretty-print
            </Button>
            <Button onClick={() => formatJson(true)} type="button" variant="secondary">
              Minify
            </Button>
          </div>
          {fmtErr ? <p className="text-destructive text-sm">{fmtErr}</p> : null}
          {prettyJson ? (
            <pre className="bg-muted/40 max-h-64 overflow-auto rounded-md p-3 font-mono text-xs">{prettyJson}</pre>
          ) : null}
        </section>
      ) : null}

      {tab === "base64" ? (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <textarea
            className="border-input bg-background min-h-[min(160px,32dvh)] w-full rounded-md border p-3 font-mono text-xs sm:min-h-[160px]"
            onChange={(e) => setB64Input(e.target.value)}
            placeholder="Text or Base64"
            value={b64Input}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={encode64} type="button">
              <KeyRound className="mr-2 size-4" />
              Encode text → Base64
            </Button>
            <Button onClick={decode64} type="button" variant="secondary">
              Decode Base64 → text
            </Button>
          </div>
          {b64Err ? <p className="text-destructive text-sm">{b64Err}</p> : null}
          {b64Out ? (
            <div className="space-y-2">
              <pre className="bg-muted/40 max-h-48 overflow-auto break-all rounded-md p-3 font-mono text-xs">{b64Out}</pre>
              <Button
                onClick={() => void navigator.clipboard.writeText(b64Out)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Copy className="mr-2 size-4" />
                Copy
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "hash" ? (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <FileDropSurface
            className="min-h-[120px] rounded-lg border border-dashed p-4"
            onFiles={(fs) => setHashFile(fs[0] ?? null)}
            overlayMessage="Drop file for SHA-256"
          >
            <div className="flex flex-col gap-3">
              <Input
                onChange={(e) => setHashFile(e.target.files?.[0] ?? null)}
                type="file"
              />
              {hashFile ? <p className="text-muted-foreground text-xs">{hashFile.name}</p> : null}
              <Button disabled={!hashFile || hashBusy} onClick={() => void runHash()} type="button">
                {hashBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Hash className="mr-2 size-4" />}
                Compute SHA-256
              </Button>
              {hashHex ? (
                <code className="bg-muted/40 block break-all rounded-md p-3 font-mono text-xs">{hashHex}</code>
              ) : null}
            </div>
          </FileDropSurface>
        </section>
      ) : null}

      {tab === "escapes" ? (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <textarea
            className="border-input bg-background min-h-[160px] w-full rounded-md border p-3 font-mono text-xs"
            onChange={(e) => setEscInput(e.target.value)}
            placeholder="Paste text, a query string, or HTML entities…"
            value={escInput}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={encodeUrl} type="button" variant="secondary">
              <Link2 className="mr-2 size-4" />
              URL encode
            </Button>
            <Button onClick={decodeUrl} type="button" variant="secondary">
              URL decode
            </Button>
            <Button onClick={encodeHtml} type="button">
              Escape HTML
            </Button>
            <Button onClick={decodeHtml} type="button" variant="outline">
              Unescape HTML
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Uses <span className="font-mono">encodeURIComponent</span> / <span className="font-mono">decodeURIComponent</span> and basic HTML
            entity escaping. HTML unescape uses the browser&apos;s entity parser (paste encoded snippets only).
          </p>
          {escErr ? <p className="text-destructive text-sm">{escErr}</p> : null}
          {escOut ? (
            <div className="space-y-2">
              <pre className="bg-muted/40 max-h-48 overflow-auto break-all rounded-md p-3 font-mono text-xs">{escOut}</pre>
              <Button onClick={() => void navigator.clipboard.writeText(escOut)} size="sm" type="button" variant="outline">
                <Copy className="mr-2 size-4" />
                Copy
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
