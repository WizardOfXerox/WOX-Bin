/** Persisted viewer options on `/p/[slug]` (localStorage). */

export const PUBLIC_PASTE_LS = {
  lineNumbers: "wox.bin.publicPaste.lineNumbers",
  lineGuides: "wox.bin.publicPaste.lineGuides",
  mdView: "wox.bin.publicPaste.mdView",
  htmlView: "wox.bin.publicPaste.htmlView"
} as const;

/** Source vs rendered preview (markdown / HTML). */
export type PublicPasteMdView = "source" | "preview";

export type PublicPasteHtmlView = PublicPasteMdView;

export function readLineNumbersPref(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const v = window.localStorage.getItem(PUBLIC_PASTE_LS.lineNumbers);
    if (v === "0") {
      return false;
    }
    if (v === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function readLineGuidesPref(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const v = window.localStorage.getItem(PUBLIC_PASTE_LS.lineGuides);
    if (v === "0") {
      return false;
    }
    if (v === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function readMarkdownViewPref(): PublicPasteMdView {
  if (typeof window === "undefined") {
    return "source";
  }
  try {
    const v = window.localStorage.getItem(PUBLIC_PASTE_LS.mdView);
    if (v === "preview") {
      return "preview";
    }
  } catch {
    /* ignore */
  }
  return "source";
}

export function writeLineNumbersPref(value: boolean) {
  try {
    window.localStorage.setItem(PUBLIC_PASTE_LS.lineNumbers, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function writeLineGuidesPref(value: boolean) {
  try {
    window.localStorage.setItem(PUBLIC_PASTE_LS.lineGuides, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function writeMarkdownViewPref(value: PublicPasteMdView) {
  try {
    window.localStorage.setItem(PUBLIC_PASTE_LS.mdView, value);
  } catch {
    /* ignore */
  }
}

export function readHtmlViewPref(): PublicPasteHtmlView {
  if (typeof window === "undefined") {
    return "source";
  }
  try {
    const v = window.localStorage.getItem(PUBLIC_PASTE_LS.htmlView);
    if (v === "preview") {
      return "preview";
    }
  } catch {
    /* ignore */
  }
  return "source";
}

export function writeHtmlViewPref(value: PublicPasteHtmlView) {
  try {
    window.localStorage.setItem(PUBLIC_PASTE_LS.htmlView, value);
  } catch {
    /* ignore */
  }
}
