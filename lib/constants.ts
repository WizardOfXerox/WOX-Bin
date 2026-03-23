export const LOCAL_STORAGE_KEY = "woxbin_data";
export const LOCAL_DB_NAME = "woxbin-local";
export const LOCAL_DB_VERSION = 1;
export const LOCAL_STORE_NAME = "pastes";
export const LOCAL_META_STORE_NAME = "meta";

export const DEFAULT_FOLDERS = ["Notes", "Code", "Snippets", "Examples"];

export const LANGUAGES = [
  "none",
  "auto",
  "markup",
  "css",
  "javascript",
  "typescript",
  "json",
  "python",
  "bash",
  "sql",
  "xml",
  "cpp",
  "csharp",
  "java",
  "php",
  "powershell",
  "yaml",
  "markdown",
  "go",
  "rust",
  "ruby",
  "swift",
  "kotlin"
] as const;

export const LANGUAGE_LABELS: Record<(typeof LANGUAGES)[number], string> = {
  none: "Plain text",
  auto: "Auto-detect",
  markup: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  python: "Python",
  bash: "Bash",
  sql: "SQL",
  xml: "XML",
  cpp: "C++",
  csharp: "C#",
  java: "Java",
  php: "PHP",
  powershell: "PowerShell",
  yaml: "YAML",
  markdown: "Markdown",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin"
};

export const CATEGORIES = [
  "",
  "Cryptocurrency",
  "Cybersecurity",
  "Fixit",
  "Food",
  "Gaming",
  "Haiku",
  "Help",
  "History",
  "Housing",
  "Jokes",
  "Legal",
  "Money",
  "Movies",
  "Music",
  "Pets",
  "Photo",
  "Science",
  "Software",
  "Source Code",
  "Spirit",
  "Sports",
  "Travel",
  "TV",
  "Writing"
] as const;

export const EXPIRATION_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "10m", label: "10 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "1m", label: "1 month" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" }
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
  { value: "public", label: "Public" }
] as const;

export const BURN_VIEW_OPTIONS = [0, 1, 3, 5, 10] as const;

export const APP_COPY = {
  name: "WOX-Bin",
  tagline:
    "A local-first paste workspace with quick-share routes, secret links, built-in templates, internal support, and admin-ready operations.",
  marketingBullets: [
    "Ribbon workspace with formatting tools, find/replace, JSON helpers, print, and built-in templates for every supported language",
    "Prism syntax themes, line numbers, Markdown preview, clickable shared links, code-image export, and multi-file pastes with per-file languages",
    "Quick paste, clipboard buckets, fragment-only sharing, custom URLs, and secret links all run on the same hosted surface",
    "Local drafts or signed-in sync with folders, versions, stars, comments, public archive pages, API keys, and BookmarkFS companion flows",
    "First-run onboarding starts with the bundled megademo paste and a reopenable guided tutorial inside the workspace",
    "Turnstile, rate limits, email verification, Google sign-in, internal support tickets, moderation controls, and admin operations"
  ]
};
