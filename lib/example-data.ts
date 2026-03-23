import source from "@/samples/example-pastes.json";
import bigExampleSource from "@/samples/example-big-paste.json";

import { DEFAULT_FOLDERS } from "@/lib/constants";
import type { LocalWorkspaceSnapshot, PasteDraft, PasteFileDraft } from "@/lib/types";

function visibilityFromLegacyExposure(exposure?: number) {
  if (exposure === 0) {
    return "public";
  }

  if (exposure === 1) {
    return "unlisted";
  }

  return "private";
}

export const exampleWorkspaceSnapshot: LocalWorkspaceSnapshot = {
  folders: Array.from(
    new Set([...(Array.isArray(source.folders) ? source.folders : []), ...DEFAULT_FOLDERS])
  ),
  pastes: (Array.isArray(source.pastes) ? source.pastes : []).map((paste) => normalizeImportedPasteDraft(paste))
};

function toIsoDate(value: unknown, fallback = new Date().toISOString()) {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  return fallback;
}

function normalizeImportedFile(file: Partial<PasteFileDraft> | null | undefined): PasteFileDraft {
  const mediaKind = file?.mediaKind === "image" || file?.mediaKind === "video" ? file.mediaKind : null;

  return {
    filename: typeof file?.filename === "string" && file.filename.trim() ? file.filename.trim() : "attachment",
    content: typeof file?.content === "string" ? file.content : "",
    language: typeof file?.language === "string" && file.language ? file.language : "none",
    mediaKind,
    mimeType: typeof file?.mimeType === "string" && file.mimeType.trim() ? file.mimeType.trim() : null
  };
}

function normalizeImportedPasteDraft(paste: Record<string, unknown>): PasteDraft {
  const now = new Date().toISOString();
  const id = typeof paste.id === "string" && paste.id.trim() ? paste.id : crypto.randomUUID();

  return {
    id,
    slug: typeof paste.slug === "string" && paste.slug.trim() ? paste.slug : id,
    title: typeof paste.title === "string" && paste.title.trim() ? paste.title : "Untitled",
    content: typeof paste.content === "string" ? paste.content : "",
    viewCount:
      typeof paste.viewCount === "number"
        ? Math.max(0, paste.viewCount)
        : typeof paste.views === "number"
          ? Math.max(0, paste.views)
          : 0,
    language: typeof paste.language === "string" && paste.language ? paste.language : "none",
    folder: typeof paste.folder === "string" && paste.folder.trim() ? paste.folder : null,
    category: typeof paste.category === "string" && paste.category.trim() ? paste.category : null,
    tags: Array.isArray(paste.tags)
      ? paste.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim()))
      : [],
    visibility:
      paste.visibility === "public" || paste.visibility === "unlisted" || paste.visibility === "private"
        ? paste.visibility
        : visibilityFromLegacyExposure(typeof paste.exposure === "number" ? paste.exposure : 2),
    password: typeof paste.password === "string" ? paste.password : null,
    secretMode: Boolean(paste.secretMode),
    captchaRequired: Boolean(paste.captchaRequired),
    burnAfterRead: Boolean(paste.burnAfterRead),
    burnAfterViews: typeof paste.burnAfterViews === "number" ? Math.max(0, paste.burnAfterViews) : 0,
    favorite: Boolean(paste.favorite),
    archived: Boolean(paste.archived),
    template: Boolean(paste.template),
    pinned: Boolean(paste.pinned),
    forkedFromId: typeof paste.forkedFromId === "string" ? paste.forkedFromId : null,
    replyToId: typeof paste.replyToId === "string" ? paste.replyToId : null,
    forkedFrom: null,
    replyTo: null,
    expiresAt: typeof paste.expiresAt === "string" && paste.expiresAt.trim() ? paste.expiresAt : null,
    files: Array.isArray(paste.files)
      ? paste.files.map((file) => normalizeImportedFile((file ?? null) as Partial<PasteFileDraft>))
      : [],
    versions: Array.isArray(paste.versions)
      ? paste.versions
          .filter((version): version is PasteDraft["versions"][number] => Boolean(version && typeof version === "object"))
          .map((version) => ({
            id:
              typeof version.id === "string" && version.id.trim()
                ? version.id
                : crypto.randomUUID(),
            title:
              typeof version.title === "string" && version.title.trim()
                ? version.title
                : typeof paste.title === "string" && paste.title.trim()
                  ? paste.title
                  : "Untitled",
            content: typeof version.content === "string" ? version.content : "",
            files: Array.isArray(version.files)
              ? version.files.map((file) => normalizeImportedFile((file ?? null) as Partial<PasteFileDraft>))
              : [],
            createdAt: toIsoDate(version.createdAt, now)
          }))
      : [],
    createdAt: toIsoDate(paste.createdAt, now),
    updatedAt: toIsoDate(paste.updatedAt, now)
  };
}

const rawBigExampleCandidate = Array.isArray(bigExampleSource.pastes) ? bigExampleSource.pastes[0] : null;
const rawBigExamplePaste =
  rawBigExampleCandidate && typeof rawBigExampleCandidate === "object"
    ? (rawBigExampleCandidate as Record<string, unknown>)
    : null;

export const bigExampleTemplatePaste: PasteDraft = normalizeImportedPasteDraft(
  rawBigExamplePaste ?? {
    id: "starter-megademo",
    slug: "starter-megademo",
    title: "WOX-Bin megademo",
    language: "markdown",
    folder: "Examples",
    category: "Software",
    tags: ["demo", "starter"],
    visibility: "private",
    favorite: true,
    pinned: true,
    content: "# WOX-Bin megademo\n\nThe bundled example file could not be loaded.",
    files: []
  }
);

export type StarterAccountPasteSeed = {
  title: string;
  content: string;
  language: string;
  folderName: string | null;
  category: string | null;
  tags: string[];
  visibility: "public" | "unlisted" | "private";
  password: null;
  secretMode: boolean;
  captchaRequired: boolean;
  burnAfterRead: boolean;
  burnAfterViews: number;
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  template: boolean;
  forkedFromId: null;
  replyToId: null;
  expiresAt: null;
  files: PasteFileDraft[];
};

export function buildStarterAccountPasteSeed(): StarterAccountPasteSeed {
  return {
    title: bigExampleTemplatePaste.title,
    content: bigExampleTemplatePaste.content,
    language: bigExampleTemplatePaste.language,
    folderName: bigExampleTemplatePaste.folder ?? DEFAULT_FOLDERS.find((folder) => folder === "Examples") ?? DEFAULT_FOLDERS[0] ?? null,
    category: bigExampleTemplatePaste.category,
    tags: [...bigExampleTemplatePaste.tags],
    visibility: "private",
    password: null,
    secretMode: false,
    captchaRequired: false,
    burnAfterRead: false,
    burnAfterViews: 0,
    pinned: true,
    favorite: true,
    archived: false,
    template: false,
    forkedFromId: null,
    replyToId: null,
    expiresAt: null,
    files: bigExampleTemplatePaste.files.map((file) => ({ ...file }))
  };
}
