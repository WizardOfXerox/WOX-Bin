import source from "@/samples/example-pastes.json";
import { DEFAULT_FOLDERS } from "@/lib/constants";
import type { LocalWorkspaceSnapshot, PasteDraft } from "@/lib/types";

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
  pastes: (Array.isArray(source.pastes) ? source.pastes : []).map((paste) => {
    const createdAt = new Date(typeof paste.createdAt === "number" ? paste.createdAt : Date.now()).toISOString();
    const updatedAt = new Date(typeof paste.updatedAt === "number" ? paste.updatedAt : Date.now()).toISOString();

    return {
      id: paste.id,
      slug: paste.id,
      title: paste.title || "Untitled",
      content: paste.content || "",
      language: paste.language || "none",
      folder: paste.folder || null,
      category: paste.category || null,
      tags: Array.isArray(paste.tags) ? paste.tags : [],
      visibility: visibilityFromLegacyExposure(typeof paste.exposure === "number" ? paste.exposure : 2),
      password: typeof paste.password === "string" ? paste.password : null,
      burnAfterRead: Boolean(paste.burnAfterRead),
      burnAfterViews: 0,
      favorite: Boolean(paste.favorite),
      archived: Boolean(paste.archived),
      template: Boolean(paste.template),
      pinned: Boolean(paste.pinned),
      forkedFromId: null,
      replyToId: null,
      forkedFrom: null,
      replyTo: null,
      expiresAt: null,
      files: [],
      versions: [],
      createdAt,
      updatedAt
    } satisfies PasteDraft;
  })
};
