import type { VISIBILITY_OPTIONS } from "@/lib/constants";

export type Visibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

export type PasteFileMediaKind = "image" | "video";

export type PasteFileDraft = {
  filename: string;
  content: string;
  language: string;
  /**
   * When set, `content` is base64 (no `data:` prefix). Shown as image/video on public page & workspace.
   */
  mediaKind?: PasteFileMediaKind | null;
  mimeType?: string | null;
};

export type PasteVersionDraft = {
  id: string;
  title: string;
  content: string;
  files: PasteFileDraft[];
  createdAt: string;
};

/** Resolved fork/reply target for UI (links use `slug` → `/p/{slug}`). */
export type PasteLineageTarget = {
  slug: string;
  title: string;
};

export type PasteDraft = {
  id: string;
  slug: string;
  title: string;
  content: string;
  viewCount: number;
  language: string;
  folder: string | null;
  category: string | null;
  tags: string[];
  visibility: Visibility;
  password: string | null;
  secretMode: boolean;
  captchaRequired: boolean;
  burnAfterRead: boolean;
  burnAfterViews: number;
  favorite: boolean;
  archived: boolean;
  template: boolean;
  pinned: boolean;
  /** Internal paste id this document was forked from (copy lineage). */
  forkedFromId: string | null;
  /** Internal paste id this document replies to (conversation lineage). */
  replyToId: string | null;
  /**
   * Resolved for display when the server (or local library) allows linking.
   * `null` means no link (missing target or not exposable).
   */
  forkedFrom: PasteLineageTarget | null;
  replyTo: PasteLineageTarget | null;
  expiresAt: string | null;
  files: PasteFileDraft[];
  versions: PasteVersionDraft[];
  createdAt: string;
  updatedAt: string;
};

export type PublicPasteRecord = Omit<PasteDraft, "password"> & {
  author: {
    username: string | null;
    displayName: string | null;
  };
  encryptedShare: boolean;
  encryptedLastViewedAt: string | null;
  commentsCount: number;
  stars: number;
  starredByViewer: boolean;
  canEdit: boolean;
  requiresPassword: boolean;
  requiresCaptcha: boolean;
  status: "active" | "hidden" | "deleted";
};

export type LocalWorkspaceSnapshot = {
  folders: string[];
  pastes: PasteDraft[];
  importedLegacyAt?: string;
};
