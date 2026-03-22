import type { LANGUAGES } from "@/lib/constants";
import { LANGUAGES as LANG_ARR } from "@/lib/constants";
import { PlanLimitError } from "@/lib/plans";
import { savePasteForUser } from "@/lib/paste-service";
import { pastebinFetchPasteRaw, pastebinListPastes, pastebinLogin, type PastebinListItem } from "@/lib/pastebin-api";

export type PastebinMigrateOptions = {
  devKey: string;
  username: string;
  password: string;
  /** Max pastes to list from Pastebin (API cap 1000). */
  limit: number;
  /** WOX-Bin folder; created if missing. */
  folderName: string | null;
};

export type PastebinMigrateResult = {
  imported: number;
  failed: { key: string; title: string; error: string }[];
  slugs: string[];
  stoppedByLimit?: boolean;
};

const FORMAT_MAP: Record<string, (typeof LANG_ARR)[number]> = {
  text: "none",
  plaintext: "none",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  python: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  json: "json",
  html: "markup",
  xml: "xml",
  css: "css",
  php: "php",
  sql: "sql",
  mysql: "sql",
  java: "java",
  cpp: "cpp",
  csharp: "csharp",
  cs: "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
  yaml: "yaml",
  yml: "yaml",
  markdown: "markdown",
  powershell: "powershell",
  rustlang: "rust"
};

function mapLanguage(formatShort: string): (typeof LANGUAGES)[number] {
  const k = formatShort.trim().toLowerCase();
  return FORMAT_MAP[k] ?? "auto";
}

function mapVisibility(item: PastebinListItem): "public" | "unlisted" | "private" {
  if (item.private === 2) {
    return "private";
  }
  if (item.private === 1) {
    return "unlisted";
  }
  return "public";
}

/**
 * Logs in to Pastebin, lists pastes, imports each into the WOX-Bin user account.
 * Does not persist Pastebin credentials. Password should be discarded by caller after await.
 */
export async function migratePastesForUser(userId: string, opts: PastebinMigrateOptions): Promise<PastebinMigrateResult> {
  const userKey = await pastebinLogin(opts.devKey, opts.username, opts.password);
  const list = await pastebinListPastes(opts.devKey, userKey, opts.limit);

  const failed: PastebinMigrateResult["failed"] = [];
  const slugs: string[] = [];
  let imported = 0;
  let stoppedByLimit = false;

  for (const item of list) {
    try {
      const raw = await pastebinFetchPasteRaw(opts.devKey, userKey, item.key);
      const paste = await savePasteForUser(userId, {
        title: item.title.slice(0, 500) || `Paste ${item.key}`,
        content: raw,
        language: mapLanguage(item.formatShort),
        visibility: mapVisibility(item),
        folderName: opts.folderName,
        tags: ["pastebin-import"],
        password: null,
        burnAfterRead: false,
        burnAfterViews: 0,
        pinned: false,
        favorite: false,
        archived: false,
        template: false
      });
      imported += 1;
      slugs.push(paste.slug);
    } catch (e) {
      if (e instanceof PlanLimitError) {
        failed.push({
          key: item.key,
          title: item.title,
          error: e.message
        });
        stoppedByLimit = true;
        break;
      }
      failed.push({
        key: item.key,
        title: item.title,
        error: e instanceof Error ? e.message : "Unknown error"
      });
    }
  }

  return { imported, failed, slugs, stoppedByLimit };
}
