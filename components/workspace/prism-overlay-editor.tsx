"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent
} from "react";

import {
  EDITOR_TAB_SIZE,
  activeGuideColumns,
  getLineIndexForOffset,
  indentReferenceLine,
  leadingIndentColumns,
  measureCharWidthPx,
  splitLines
} from "@/lib/active-indent-guides";
import { findBracketPairAtCursor } from "@/lib/bracket-match";
import { unwrapBracketMarks, wrapBracketMatchesInHighlight } from "@/lib/bracket-highlight-dom";
import { applyShiftTab, applyTab, continuationIndent } from "@/lib/editor-indent";
import { dataTransferHasFiles } from "@/lib/file-drop";
import { Prism } from "@/lib/prism-setup";
import { prismGrammarForLanguage } from "@/lib/prism-language";
import { cn } from "@/lib/utils";

import "prismjs/themes/prism-tomorrow.css";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PrismScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export type PrismOverlayEditorHandle = {
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  getSelectionStart: () => number;
  getSelectionEnd: () => number;
  getValue: () => string;
  getScrollMetrics: () => PrismScrollMetrics | null;
  /** 0–1 of max scroll */
  setScrollRatio: (ratio: number) => void;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  language: string;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** When true, accept file drops as text (first file). */
  enableFileDrop?: boolean;
  /** Fires when the textarea scrolls (e.g. markdown preview sync). */
  onScrollInfo?: (info: PrismScrollMetrics) => void;
  /** Left gutter with line numbers (synced on scroll). */
  lineNumbers?: boolean;
  /** Soft wrap in the editor (matches highlight layer). */
  wordWrap?: boolean;
  /** Light backdrop for light syntax themes (e.g. Coy). */
  syntaxLight?: boolean;
  /** Override monospace size / line-height (pixels). */
  editorFontSizePx?: number;
  /**
   * VS Code–style indent guides only at tab stops for the caret line’s indent stack.
   * Rendered via canvas overlay (content-aware); hidden while `wordWrap` is on.
   */
  activeIndentGuides?: boolean;
  /** Read-only (e.g. public feed preview in workspace). */
  readOnly?: boolean;
};

