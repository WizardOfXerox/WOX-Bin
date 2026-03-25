"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { Prism } from "@/lib/prism-setup";
import { buildPrivacyRedirectHref } from "@/lib/outbound-links";
import { prismGrammarForLanguage } from "@/lib/prism-language";

import "prismjs/themes/prism-tomorrow.css";

const MAX_LINES = 4000;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function trimTrailingUrlPunctuation(value: string) {
  let url = value;
  let trailing = "";

  while (url.length > 0 && /[.,!?;:)\]}]/.test(url[url.length - 1] ?? "")) {
    trailing = `${url[url.length - 1]}${trailing}`;
    url = url.slice(0, -1);
  }

  return {
    url,
    trailing
  };
}

function highlightLine(line: string, grammar: string): string {
  if (grammar === "plain" || !Prism.languages[grammar]) {
    return escapeHtml(line);
  }
  return Prism.highlight(line, Prism.languages[grammar]!, grammar);
}

function renderLinkedUrlSegment(url: string, trailing = "") {
  const href = buildPrivacyRedirectHref(url);
  return `<a class="wox-line-link" href="${escapeAttr(href)}">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
}

function renderLineHtml(line: string, grammar: string, linkifyUrls: boolean): string {
  if (!linkifyUrls) {
    return highlightLine(line, grammar);
  }

  let lastIndex = 0;
  let html = "";

  for (const match of line.matchAll(URL_RE)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const { url, trailing } = trimTrailingUrlPunctuation(raw);
    html += highlightLine(line.slice(lastIndex, index), grammar);
    html += renderLinkedUrlSegment(url, trailing);
    lastIndex = index + raw.length;
  }

  if (lastIndex === 0) {
    return highlightLine(line, grammar);
  }

  html += highlightLine(line.slice(lastIndex), grammar);
  return html;
}

type Props = {
  content: string;
  language: string;
  /** Default true. When false, hides the gutter (line anchors `#line-N` stay on each row). */
  showLineNumbers?: boolean;
  /** Default true. When false, removes horizontal rules between lines. */
  showLineSeparators?: boolean;
  /** Default true. When false, preserves long lines and allows horizontal scrolling. */
  wrapLongLines?: boolean;
  /** Public paste source view: convert visible URLs into clickable links. */
  linkifyUrls?: boolean;
};

/** Numbered lines with per-line Prism (jump links #line-N). */
export function PrismLineMap({
  content,
  language,
  showLineNumbers = true,
  showLineSeparators = true,
  wrapLongLines = true,
  linkifyUrls = false
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
          wrapLongLines
            ? "block whitespace-pre-wrap break-words font-mono text-sm leading-7 [tab-size:2] text-muted-foreground"
            : "block whitespace-pre font-mono text-sm leading-7 [tab-size:2] text-muted-foreground";
        el.innerHTML = renderLineHtml(line, "plain", linkifyUrls);
        return;
      }
      el.className = wrapLongLines
        ? `language-${grammar} block whitespace-pre-wrap break-words font-mono text-sm leading-7 [tab-size:2]`
        : `language-${grammar} block whitespace-pre font-mono text-sm leading-7 [tab-size:2]`;
      el.innerHTML = renderLineHtml(line, grammar, linkifyUrls);
    });
  }, [content, language, display, grammar, linkifyUrls, wrapLongLines]);

  return (
    <div
      className={
        wrapLongLines
          ? "rounded-[1.25rem] border border-border bg-muted/50 p-4 dark:bg-black/30"
          : "workspace-scrollbar-hide overflow-x-auto rounded-[1.25rem] border border-border bg-muted/50 p-4 dark:bg-black/30"
      }
    >
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
