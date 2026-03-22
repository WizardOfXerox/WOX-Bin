/**
 * Carbon-inspired code snapshot presets (window chrome + surfaces).
 * Syntax colors come from Prism themes loaded per preset.
 */

import type { CSSProperties } from "react";

export type CodeImagePrismTheme = "tomorrow" | "coy" | "okaidia";

export type CodeImagePreset = {
  id: string;
  label: string;
  description: string;
  prismTheme: CodeImagePrismTheme;
  /** Window title bar */
  titleBarBg: string;
  titleBarBorder: string;
  titleBarText: string;
  /** Code area behind tokens */
  codeBg: string;
  /** Full-bleed behind the rounded window */
  outerStyle: CSSProperties;
  /** Solid fallback for lossy exports (JPEG/WebP) when gradients are flattened */
  flatExportBg: string;
  /** Traffic-light dots (macOS style) */
  dots: [string, string, string];
};

export const CODE_IMAGE_PRESETS: CodeImagePreset[] = [
  {
    id: "carbon-dark",
    label: "Carbon dark",
    description: "Classic dark editor — similar to carbon.now.sh default",
    prismTheme: "tomorrow",
    titleBarBg: "#2d2d2d",
    titleBarBorder: "rgba(255,255,255,0.08)",
    titleBarText: "rgba(255,255,255,0.45)",
    codeBg: "#1e1e1e",
    outerStyle: { background: "#121212" },
    flatExportBg: "#121212",
    dots: ["#ff5f56", "#ffbd2e", "#27c93f"]
  },
  {
    id: "paper-light",
    label: "Paper light",
    description: "Light canvas with Coy syntax colors",
    prismTheme: "coy",
    titleBarBg: "#ececec",
    titleBarBorder: "rgba(0,0,0,0.08)",
    titleBarText: "rgba(0,0,0,0.45)",
    codeBg: "#fdfdfd",
    outerStyle: { background: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)" },
    flatExportBg: "#e2e8f0",
    dots: ["#ef4444", "#eab308", "#22c55e"]
  },
  {
    id: "ocean-night",
    label: "Ocean night",
    description: "Cool blue frame with Okaidia highlighting",
    prismTheme: "okaidia",
    titleBarBg: "#1b2b3a",
    titleBarBorder: "rgba(125,211,252,0.15)",
    titleBarText: "rgba(186,230,253,0.55)",
    codeBg: "#0f172a",
    outerStyle: { background: "linear-gradient(160deg, #0c4a6e 0%, #020617 55%)" },
    flatExportBg: "#020617",
    dots: ["#f87171", "#fbbf24", "#4ade80"]
  },
  {
    id: "nord-frost",
    label: "Nord frost",
    description: "Muted blue-gray chrome",
    prismTheme: "tomorrow",
    titleBarBg: "#3b4252",
    titleBarBorder: "rgba(216,222,233,0.12)",
    titleBarText: "rgba(216,222,233,0.5)",
    codeBg: "#2e3440",
    outerStyle: { background: "linear-gradient(180deg, #4c566a 0%, #242933 100%)" },
    flatExportBg: "#242933",
    dots: ["#bf616a", "#ebcb8b", "#a3be8c"]
  },
  {
    id: "sunset-gradient",
    label: "Sunset",
    description: "Warm gradient frame, dark code well",
    prismTheme: "tomorrow",
    titleBarBg: "#2a1f35",
    titleBarBorder: "rgba(251,113,133,0.2)",
    titleBarText: "rgba(251,207,232,0.55)",
    codeBg: "#1a1523",
    outerStyle: { background: "linear-gradient(135deg, #4c1d95 0%, #be185d 40%, #f97316 100%)" },
    flatExportBg: "#4c1d95",
    dots: ["#fb7185", "#fbbf24", "#34d399"]
  },
  {
    id: "mono-contrast",
    label: "Mono contrast",
    description: "High-contrast black & white",
    prismTheme: "okaidia",
    titleBarBg: "#0a0a0a",
    titleBarBorder: "rgba(255,255,255,0.2)",
    titleBarText: "rgba(255,255,255,0.55)",
    codeBg: "#000000",
    outerStyle: { background: "#050505" },
    flatExportBg: "#050505",
    dots: ["#ffffff", "#a3a3a3", "#525252"]
  }
];

export type CodeImageExportFormat = "png" | "jpeg" | "webp" | "svg";

export const CODE_IMAGE_FORMATS: { value: CodeImageExportFormat; label: string; ext: string }[] = [
  { value: "png", label: "PNG", ext: "png" },
  { value: "jpeg", label: "JPEG", ext: "jpg" },
  { value: "webp", label: "WebP", ext: "webp" },
  { value: "svg", label: "SVG", ext: "svg" }
];

export const CODE_IMAGE_WIDTHS: { value: string; label: string; px?: number }[] = [
  { value: "auto", label: "Auto width" },
  { value: "640", label: "640 px", px: 640 },
  { value: "800", label: "800 px", px: 800 },
  { value: "960", label: "960 px", px: 960 },
  { value: "1080", label: "1080 px", px: 1080 },
  { value: "1200", label: "1200 px", px: 1200 }
];

export const CODE_IMAGE_SCALES: { value: number; label: string }[] = [
  { value: 1, label: "1× (standard)" },
  { value: 2, label: "2× (retina)" },
  { value: 3, label: "3× (extra sharp)" }
];

export const CODE_IMAGE_RADIUS: { value: string; label: string; className: string }[] = [
  { value: "md", label: "Medium", className: "rounded-xl" },
  { value: "lg", label: "Large", className: "rounded-2xl" },
  { value: "xl", label: "Extra large", className: "rounded-3xl" }
];

export const CODE_IMAGE_PADDING: { value: string; label: string; codeClass: string }[] = [
  { value: "cozy", label: "Cozy", codeClass: "p-4 sm:p-5" },
  { value: "comfort", label: "Comfort", codeClass: "p-5 sm:p-6" },
  { value: "spacious", label: "Spacious", codeClass: "p-6 sm:p-8" }
];

/** Title-bar control style (similar to Carbon window settings). */
export type CodeImageWindowChrome = "mac" | "outline" | "windows";

export const CODE_IMAGE_WINDOW_CHROME: { value: CodeImageWindowChrome; label: string }[] = [
  { value: "mac", label: "macOS dots" },
  { value: "outline", label: "Outlined circles" },
  { value: "windows", label: "Windows squares" }
];

/** Default canvas padding (px) around the code window — Carbon-style “Padding (vert/horiz)”. */
export const CODE_IMAGE_DEFAULT_CANVAS_PAD = { x: 24, y: 24 } as const;

/** Default drop shadow (Carbon-style offset-y + blur). */
export const CODE_IMAGE_DEFAULT_SHADOW = { offsetY: 14, blur: 28 } as const;
