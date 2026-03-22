"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { Prism } from "@/lib/prism-setup";
import { prismGrammarForLanguage } from "@/lib/prism-language";

import "prismjs/themes/prism-tomorrow.css";

const MAX_LINES = 4000;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightLine(line: string, grammar: string): string {
  if (grammar === "plain" || !Prism.languages[grammar]) {
    return escapeHtml(line);
  }
  return Prism.highlight(line, Prism.languages[grammar]!, grammar);
}

type Props = {
  content: string;
  language: string;
  /** Default true. When false, hides the gutter (line anchors `#line-N` stay on each row). */
  showLineNumbers?: boolean;
  /** Default true. When false, removes horizontal rules between lines. */
  showLineSeparators?: boolean;
};

/** Numbered lines with per-line Prism (jump links #line-N). */
export function PrismLineMap({
  content,
  language,
  showLineNumbers = true,
  showLineSeparators = true
}: Props) {
  /**
   * Markdown is rendered line-by-line; Prism’s markdown grammar on each row looks like random
   * “highlights” on prose and mis-colors fenced code. Show `.md` source as plain text — use Preview
   * (or language-specific paste) for real highlighting.
   */
  const grammar =
    language === "markdown" ? "plain" : prismGrammarForLanguage(language, content);
  const lines = useMemo(() => content.split("\n"), [content]);
  const truncated = lines.length > MAX_LINES;
  const display = useMemo(
    () => (truncated ? lines.slice(0, MAX_LINES) : lines),
    [lines, truncated]
  );
  const refs = useRef<(HTMLElement | null)[]>([]);

  useLayoutEffect(() => {
    refs.current = refs.current.slice(0, display.length);
    display.forEach((line, i) => {
      const el = refs.current[i];
      if (!el) {
        return;
      }
      if (grammar === "plain" || !Prism.languages[grammar]) {
        el.className =
          "block whitespace-pre-wrap break-words font-mono text-sm leading-7 [tab-size:2] text-muted-foreground";
        el.textContent = line;
        return;
      }
      el.className = `language-${grammar} block whitespace-pre-wrap break-words font-mono text-sm leading-7 [tab-size:2]`;
      el.innerHTML = highlightLine(line, grammar);
    });
  }, [content, language, display, grammar]);

  return (
    <div className="rounded-[1.25rem] border border-border bg-muted/50 p-4 dark:bg-black/30">
      {truncated ? (
        <p className="mb-3 text-xs text-amber-800 dark:text-amber-200/90">
          Showing first {MAX_LINES} lines (paste is very long). Use raw view for full text.
        </p>
      ) : null}
      <ol className="line-map m-0 list-none space-y-0 p-0 font-mono text-sm leading-7 [&>li]:list-none">
        {display.map((_, index) => (
          <li
            className={
              showLineSeparators
                ? "flex list-none gap-2 border-b border-border/60 py-0.5 marker:content-none last:border-b-0"
                : "flex list-none gap-2 py-0.5 marker:content-none"
            }
            id={`line-${index + 1}`}
            key={index}
          >
            {showLineNumbers ? (
              <span className="w-8 shrink-0 select-none text-right text-[10px] tabular-nums text-muted-foreground/70">
                {index + 1}
              </span>
            ) : null}
            <code
              className="min-w-0 flex-1"
              ref={(el) => {
                refs.current[index] = el;
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
