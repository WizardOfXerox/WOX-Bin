import { LANGUAGES } from "@/lib/constants";

const WOX_LANGUAGE_IDS = new Set<string>(LANGUAGES);

/**
 * Map ```fence``` language labels (marked / CommonMark) to WOX-Bin editor language ids.
 * Unknown labels fall back to `none` (plain text).
 */
const FENCE_LABEL_TO_WOX: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  fish: "bash",
  ps1: "powershell",
  ps: "powershell",
  pwsh: "powershell",
  yml: "yaml",
  md: "markdown",
  html: "markup",
  htm: "markup",
  vue: "markup",
  svelte: "markup",
  jsonc: "json",
  cpp: "cpp",
  cxx: "cpp",
  cc: "cpp",
  h: "cpp",
  hpp: "cpp",
  "c++": "cpp",
  csharp: "csharp",
  kt: "kotlin",
  kts: "kotlin",
  golang: "go",
  text: "none",
  plain: "none",
  plaintext: "none",
  txt: "none"
};

/** First word of fence info string → language id for Prism (markdown preview, etc.). */
export function fenceLanguageToWoxId(raw: string | undefined): string {
  if (raw == null) {
    return "none";
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return "none";
  }
  const first = trimmed.split(/[\s,]+/)[0]?.toLowerCase() ?? "";
  if (!first) {
    return "none";
  }
  const mapped = FENCE_LABEL_TO_WOX[first];
  if (mapped) {
    return mapped;
  }
  if (WOX_LANGUAGE_IDS.has(first)) {
    return first;
  }
  return "none";
}

/** Map WOX-Bin language ids to Prism grammar keys (see `LANGUAGES` in constants). */
export const LANGUAGE_TO_PRISM: Record<string, string> = {
  none: "plain",
  auto: "auto",
  markup: "markup",
  css: "css",
  javascript: "javascript",
  typescript: "typescript",
  json: "json",
  python: "python",
  bash: "bash",
  sql: "sql",
  xml: "markup",
  cpp: "cpp",
  csharp: "csharp",
  java: "java",
  php: "php",
  powershell: "powershell",
  yaml: "yaml",
  markdown: "markdown",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin"
};

/** Very small heuristic when language is "auto". */
export function detectLanguageFromContent(text: string): string {
  const t = text.trim();
  if (!t) {
    return "plain";
  }
  if (t.startsWith("{") || t.startsWith("[")) {
    return "json";
  }
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<html") || (t.startsWith("<") && t.includes(">"))) {
    return "markup";
  }
  if (/^(import|export|const|let|var|function|class|interface)\s/m.test(t)) {
    return /:\s*(string|number|boolean|void|never)\b/.test(t) ? "typescript" : "javascript";
  }
  if (/^(def |class |from |import )\s/m.test(t)) {
    return "python";
  }
  if (t.startsWith("#!") && /bash|sh/.test(t.split("\n")[0] ?? "")) {
    return "bash";
  }
  if (/^(SELECT|INSERT|UPDATE|CREATE|WITH)\s/i.test(t)) {
    return "sql";
  }
  return "plain";
}

export function prismGrammarForLanguage(language: string, content: string): string {
  if (language === "none") {
    return "plain";
  }
  if (language === "auto") {
    return detectLanguageFromContent(content);
  }
  return LANGUAGE_TO_PRISM[language] ?? "plain";
}
