/**
 * Helpers for VS Code–style "active" indent guides: only tab-stop columns
 * that belong to the current line’s indent stack (not every column in the file).
 * Rendering uses a canvas overlay in `PrismOverlayEditor`, not CSS alone.
 */

export const EDITOR_TAB_SIZE = 2;

export function getLineIndexForOffset(text: string, offset: number): number {
  const safe = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  for (let i = 0; i < safe; i++) {
    if (text[i] === "\n") {
      line++;
    }
  }
  return line;
}

export function splitLines(text: string): string[] {
  if (text.length === 0) {
    return [""];
  }
  return text.split("\n");
}

/** Leading whitespace width in logical columns (tabs advance to next tab stop). */
export function leadingIndentColumns(line: string, tabSize: number): number {
  let col = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === " ") {
      col += 1;
    } else if (ch === "\t") {
      const step = tabSize - (col % tabSize);
      col += step;
    } else {
      break;
    }
  }
  return col;
}

/**
 * For empty / whitespace-only lines, use the nearest previous non-empty line’s
 * raw text (VS Code–like anchor for indent).
 */
export function indentReferenceLine(lines: string[], lineIndex: number): string {
  let i = Math.min(lineIndex, Math.max(0, lines.length - 1));
  while (i >= 0) {
    const raw = lines[i] ?? "";
    if (raw.trim().length > 0) {
      return raw;
    }
    i--;
  }
  return "";
}

/** 1-based column positions (tab stops) where guides should appear: tabSize, 2*tabSize, … ≤ indent. */
export function activeGuideColumns(indentColumns: number, tabSize: number): number[] {
  if (indentColumns < tabSize || tabSize < 1) {
    return [];
  }
  const out: number[] = [];
  for (let c = tabSize; c <= indentColumns; c += tabSize) {
    out.push(c);
  }
  return out;
}

export function measureCharWidthPx(textarea: HTMLTextAreaElement): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return 8;
  }
  const cs = getComputedStyle(textarea);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const w = ctx.measureText("MMMMMMMMMM").width / 10;
  return w > 0 ? w : 8;
}
