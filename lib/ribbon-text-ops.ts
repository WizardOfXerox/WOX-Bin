/**
 * Selection indices follow textarea semantics: slice(text, selectionStart, selectionEnd).
 */

import { blockRange } from "@/lib/editor-indent";

export type RangeEdit = { value: string; selStart: number; selEnd: number };

export function insertAtSelection(value: string, start: number, end: number, insert: string): RangeEdit {
  const next = value.slice(0, start) + insert + value.slice(end);
  const caret = start + insert.length;
  return { value: next, selStart: caret, selEnd: caret };
}

/** If collapsed, inserts wrappers and places caret between; else wraps selection. */
export function wrapSelection(value: string, start: number, end: number, before: string, after: string): RangeEdit {
  if (start === end) {
    const next = value.slice(0, start) + before + after + value.slice(end);
    const caret = start + before.length;
    return { value: next, selStart: caret, selEnd: caret };
  }
  const mid = value.slice(start, end);
  const wrapped = before + mid + after;
  const next = value.slice(0, start) + wrapped + value.slice(end);
  return { value: next, selStart: start, selEnd: start + wrapped.length };
}

export function mapBlockLines(
  value: string,
  start: number,
  end: number,
  mapLine: (line: string, lineIndex: number) => string
): RangeEdit {
  const { from, to } = blockRange(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split("\n");
  const out = lines.map(mapLine).join("\n");
  const next = value.slice(0, from) + out + value.slice(to);
  return { value: next, selStart: from, selEnd: from + out.length };
}

export function sortLinesInBlock(value: string, start: number, end: number): RangeEdit {
  const { from, to } = blockRange(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split("\n");
  lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const out = lines.join("\n");
  const next = value.slice(0, from) + out + value.slice(to);
  return { value: next, selStart: from, selEnd: from + out.length };
}

export function dedupeLinesInBlock(value: string, start: number, end: number): RangeEdit {
  const { from, to } = blockRange(value, start, end);
  const block = value.slice(from, to);
  const lines = block.split("\n");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    out.push(line);
  }
  const joined = out.join("\n");
  const next = value.slice(0, from) + joined + value.slice(to);
  return { value: next, selStart: from, selEnd: from + joined.length };
}

export function trimTrailingInBlock(value: string, start: number, end: number): RangeEdit {
  return mapBlockLines(value, start, end, (line) => line.replace(/\s+$/, ""));
}

export function bulletBlock(value: string, start: number, end: number): RangeEdit {
  return mapBlockLines(value, start, end, (line) => {
    const t = line.trimStart();
    if (t.startsWith("- ")) {
      return line;
    }
    const ws = line.slice(0, line.length - t.length);
    return `${ws}- ${t}`;
  });
}

export function numberBlock(value: string, start: number, end: number): RangeEdit {
  return mapBlockLines(value, start, end, (line, i) => {
    const t = line.trimStart();
    if (/^\d+\.\s/.test(t)) {
      return line;
    }
    const ws = line.slice(0, line.length - t.length);
    return `${ws}${i + 1}. ${t}`;
  });
}

export function quoteBlock(value: string, start: number, end: number): RangeEdit {
  return mapBlockLines(value, start, end, (line) => {
    const t = line.trimStart();
    if (t.startsWith("> ")) {
      return line;
    }
    const ws = line.slice(0, line.length - t.length);
    return `${ws}> ${t}`;
  });
}

export function transformSelectionCase(
  value: string,
  start: number,
  end: number,
  mode: "upper" | "lower" | "title"
): RangeEdit {
  if (start === end) {
    return { value, selStart: start, selEnd: end };
  }
  const sel = value.slice(start, end);
  let out = sel;
  if (mode === "upper") {
    out = sel.toUpperCase();
  } else if (mode === "lower") {
    out = sel.toLowerCase();
  } else {
    out = sel.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  const next = value.slice(0, start) + out + value.slice(end);
  return { value: next, selStart: start, selEnd: start + out.length };
}

export function insertHorizontalRule(value: string, start: number, end: number): RangeEdit {
  const insert = "\n\n---\n\n";
  return insertAtSelection(value, start, end, insert);
}

export function insertCodeFence(value: string, start: number, end: number, lang = ""): RangeEdit {
  const fence = `\n\`\`\`${lang}\n\n\`\`\`\n`;
  return insertAtSelection(value, start, end, fence);
}

export function insertMarkdownTable(value: string, start: number, end: number): RangeEdit {
  const t = `| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n`;
  return insertAtSelection(value, start, end, t);
}

export function timestampLocal(): string {
  const d = new Date();
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/** Duplicate the line(s) in the current block immediately below the block. */
export function duplicateBlockLines(value: string, start: number, end: number): RangeEdit {
  const { from, to } = blockRange(value, start, end);
  const block = value.slice(from, to);
  if (!block) {
    return { value, selStart: start, selEnd: end };
  }
  const ins = `\n${block}`;
  const next = value.slice(0, to) + ins + value.slice(to);
  const caret = to + ins.length;
  return { value: next, selStart: caret, selEnd: caret };
}
