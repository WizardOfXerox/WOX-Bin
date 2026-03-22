/**
 * App-wide light/dark shell (Tailwind `dark` class + `theme-light` CSS variables).
 * Stored in localStorage; applied from root layout script + ThemeRootProvider.
 */

export type UiThemeMode = "dark" | "light" | "system";

export const UI_THEME_STORAGE_KEY = "woxbin_ui_theme";
/** Legacy boolean — still written when saving so older code paths stay in sync */
export const LEGACY_APP_SHELL_LIGHT_KEY = "woxbin_app_shell_light";
export const HIGH_CONTRAST_STORAGE_KEY = "woxbin_app_high_contrast";

export const UI_THEME_OPTIONS: { id: UiThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "system", label: "System" }
];

export function parseUiThemeMode(raw: string | null, legacyLight: string | null): UiThemeMode {
  if (raw === "dark" || raw === "light" || raw === "system") {
    return raw;
  }
  if (legacyLight === "1") {
    return "light";
  }
  return "dark";
}

/** Resolve stored mode to concrete light/dark (uses OS preference for `system`). */
export function resolveUiTheme(mode: UiThemeMode): "light" | "dark" {
  if (typeof window === "undefined") {
    return mode === "light" ? "light" : "dark";
  }
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode === "light" ? "light" : "dark";
}

export function readUiThemeFromStorage(): UiThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }
  return parseUiThemeMode(localStorage.getItem(UI_THEME_STORAGE_KEY), localStorage.getItem(LEGACY_APP_SHELL_LIGHT_KEY));
}

export function readHighContrastFromStorage(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "1";
}

/** Apply Tailwind + CSS-variable theme to document (client only). */
export function applyDocumentUiShell(resolved: "light" | "dark", highContrast: boolean) {
  const root = document.documentElement;
  const isLight = resolved === "light";
  root.classList.toggle("theme-light", isLight);
  root.classList.toggle("dark", !isLight);
  root.style.colorScheme = isLight ? "light" : "dark";
  document.body.classList.toggle("wox-high-contrast", highContrast);
}

/** Call after updating theme-related localStorage (same tab). */
export function dispatchUiShellApply() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wox-ui-apply"));
  }
}

/** Inline in root layout — runs before React, no imports. */
export const INLINE_UI_THEME_SCRIPT = `(function(){try{var k="woxbin_ui_theme";var mode=localStorage.getItem(k);var leg=localStorage.getItem("woxbin_app_shell_light");if(mode!=="dark"&&mode!=="light"&&mode!=="system"){mode=leg==="1"?"light":"dark";}var r="dark";if(mode==="light")r="light";else if(mode==="system")r=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var el=document.documentElement;if(r==="light"){el.classList.add("theme-light");el.classList.remove("dark");el.style.colorScheme="light";}else{el.classList.add("dark");el.classList.remove("theme-light");el.style.colorScheme="dark";}if(localStorage.getItem("woxbin_app_high_contrast")==="1"&&document.body){document.body.classList.add("wox-high-contrast");}}catch(e){}})();`;
