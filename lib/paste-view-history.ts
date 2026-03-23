import type { PublicPasteRecord } from "@/lib/types";

const PASTE_VIEW_HISTORY_KEY = "woxbin_paste_view_history";
export const PASTE_VIEW_HISTORY_UPDATED_EVENT = "woxbin-paste-history-updated";
const MAX_PASTE_HISTORY_ITEMS = 20;

export type PasteViewHistoryEntry = {
  slug: string;
  title: string;
  secretMode: boolean;
  path: string;
  language: string;
  visibility: PublicPasteRecord["visibility"];
  authorLabel: string | null;
  viewedAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeEntry(value: unknown): PasteViewHistoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
  if (!slug) {
    return null;
  }

  return {
    slug,
    title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Untitled",
    secretMode: entry.secretMode === true,
    path:
      typeof entry.path === "string" && entry.path.trim()
        ? entry.path.trim()
        : entry.secretMode === true
          ? `/s/${slug}`
          : `/p/${slug}`,
    language: typeof entry.language === "string" && entry.language.trim() ? entry.language.trim() : "none",
    visibility:
      entry.visibility === "public" || entry.visibility === "private" || entry.visibility === "unlisted"
        ? entry.visibility
        : "unlisted",
    authorLabel: typeof entry.authorLabel === "string" && entry.authorLabel.trim() ? entry.authorLabel.trim() : null,
    viewedAt: typeof entry.viewedAt === "string" && entry.viewedAt.trim() ? entry.viewedAt.trim() : new Date().toISOString()
  };
}

export function readPasteViewHistory(): PasteViewHistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PASTE_VIEW_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is PasteViewHistoryEntry => Boolean(entry))
      .slice(0, MAX_PASTE_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

function writePasteViewHistory(entries: PasteViewHistoryEntry[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PASTE_VIEW_HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_PASTE_HISTORY_ITEMS)));
  window.dispatchEvent(new Event(PASTE_VIEW_HISTORY_UPDATED_EVENT));
}

export function clearPasteViewHistory() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(PASTE_VIEW_HISTORY_KEY);
  window.dispatchEvent(new Event(PASTE_VIEW_HISTORY_UPDATED_EVENT));
}

export function rememberViewedPaste(
  paste: Pick<PublicPasteRecord, "slug" | "title" | "secretMode" | "language" | "visibility" | "author">
) {
  if (!canUseStorage()) {
    return;
  }

  const slug = paste.slug.trim();
  if (!slug) {
    return;
  }

  const authorLabel = paste.author.displayName?.trim() || paste.author.username?.trim() || null;
  const entry: PasteViewHistoryEntry = {
    slug,
    title: paste.title.trim() || "Untitled",
    secretMode: paste.secretMode,
    path: paste.secretMode ? `/s/${slug}` : `/p/${slug}`,
    language: paste.language || "none",
    visibility: paste.visibility,
    authorLabel,
    viewedAt: new Date().toISOString()
  };

  const next = [entry, ...readPasteViewHistory().filter((item) => item.slug !== slug)];
  writePasteViewHistory(next);
}