export const PrismOverlayEditor = forwardRef<PrismOverlayEditorHandle, Props>(function PrismOverlayEditor(
  {
    value,
    onChange,
    language,
    placeholder,
    minHeight = "min-h-[55vh]",
    className,
    onKeyDown,
    enableFileDrop,
    onScrollInfo,
    lineNumbers = false,
    wordWrap = false,
    syntaxLight = false,
    editorFontSizePx,
    activeIndentGuides = false,
    readOnly = false
  },
  ref
) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const gutterInnerRef = useRef<HTMLDivElement>(null);
  const guidesCanvasRef = useRef<HTMLCanvasElement>(null);
  /** Drives bracket overlay refresh on caret moves without changing `value`. */
  const [bracketCaret, setBracketCaret] = useState(0);
  const fileDragDepth = useRef(0);
  const [fileDropHighlight, setFileDropHighlight] = useState(false);

  const lineCount = useMemo(() => Math.max(1, value.split("\n").length), [value]);

  const lineNumberEls = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => (
        <div key={i + 1} className="min-h-[var(--wox-editor-lh)]">
          {i + 1}
        </div>
      )),
    [lineCount]
  );

  function syncMirroredScroll() {
    const ta = taRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
      if (gutterInnerRef.current) {
        gutterInnerRef.current.style.transform = `translateY(-${ta.scrollTop}px)`;
      }
      onScrollInfo?.({
        scrollTop: ta.scrollTop,
        scrollHeight: ta.scrollHeight,
        clientHeight: ta.clientHeight
      });
    }
  }

  function revealSelection(start: number) {
    const ta = taRef.current;
    if (!ta) {
      return;
    }
    const style = window.getComputedStyle(ta);
    const lineHeight = Number.parseFloat(style.lineHeight) || 24;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const targetLine = value.slice(0, start).split("\n").length - 1;
    const targetTop = paddingTop + targetLine * lineHeight;
    const targetBottom = targetTop + lineHeight;
    const margin = lineHeight * 2;

    if (targetTop < ta.scrollTop + margin) {
      ta.scrollTop = Math.max(0, targetTop - margin);
    } else if (targetBottom > ta.scrollTop + ta.clientHeight - margin) {
      ta.scrollTop = Math.max(0, targetBottom - ta.clientHeight + margin);
    }

    syncMirroredScroll();
  }

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    setSelectionRange: (start, end) => {
      const ta = taRef.current;
      if (!ta) {
        return;
      }
      ta.setSelectionRange(start, end);
      setBracketCaret(start);
      revealSelection(start);
    },
    getSelectionStart: () => taRef.current?.selectionStart ?? 0,
    getSelectionEnd: () => taRef.current?.selectionEnd ?? 0,
    getValue: () => value,
    getScrollMetrics: () => {
      const ta = taRef.current;
      if (!ta) {
        return null;
      }
      return {
        scrollTop: ta.scrollTop,
        scrollHeight: ta.scrollHeight,
        clientHeight: ta.clientHeight
      };
    },
    setScrollRatio: (ratio: number) => {
      const ta = taRef.current;
      const pre = preRef.current;
      if (!ta || !pre) {
        return;
      }
      const max = Math.max(1, ta.scrollHeight - ta.clientHeight);
      const top = Math.max(0, Math.min(max, ratio * max));
      ta.scrollTop = top;
      pre.scrollTop = top;
      if (gutterInnerRef.current) {
        gutterInnerRef.current.style.transform = `translateY(-${top}px)`;
      }
    }
  }));

  useLayoutEffect(() => {
    if (!codeRef.current) {
      return;
    }

    const grammar = prismGrammarForLanguage(language, value);
    const el = codeRef.current;

    const wrap = wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre";

    if (grammar === "plain") {
      el.className = `block font-mono text-muted-foreground ${wrap}`;
      el.removeAttribute("data-language");
      el.innerHTML = escapeHtml(value);
    } else {
      const langObj = Prism.languages[grammar];
      if (!langObj) {
        el.className = `block font-mono text-muted-foreground ${wrap}`;
        el.innerHTML = escapeHtml(value);
      } else {
        el.className = `language-${grammar} block font-mono ${wrap}`;
        el.setAttribute("data-language", grammar);
        el.innerHTML = Prism.highlight(value, langObj, grammar);
      }
    }

    unwrapBracketMarks(el);
    const ta = taRef.current;
    const caret = ta ? ta.selectionStart : bracketCaret;
    const pair = findBracketPairAtCursor(value, caret);
    if (pair) {
      wrapBracketMatchesInHighlight(el, pair.start, pair.end);
    }
  }, [value, language, wordWrap, bracketCaret]);

  function syncCaretFromTextarea() {
    const ta = taRef.current;
    if (ta) {
      setBracketCaret(ta.selectionStart);
    }
  }

  useLayoutEffect(() => {
    const ta = taRef.current;
    const g = gutterInnerRef.current;
    if (!lineNumbers || !ta || !g) {
      return;
    }
    g.style.transform = `translateY(-${ta.scrollTop}px)`;
  }, [lineNumbers, value, lineCount]);

  const drawActiveIndentGuides = useCallback(() => {
    if (!activeIndentGuides || wordWrap) {
      return;
    }
    const ta = taRef.current;
    const canvas = guidesCanvasRef.current;
    if (!ta || !canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const caret = ta.selectionStart ?? bracketCaret;
    const lines = splitLines(value);
    const lineIdx = getLineIndexForOffset(value, caret);
    const refLine = indentReferenceLine(lines, lineIdx);
    const indentCols = leadingIndentColumns(refLine, EDITOR_TAB_SIZE);
    const columns = activeGuideColumns(indentCols, EDITOR_TAB_SIZE);
    if (columns.length === 0) {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const cw = ta.clientWidth;
      const ch = ta.clientHeight;
      canvas.width = Math.max(1, Math.floor(cw * dpr));
      canvas.height = Math.max(1, Math.floor(ch * dpr));
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const padL = parseFloat(getComputedStyle(ta).paddingLeft) || 0;
    const chW = measureCharWidthPx(ta);
    const highContrast = typeof document !== "undefined" && document.body.classList.contains("wox-high-contrast");
    const stroke = syntaxLight
      ? highContrast
        ? "rgba(0,0,0,0.35)"
        : "rgba(0,0,0,0.14)"
      : highContrast
        ? "rgba(255,255,255,0.45)"
        : "rgba(255,255,255,0.16)";

    const dpr = window.devicePixelRatio || 1;
    const cw = ta.clientWidth;
    const ch = ta.clientHeight;
    canvas.width = Math.max(1, Math.floor(cw * dpr));
    canvas.height = Math.max(1, Math.floor(ch * dpr));
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const scrollLeft = ta.scrollLeft;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    for (const col of columns) {
      const xDoc = padL + col * chW;
      const x = xDoc - scrollLeft;
      if (x < -2 || x > cw + 2) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, ch);
      ctx.stroke();
    }
  }, [activeIndentGuides, wordWrap, value, bracketCaret, syntaxLight]);

  useLayoutEffect(() => {
    drawActiveIndentGuides();
  }, [drawActiveIndentGuides, editorFontSizePx]);

  useEffect(() => {
    if (!activeIndentGuides || wordWrap) {
      return;
    }
    const ta = taRef.current;
    if (!ta) {
      return;
    }
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => drawActiveIndentGuides());
    };
    ta.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(ta);
    schedule();
    return () => {
      ta.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [activeIndentGuides, wordWrap, drawActiveIndentGuides]);

  function syncScroll() {
    syncMirroredScroll();
  }

  const lh = editorFontSizePx ? Math.round(editorFontSizePx * 1.65) : undefined;
  const rootStyle =
    editorFontSizePx && lh
      ? ({
          ["--wox-editor-fs" as string]: `${editorFontSizePx}px`,
          ["--wox-editor-lh" as string]: `${lh}px`
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={cn(
        "wox-prism-editor editor-container group relative flex min-h-0 min-w-0 overflow-hidden rounded-[1.25rem] border border-border bg-muted dark:bg-black/40",
        lineNumbers && "wox-prism-editor--line-gutter",
        syntaxLight && "syntax-light border-zinc-200 bg-zinc-100 text-zinc-900",
        minHeight,
        enableFileDrop && !readOnly && fileDropHighlight && "border-primary/60 ring-2 ring-primary/35",
        className
      )}
      style={rootStyle}
      onDragEnter={
        enableFileDrop && !readOnly
          ? (e) => {
              if (!dataTransferHasFiles(e.dataTransfer)) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              fileDragDepth.current += 1;
              setFileDropHighlight(true);
            }
          : undefined
      }
      onDragLeave={
        enableFileDrop && !readOnly
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              fileDragDepth.current -= 1;
              if (fileDragDepth.current <= 0) {
                fileDragDepth.current = 0;
                setFileDropHighlight(false);
              }
            }
          : undefined
      }
      onDragOver={
        enableFileDrop && !readOnly
          ? (e) => {
              if (!dataTransferHasFiles(e.dataTransfer)) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "copy";
            }
          : undefined
      }
      onDrop={
        enableFileDrop && !readOnly
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              fileDragDepth.current = 0;
              setFileDropHighlight(false);
              const file = e.dataTransfer.files[0];
              if (!file) {
                return;
              }
              void file.text().then((text) => {
                onChange(value ? `${value}\n${text}` : text);
              });
            }
          : undefined
      }
    >
      {enableFileDrop && !readOnly && fileDropHighlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-2 z-20 mx-auto w-fit max-w-[90%] rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-center text-[10px] font-medium text-primary backdrop-blur-sm"
        >
          Drop file to append text
        </div>
      ) : null}
      {lineNumbers ? (
        <div
          aria-hidden
          className={cn(
            "relative w-9 shrink-0 overflow-hidden border-r bg-transparent font-mono text-[10px] tabular-nums leading-[var(--wox-editor-lh)] text-muted-foreground/70",
            syntaxLight ? "border-zinc-200/60" : "border-white/[0.06]"
          )}
          style={{
            paddingTop: "var(--wox-editor-pad-y)",
            paddingBottom: "var(--wox-editor-pad-y)"
          }}
        >
          <div ref={gutterInnerRef} className="pr-0.5 text-right will-change-transform">
            {lineNumberEls}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1">
        <pre
          ref={preRef}
          aria-hidden
          className={cn(
            "highlight-wrap pointer-events-none absolute inset-0 m-0 overflow-auto",
            lineNumbers ? "rounded-r-[1.25rem] rounded-l-none" : "rounded-[1.25rem]"
          )}
          tabIndex={-1}
        >
          <code ref={codeRef} className="block" />
        </pre>
        <textarea
          ref={taRef}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            "wox-prism-ta relative z-10 min-h-full w-full resize-none bg-transparent [tab-size:2]",
            lineNumbers ? "rounded-r-[1.25rem] rounded-l-none" : "rounded-[1.25rem]",
            syntaxLight ? "caret-zinc-900 selection:bg-zinc-300/40" : "caret-[hsl(var(--primary))] selection:bg-primary/25",
            "text-transparent",
            wordWrap && "whitespace-pre-wrap break-words",
            "placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          )}
          readOnly={readOnly}
          onChange={(e) => {
            if (readOnly) {
              return;
            }
            onChange(e.target.value);
            setBracketCaret(e.target.selectionStart);
          }}
          onClick={syncCaretFromTextarea}
          onKeyDown={(e) => {
            const ta = taRef.current;
            if (ta && e.key === "Tab") {
              e.preventDefault();
              const { value: nextVal, selStart, selEnd } = e.shiftKey
                ? applyShiftTab(value, ta.selectionStart, ta.selectionEnd)
                : applyTab(value, ta.selectionStart, ta.selectionEnd);
              if (nextVal !== value) {
                onChange(nextVal);
              }
              window.requestAnimationFrame(() => {
                ta.setSelectionRange(selStart, selEnd);
                setBracketCaret(selStart);
              });
              return;
            }

            if (
              ta &&
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              !e.ctrlKey &&
              !e.altKey &&
              !e.metaKey
            ) {
              const insert = continuationIndent(value, ta.selectionStart);
              if (insert) {
                e.preventDefault();
                const s = ta.selectionStart;
                const end = ta.selectionEnd;
                const nextVal = value.slice(0, s) + insert + value.slice(end);
                onChange(nextVal);
                const caret = s + insert.length;
                window.requestAnimationFrame(() => {
                  ta.setSelectionRange(caret, caret);
                  setBracketCaret(caret);
                });
                return;
              }
            }

            onKeyDown?.(e);
            window.requestAnimationFrame(syncCaretFromTextarea);
          }}
          onKeyUp={syncCaretFromTextarea}
          onSelect={syncCaretFromTextarea}
          onScroll={syncScroll}
          placeholder={placeholder}
          spellCheck={false}
          value={value}
          wrap={wordWrap ? "soft" : "off"}
        />
        {activeIndentGuides && !wordWrap ? (
          <canvas
            aria-hidden
            className={cn(
              /* Above textarea (z-10) so guides are visible through transparent text; still receive no pointer hits */
              "pointer-events-none absolute inset-0 z-[12] block",
              lineNumbers ? "rounded-r-[1.25rem] rounded-l-none" : "rounded-[1.25rem]"
            )}
            ref={guidesCanvasRef}
          />
        ) : null}
      </div>
    </div>
  );
});
