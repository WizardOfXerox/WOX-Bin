"use client";

import { Code2, Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Textarea } from "@/components/ui/textarea";
import { parseUserMarkdown } from "@/lib/markdown/parse-user-markdown";
import { cn } from "@/lib/utils";

export default function MarkdownHtmlClient({ className }: { className?: string }) {
  const id = useId();
  const [md, setMd] = useState("# Hello\n\nWOX-Bin **markdown** → HTML.");
  const [sanitized, setSanitized] = useState("");

  const convert = useCallback(() => {
    setSanitized(parseUserMarkdown(md, { breaks: true }));
  }, [md]);

  const downloadHtml = useCallback(() => {
    if (!sanitized) {
      return;
    }
    const blob = new Blob(
      [
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Export</title></head><body>`,
        sanitized,
        `</body></html>`
      ],
      { type: "text/html;charset=utf-8" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "export.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, [sanitized]);

  return (
    <div className={cn("flex w-full flex-col gap-4 sm:gap-6", className)}>
      <nav className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:gap-x-3 sm:text-sm">
        <Link className="hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Markdown → HTML</span>
      </nav>

      <header className="glass-panel space-y-1.5 px-4 py-4 sm:space-y-2 sm:px-6 sm:py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Markdown to HTML</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Standard Markdown via <span className="font-mono text-xs">marked</span>, plus optional{" "}
          <a className="text-primary underline" href="https://rentry.co/" rel="noopener noreferrer" target="_blank">
            Rentry
          </a>
          -style extras (highlights, colors, TOC, spoilers, admonitions, …) — then sanitized. See{" "}
          <span className="font-mono text-xs">docs/MARKDOWN-RENTY-SUBSET.md</span>.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
        <label className="glass-panel flex flex-col gap-2 p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Markdown</span>
          <Textarea
            className="min-h-[min(280px,42dvh)] font-mono text-sm sm:min-h-[280px]"
            id={id}
            onChange={(e) => setMd(e.target.value)}
            value={md}
          />
        </label>
        <div className="glass-panel flex flex-col gap-2 p-3 sm:p-4">
          <span className="text-xs font-medium text-muted-foreground">Preview</span>
          <div
            className="wox-user-markdown min-h-[min(280px,42dvh)] max-w-none rounded-md border bg-muted/20 p-3 text-sm leading-relaxed text-foreground sm:min-h-[280px] sm:p-4 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:list-disc"
            dangerouslySetInnerHTML={sanitized ? { __html: sanitized } : undefined}
          />
          {!sanitized ? <p className="text-muted-foreground text-sm">Click Render to preview.</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 touch-manipulation">
        <Button className="min-h-10 sm:min-h-9" onClick={convert} type="button">
          <Code2 className="mr-2 size-4" />
          Render
        </Button>
        <Button className="min-h-10 sm:min-h-9" disabled={!sanitized} onClick={downloadHtml} type="button" variant="secondary">
          <Download className="mr-2 size-4" />
          Download .html
        </Button>
      </div>

      <FileDropSurface
        className="glass-panel rounded-lg p-4"
        onFiles={async (files) => {
          const t = await files[0]?.text();
          if (t) {
            setMd(t);
          }
        }}
        overlayMessage="Drop .md file"
      >
        <p className="text-muted-foreground text-center text-sm">Or drop a Markdown file here.</p>
      </FileDropSurface>
    </div>
  );
}
