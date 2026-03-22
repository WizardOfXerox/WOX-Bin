import { LANGUAGES } from "@/lib/constants";

type LanguageId = (typeof LANGUAGES)[number];

/** True when parsed JSON is a Wox-Bin workspace export (v2 or legacy with `exportedAt`). */
export function isWorkspaceExportJson(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") {
    return false;
  }
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.pastes) || o.pastes.length === 0) {
    return false;
  }
  if (o.version === 2) {
    return true;
  }
  return typeof o.exportedAt === "string";
}

const EXT_TO_LANGUAGE: Record<string, LanguageId> = {
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  txt: "none",
  text: "none",
  log: "none",
  csv: "none",
  env: "none",
  gitignore: "none",
  editorconfig: "none",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  py: "python",
  pyw: "python",
  pyi: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  rb: "ruby",
  php: "php",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  ps1: "powershell",
  psm1: "powershell",
  xml: "xml",
  html: "markup",
  htm: "markup",
  xhtml: "markup",
  vue: "markup",
  svelte: "markup",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  cpp: "cpp",
  cxx: "cpp",
  cc: "cpp",
  h: "cpp",
  hpp: "cpp",
  cs: "csharp",
  fs: "csharp",
  fsx: "csharp"
};

export function languageFromFilename(filename: string): LanguageId {
  const base = filename.trim().split(/[/\\]/).pop() ?? filename;
  const lower = base.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot === -1 || dot === lower.length - 1) {
    return "none";
  }
  const ext = lower.slice(dot + 1);
  return EXT_TO_LANGUAGE[ext] ?? "none";
}

/** Human title: strip path and final extension (keeps names like `.env` as `.env`). */
export function titleFromImportedFilename(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop()?.trim() || "Imported file";
  if (base.startsWith(".") && !base.slice(1).includes(".")) {
    return base;
  }
  const withoutExt = base.replace(/\.[^/.]+$/u, "").trim();
  return withoutExt || base;
}

/** File picker `accept` hint: workspace JSON plus common text / code extensions. */
export const WORKSPACE_FILE_IMPORT_ACCEPT = [
  "application/json",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  ".json",
  ".jsonc",
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".mdx",
  ".csv",
  ".log",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".pyw",
  ".rs",
  ".go",
  ".java",
  ".kt",
  ".kts",
  ".swift",
  ".rb",
  ".php",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".fs",
  ".vue",
  ".svelte",
  ".env",
  ".gitignore"
].join(",");
