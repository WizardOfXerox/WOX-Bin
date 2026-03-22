import type { PasteDraft, PasteLineageTarget } from "@/lib/types";

export type { PasteLineageTarget };

/**
 * Local / IndexedDB drafts only: resolve `forkedFrom` / `replyTo` from ids using the in-memory library.
 * Do not use for account-backed pastes — the API already resolves lineage with visibility rules.
 */
export function enrichPasteLineageForLocal(paste: PasteDraft, library: PasteDraft[]): PasteDraft {
  const byId = new Map(library.map((p) => [p.id, p]));

  const resolveId = (id: string | null | undefined): PasteLineageTarget | null => {
    if (!id) {
      return null;
    }
    const found = byId.get(id);
    if (!found) {
      return null;
    }
    return { slug: found.slug, title: found.title };
  };

  return {
    ...paste,
    forkedFrom: paste.forkedFrom ?? resolveId(paste.forkedFromId),
    replyTo: paste.replyTo ?? resolveId(paste.replyToId)
  };
}
