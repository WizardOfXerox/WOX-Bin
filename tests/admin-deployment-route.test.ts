import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdminSession: vi.fn(),
  getDeploymentReadinessSnapshot: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminSession: mocks.isAdminSession
}));

vi.mock("@/lib/deployment-readiness", () => ({
  getDeploymentReadinessSnapshot: mocks.getDeploymentReadinessSnapshot
}));

const routePromise = import("@/app/api/admin/deployment/route");

describe("GET /api/admin/deployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.isAdminSession.mockReturnValue(false);

    const { GET } = await routePromise;
    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin access required." });
    expect(mocks.getDeploymentReadinessSnapshot).not.toHaveBeenCalled();
  });

  it("returns the deployment readiness snapshot for admins", async () => {
    const snapshot = {
      generatedAt: "2026-03-27T00:00:00.000Z",
      environment: {
        nodeEnv: "production",
        vercel: true,
        vercelEnv: "production",
        nextAuthUrl: "https://wox-bin.vercel.app",
        appUrl: "https://wox-bin.vercel.app",
        convertUploadVia: "presign",
        codeImagePlaywrightExport: false
      },
      checks: [],
      counts: { pass: 2, warn: 1, fail: 0, info: 1 },
      overallLevel: "warn",
      nextActions: [
        {
          checkId: "redis",
          label: "Upstash Redis",
          level: "warn",
          summary: "Redis is not configured.",
          docs: ["docs/VERCEL-SETUP.md"]
        }
      ]
    };

    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.getDeploymentReadinessSnapshot.mockResolvedValue(snapshot);

    const { GET } = await routePromise;
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(snapshot);
    expect(mocks.getDeploymentReadinessSnapshot).toHaveBeenCalledTimes(1);
  });
});
