/** File extension for downloaded paste body from `language` (workspace / public paste). */
const LANGUAGE_DOWNLOAD_EXT: Partial<Record<string, string>> = {
  none: ".txt",
  auto: ".txt",
  markup: ".html",
  css: ".css",
  javascript: ".js",
  typescript: ".ts",
  json: ".json",
  python: ".py",
  bash: ".sh",
  sql: ".sql",
  xml: ".xml",
  cpp: ".cpp",
  csharp: ".cs",
  java: ".java",
  php: ".php",
  powershell: ".ps1",
  yaml: ".yaml",
  markdown: ".md",
  go: ".go",
  rust: ".rs",
  ruby: ".rb",
  swift: ".swift",
  kotlin: ".kt"
};

export function downloadExtensionForLanguage(language: string): string {
  return LANGUAGE_DOWNLOAD_EXT[language] ?? ".txt";
}

/** Safe single-segment filename (no path chars). */
export function safeDownloadBasename(name: string, fallback: string): string {
  const trimmed = name.trim().replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ");
  const base = trimmed.slice(0, 120).replace(/\.+$/, "") || fallback;
  return base;
}

/** Filename for a downloaded paste body (title + language extension, or slug fallback). */
export function pasteBodyDownloadFilename(paste: { title: string; slug: string; language: string }): string {
  const ext = downloadExtensionForLanguage(paste.language);
  const base = safeDownloadBasename(paste.title, paste.slug);
  const hasExt = /\.[a-z0-9]{1,8}$/i.test(base);
  return hasExt ? base : `${base}${ext}`;
}

/** ASCII-only filename for HTTP Content-Disposition (avoid header encoding issues). */
export function asciiContentDispositionFilename(name: string): string {
  return name
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 180) || "paste.txt";
}
