import { describe, expect, it } from "vitest";

import type { AnnouncementRecord } from "@/lib/announcements";
import { buildDiscordAnnouncementWebhookBody } from "@/lib/discord/notifications";
import { summarizeDiscordGuildSetup, type DiscordGuildSetupResult } from "@/lib/discord/setup";

const baseAnnouncement: AnnouncementRecord = {
  id: "ann_1",
  title: "Platform update",
  body: "The hosted workspace just shipped a new build.",
  ctaLabel: "Open workspace",
  ctaHref: "/app",
  tone: "info",
  published: true,
  startsAt: null,
  endsAt: null,
  createdByUserId: null,
  createdAt: "2026-03-27T00:00:00.000Z",
  updatedAt: "2026-03-27T01:00:00.000Z"
};

describe("discord notification helpers", () => {
  it("builds a Discord webhook payload for site announcements", () => {
    const payload = buildDiscordAnnouncementWebhookBody(baseAnnouncement);
    expect(payload.username).toBe("WOX-Bin");
    expect(payload.embeds[0]?.title).toBe("Platform update");
    expect(payload.embeds[0]?.url).toContain("/app");
  });

  it("summarizes setup work in a readable block", () => {
    const summary = summarizeDiscordGuildSetup({
      createdChannels: ["wox-start-here", "wox-announcements"],
      reusedChannels: ["wox-bot"],
      createdRoles: ["WOX Admin"],
      reusedRoles: ["WOX Support"],
      webhookCreated: true,
      siteOpsEnabled: false,
      warnings: ["Missing Manage Roles permission for one item."]
    } satisfies DiscordGuildSetupResult);

    expect(summary).toContain("Created channels");
    expect(summary).toContain("Announcement webhook: created");
    expect(summary).toContain("Warnings:");
  });
});
