import { beforeEach, describe, expect, it, vi } from "vitest";

const { listFeedPastes } = vi.hoisted(() => ({
  listFeedPastes: vi.fn(async () => [])
}));

vi.mock("@/lib/paste-service", () => ({
  listFeedPastes
}));

vi.mock("@/lib/server-i18n", () => ({
  getServerTranslator: async () => ({
    language: "en",
    t: (key: string) => key
  })
}));

import ArchivePage, { dynamic as archiveDynamic } from "@/app/archive/page";
import FeedPage, { dynamic as feedDynamic } from "@/app/feed/page";
import { GET as getFeedXml } from "@/app/feed.xml/route";
import { RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";

describe("public feed page freshness", () => {
  beforeEach(() => {
    listFeedPastes.mockClear();
  });

  it("marks feed and archive pages as dynamic", () => {
    expect(feedDynamic).toBe("force-dynamic");
    expect(archiveDynamic).toBe("force-dynamic");
  });

  it("uses the recent public cap for the card feed page", async () => {
    await FeedPage();
    expect(listFeedPastes).toHaveBeenCalledWith(RECENT_PUBLIC_PASTES_LIMIT);
  });

  it("uses the recent public cap for the archive page", async () => {
    await ArchivePage();
    expect(listFeedPastes).toHaveBeenCalledWith(RECENT_PUBLIC_PASTES_LIMIT);
  });

  it("uses the same recent public cap for the RSS feed", async () => {
    const response = await getFeedXml(new Request("https://example.com/feed.xml"));

    expect(listFeedPastes).toHaveBeenCalledWith(RECENT_PUBLIC_PASTES_LIMIT);
    expect(response.headers.get("content-type")).toContain("application/atom+xml");
  });
});
