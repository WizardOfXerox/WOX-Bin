import { describe, expect, it } from "vitest";

import { isAnnouncementLive, pickActiveAnnouncement, type AnnouncementRecord } from "@/lib/announcements";

function makeAnnouncement(overrides: Partial<AnnouncementRecord> = {}): AnnouncementRecord {
  return {
    id: overrides.id ?? "a1",
    title: overrides.title ?? "Maintenance",
    body: overrides.body ?? "We are rotating infrastructure tonight.",
    ctaLabel: overrides.ctaLabel ?? null,
    ctaHref: overrides.ctaHref ?? null,
    tone: overrides.tone ?? "info",
    published: overrides.published ?? true,
    startsAt: overrides.startsAt ?? null,
    endsAt: overrides.endsAt ?? null,
    createdByUserId: overrides.createdByUserId ?? "admin-1",
    createdAt: overrides.createdAt ?? "2026-03-27T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-27T08:00:00.000Z"
  };
}

describe("announcements", () => {
  it("treats published rows with no window as live", () => {
    expect(isAnnouncementLive(makeAnnouncement(), new Date("2026-03-27T09:00:00.000Z"))).toBe(true);
  });

  it("ignores announcements that have not started yet", () => {
    expect(
      isAnnouncementLive(
        makeAnnouncement({
          startsAt: "2026-03-27T10:00:00.000Z"
        }),
        new Date("2026-03-27T09:00:00.000Z")
      )
    ).toBe(false);
  });

  it("ignores announcements that already ended", () => {
    expect(
      isAnnouncementLive(
        makeAnnouncement({
          endsAt: "2026-03-27T08:30:00.000Z"
        }),
        new Date("2026-03-27T09:00:00.000Z")
      )
    ).toBe(false);
  });

  it("picks the first live announcement from a sorted list", () => {
    const rows = [
      makeAnnouncement({
        id: "future",
        startsAt: "2026-03-27T10:00:00.000Z",
        updatedAt: "2026-03-27T09:30:00.000Z"
      }),
      makeAnnouncement({
        id: "live",
        updatedAt: "2026-03-27T09:00:00.000Z"
      }),
      makeAnnouncement({
        id: "ended",
        endsAt: "2026-03-27T08:30:00.000Z",
        updatedAt: "2026-03-27T08:00:00.000Z"
      })
    ];

    expect(pickActiveAnnouncement(rows, new Date("2026-03-27T09:00:00.000Z"))?.id).toBe("live");
  });
});
