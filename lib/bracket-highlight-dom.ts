/**
 * DOM helpers for live bracket pair outline in the Prism highlight layer (legacy parity).
 * Run unwrap before re-highlighting; wrap after Prism has produced token spans.
 */

export function unwrapBracketMarks(root: HTMLElement) {
  const spans = root.querySelectorAll(".bracket-match");
  spans.forEach((span) => {
    const t = span.textContent ?? "";
    const text = document.createTextNode(t);
    span.parentNode?.replaceChild(text, span);
  });
}

export function wrapBracketMatchesInHighlight(root: HTMLElement, openPos: number, closePos: number) {
  if (openPos === closePos) {
    return;
  }

  const fullText = root.textContent ?? "";
  if (openPos < 0 || closePos < 0 || openPos >= fullText.length || closePos >= fullText.length) {
    return;
  }

  const positions = [openPos, closePos];
  const targets: { node: Text; offsetInNode: number; globalOffset: number }[] = [];

  function walk(node: ChildNode, baseOffset: number): number {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeText = node.textContent ?? "";
      const len = nodeText.length;
      for (const pos of positions) {
        if (pos >= baseOffset && pos < baseOffset + len) {
          targets.push({
            node: node as Text,
            offsetInNode: pos - baseOffset,
            globalOffset: pos
          });
        }
      }
      return baseOffset + len;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      let off = baseOffset;
      for (const child of node.childNodes) {
        off = walk(child, off);
      }
      return off;
    }

    return baseOffset;
  }

  walk(root, 0);

  targets.sort((a, b) => b.globalOffset - a.globalOffset);

  for (const { node, offsetInNode } of targets) {
    if (!node.parentNode) {
      continue;
    }
    const t = node.textContent ?? "";
    if (offsetInNode < 0 || offsetInNode >= t.length) {
      continue;
    }
    const before = t.slice(0, offsetInNode);
    const char = t.slice(offsetInNode, offsetInNode + 1);
    const after = t.slice(offsetInNode + 1);
    const parent = node.parentNode;
    if (before) {
      parent.insertBefore(document.createTextNode(before), node);
    }
    const span = document.createElement("span");
    span.className = "bracket-match";
    span.textContent = char;
    parent.insertBefore(span, node);
    if (after) {
      parent.insertBefore(document.createTextNode(after), node);
    }
    parent.removeChild(node);
  }
}
