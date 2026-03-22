"use client";

import { ArrowLeftRight, Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function TextHtmlConvertClient({
  mode,
  className
}: {
  mode: "txt-html" | "html-txt";
  className?: string;
}) {
  const [input, setInput] = useState(mode === "txt-html" ? "Hello\nWorld" : "<p>Hello <strong>world</strong></p>");
  const [output, setOutput] = useState("");

  const run = useCallback(() => {
    if (mode === "txt-html") {
      setOutput(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Text</title></head><body><pre>${escapeHtml(input)}</pre></body></html>`);
    } else {
      try {
        const doc = new DOMParser().parseFromString(input, "text/html");
        setOutput(doc.body.textContent ?? "");
      } catch {
        setOutput("");
      }
    }
  }, [input, mode]);

  const download = useCallback(() => {
    if (!output) {
      return;
    }
    const blob = new Blob([output], {
      type: mode === "txt-html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = mode === "txt-html" ? "from-text.html" : "from-html.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, [output, mode]);

  const title = mode === "txt-html" ? "Plain text → HTML" : "HTML → plain text";

  return (
    <div className={cn(TOOLS_CLIENT_NARROW, className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {mode === "txt-html"
            ? "Wraps text in a minimal HTML document with a safe <pre> escape."
            : "Strips tags using the browser DOM — not a full HTML→text extractor for complex layouts."}
        </p>
      </header>

      <label className="glass-panel flex flex-col gap-2 p-3 sm:p-4">
        <span className="text-muted-foreground text-xs font-medium">Input</span>
        <Textarea
          className="min-h-[min(200px,38dvh)] font-mono text-sm sm:min-h-[200px]"
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
      </label>

      <div className="flex flex-wrap gap-2 touch-manipulation">
        <Button className="min-h-10 sm:min-h-9" onClick={run} type="button">
          <ArrowLeftRight className="mr-2 size-4" />
          Convert
        </Button>
        <Button className="min-h-10 sm:min-h-9" disabled={!output} onClick={download} type="button" variant="secondary">
          <Download className="mr-2 size-4" />
          Download
        </Button>
      </div>

      {output ? (
        <label className="glass-panel flex flex-col gap-2 p-3 sm:p-4">
          <span className="text-muted-foreground text-xs font-medium">Output</span>
          <Textarea className="min-h-[min(200px,38dvh)] font-mono text-sm sm:min-h-[200px]" readOnly value={output} />
        </label>
      ) : null}
    </div>
  );
}
