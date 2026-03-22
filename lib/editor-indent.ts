/**
 * Textarea selection uses half-open indices [selectionStart, selectionEnd) for slice().
 */

/** Full line block that overlaps the selection (or the line under the caret). */
export function blockRange(value: string, start: number, end: number): { from: number; to: number } {
  const lo = Math.min(start, end);
  const hiExclusive = Math.max(start, end);
  const from = lo <= 0 ? 0 : value.lastIndexOf("\n", lo - 1) + 1;
  const lastIdx = hiExclusive > lo ? hiExclusive - 1 : lo;
  let to = value.indexOf("\n", lastIdx);
  if (to === -1) {
    to = value.length;
  }
  return { from, to };
}

function splitBlock(block: string): string[] {
  return block.split("\n");
}

/** Insert a tab at the caret, or indent every line in the selection block. */
export function applyTab(value: string, selStart: number, selEnd: number): { value: string; selStart: number; selEnd: number } {
  if (selStart !== selEnd) {
    const { from, to } = blockRange(value, selStart, selEnd);
    const block = value.slice(from, to);
    const lines = splitBlock(block);
    const indented = lines.map((line) => "\t" + line).join("\n");
    const next = value.slice(0, from) + indented + value.slice(to);
    return { value: next, selStart: from, selEnd: from + indented.length };
  }

  const pos = selStart;
  const next = value.slice(0, pos) + "\t" + value.slice(pos);
  return { value: next, selStart: pos + 1, selEnd: pos + 1 };
}

/** Remove one leading tab or two spaces from each line in the block; or unindent current line if no selection. */
export function applyShiftTab(value: string, selStart: number, selEnd: number): { value: string; selStart: number; selEnd: number } {
  const unindentLine = (line: string) => {
    if (line.startsWith("\t")) {
      return line.slice(1);
    }
    if (line.startsWith("  ")) {
      return line.slice(2);
    }
    return line;
  };

  if (selStart !== selEnd) {
    const { from, to } = blockRange(value, selStart, selEnd);
    const block = value.slice(from, to);
    const lines = splitBlock(block);
    const out = lines.map(unindentLine).join("\n");
    const next = value.slice(0, from) + out + value.slice(to);
    return { value: next, selStart: from, selEnd: from + out.length };
  }

  const { from, to } = blockRange(value, selStart, selStart);
  const line = value.slice(from, to);
  const newLine = unindentLine(line);
  if (newLine === line) {
    return { value, selStart, selEnd };
  }
  const next = value.slice(0, from) + newLine + value.slice(to);
  const delta = line.length - newLine.length;
  const col = Math.min(Math.max(selStart, from), from + line.length);
  const pos = Math.max(from, col - delta);
  return { value: next, selStart: pos, selEnd: pos };
}

/** Leading whitespace at the start of the line containing index `pos`. */
export function leadingIndentOfLine(value: string, pos: number): string {
  const lineStart = pos <= 0 ? 0 : value.lastIndexOf("\n", pos - 1) + 1;
  const lineEnd = value.indexOf("\n", lineStart);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const line = value.slice(lineStart, end);
  const m = /^[\t ]+/.exec(line);
  return m ? m[0] : "";
}

/** Text to insert when pressing Enter after `pos` (newline + same indent as current line). */
export function continuationIndent(value: string, pos: number): string | null {
  const indent = leadingIndentOfLine(value, pos);
  if (!indent) {
    return null;
  }
  return "\n" + indent;
}
