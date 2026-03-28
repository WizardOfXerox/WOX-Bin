import { unstable_cache } from "next/cache";

import { listFeedPastes } from "@/lib/paste-service";
import { RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";
import { PUBLIC_FEED_CACHE_TAG, PUBLIC_FEED_REVALIDATE_SECONDS } from "@/lib/public-feed-cache-tags";

const getCachedRecentPublicPastesInner = unstable_cache(
  async () => listFeedPastes(RECENT_PUBLIC_PASTES_LIMIT),
  ["public-feed", "recent"],
  {
    revalidate: PUBLIC_FEED_REVALIDATE_SECONDS,
    tags: [PUBLIC_FEED_CACHE_TAG]
  }
);

export async function getCachedRecentPublicPastes() {
  try {
    return await getCachedRecentPublicPastesInner();
  } catch (error) {
    if (error instanceof Error && error.message.includes("incrementalCache missing")) {
      return listFeedPastes(RECENT_PUBLIC_PASTES_LIMIT);
    }
    throw error;
  }
}
