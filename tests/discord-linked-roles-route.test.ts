import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn()
}));

vi.mock("@/lib/discord/linked-roles", () => ({
  getDiscordLinkedRolesUserSnapshot: vi.fn(),
  syncDiscordLinkedRoleConnection: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn()
}));

import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { getDiscordLinkedRolesUserSnapshot, syncDiscordLinkedRoleConnection } from "@/lib/discord/linked-roles";
import { GET, POST } from "@/app/api/discord/linked-roles/route";

describe("discord linked-roles route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the linked-role snapshot for the current session", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user_1"
      }
    } as never);
    vi.mocked(getDiscordLinkedRolesUserSnapshot).mockResolvedValue({
      signedIn: true,
      oauthReady: true,
      metadataSyncReady: true,
      connected: true,
      hasRoleConnectionsWriteScope: true,
      appConfigured: true,
      botTokenConfigured: true,
      user: null,
      discordAccount: null,
      metadataRecords: [],
      metadataValues: null,
      remoteConnection: null
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getDiscordLinkedRolesUserSnapshot).toHaveBeenCalledWith("user_1");
    expect(body.snapshot.signedIn).toBe(true);
  });

  it("requires a signed-in session before syncing linked roles", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/Sign in/i);
  });

  it("syncs linked roles and writes an audit entry", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user_2"
      }
    } as never);
    vi.mocked(syncDiscordLinkedRoleConnection).mockResolvedValue({
      snapshot: {} as never,
      remoteConnection: {
        platformName: "WOX-Bin",
        platformUsername: "wiz",
        metadata: {
          plan_tier: 3
        }
      }
    });
    vi.mocked(getDiscordLinkedRolesUserSnapshot).mockResolvedValue({
      signedIn: true,
      oauthReady: true,
      metadataSyncReady: true,
      connected: true,
      hasRoleConnectionsWriteScope: true,
      appConfigured: true,
      botTokenConfigured: true,
      user: null,
      discordAccount: null,
      metadataRecords: [],
      metadataValues: null,
      remoteConnection: {
        platformName: "WOX-Bin",
        platformUsername: "wiz",
        metadata: {
          plan_tier: 3
        }
      }
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(syncDiscordLinkedRoleConnection).toHaveBeenCalledWith("user_2");
    expect(logAudit).toHaveBeenCalled();
    expect(body.message).toMatch(/synchronized/i);
  });
});
