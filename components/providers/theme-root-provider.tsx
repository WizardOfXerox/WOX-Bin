"use client";

import { useEffect, type ReactNode } from "react";

import {
  applyDocumentUiShell,
  readHighContrastFromStorage,
  readUiThemeFromStorage,
  resolveUiTheme
} from "@/lib/ui-theme";

/**
 * Keeps `html.dark` / `html.theme-light` and high-contrast body class in sync with localStorage
 * on all routes (workspace header only *writes* storage + dispatches `wox-ui-apply`).
 */
export function ThemeRootProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    function apply() {
      const mode = readUiThemeFromStorage();
      const resolved = resolveUiTheme(mode);
      const hc = readHighContrastFromStorage();
      applyDocumentUiShell(resolved, hc);
    }

    apply();

    window.addEventListener("storage", apply);
    window.addEventListener("wox-ui-apply", apply);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (readUiThemeFromStorage() === "system") {
        apply();
      }
    };
    mq.addEventListener("change", onScheme);

    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("wox-ui-apply", apply);
      mq.removeEventListener("change", onScheme);
    };
  }, []);

  return <>{children}</>;
}
