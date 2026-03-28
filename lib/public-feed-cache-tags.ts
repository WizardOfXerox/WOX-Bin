import { revalidateTag } from "next/cache";

export const PUBLIC_FEED_CACHE_TAG = "public-feed";
export const PUBLIC_FEED_REVALIDATE_SECONDS = 30;

export function invalidatePublicFeedCache() {
  try {
    revalidateTag(PUBLIC_FEED_CACHE_TAG, "max");
  } catch {
    // Ignore invalidation errors outside a request/render context during tests.
  }
}
