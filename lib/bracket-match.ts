const OPEN = "([{";
const CLOSE = ")]}";
const PAIR: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}"
};
const OPEN_FOR_CLOSE: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{"
};

/**
 * Returns indices of a matching bracket pair around the cursor (insertion point).
 * Simplified: does not skip brackets inside strings/comments.
 */
export function findBracketPairAtCursor(text: string, cursor: number): { start: number; end: number } | null {
  if (!text.length) {
    return null;
  }

  const left = cursor > 0 ? text[cursor - 1]! : "";
  const right = cursor < text.length ? text[cursor]! : "";

  if (OPEN.includes(left)) {
    const end = scanForward(text, cursor - 1, left);
    return end >= 0 ? { start: cursor - 1, end } : null;
  }

  if (CLOSE.includes(left)) {
    const start = scanBackward(text, cursor - 1, left);
    return start >= 0 ? { start, end: cursor - 1 } : null;
  }

  if (OPEN.includes(right)) {
    const end = scanForward(text, cursor, right);
    return end >= 0 ? { start: cursor, end } : null;
  }

  if (CLOSE.includes(right)) {
    const start = scanBackward(text, cursor, right);
    return start >= 0 ? { start, end: cursor } : null;
  }

  return null;
}

function scanForward(text: string, openIndex: number, openCh: string): number {
  const need = PAIR[openCh];
  if (!need) {
    return -1;
  }

  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    const c = text[i]!;
    if (c === openCh) {
      depth++;
    } else if (c === need) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function scanBackward(text: string, closeIndex: number, closeCh: string): number {
  const need = OPEN_FOR_CLOSE[closeCh];
  if (!need) {
    return -1;
  }

  let depth = 1;
  for (let i = closeIndex - 1; i >= 0; i--) {
    const c = text[i]!;
    if (c === closeCh) {
      depth++;
    } else if (c === need) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}
