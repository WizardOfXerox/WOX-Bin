"use client";

import { useEffect } from "react";

const CDN_BASE = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes";

/** Loads an extra Prism theme from CDN when not `tomorrow` (bundled in editor). Removes on change/unmount. */
export function PrismThemeLink({ theme }: { theme: string }) {
  useEffect(() => {
    const id = "wox-prism-theme-stylesheet";
    const existing = document.getElementById(id);
    existing?.remove();

    if (theme === "tomorrow") {
      return;
    }

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `${CDN_BASE}/prism-${theme}.min.css`;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [theme]);

  return null;
}
