import { beforeEach, describe, expect, it, vi } from "vitest";

import { SafeOutboundError } from "@/lib/safe-outbound";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getWebhookSettingsForUser: vi.fn(),
  sendWebhookTestForUser: vi.fn(),
  updateWebhookUrlForUser: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/webhooks", () => ({
  getWebhookSettingsForUser: mocks.getWebhookSettingsForUser,
  sendWebhookTestForUser: mocks.sendWebhookTestForUser,
  updateWebhookUrlForUser: mocks.updateWebhookUrlForUser
}));

const routePromise = import("@/app/api/settings/webhook/route");

describe("/api/settings/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: {
        id: "user_123"
      }
    });
  });

  it("returns safe outbound validation errors as user-facing 400s", async () => {
    mocks.updateWebhookUrlForUser.mockRejectedValueOnce(
      new SafeOutboundError("Webhook URL must point to a public host.", 400)
    );

    const { PUT } = await routePromise;
    const response = await PUT(
      new Request("https://wox-bin.vercel.app/api/settings/webhook", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          webhookUrl: "http://127.0.0.1/internal"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook URL must point to a public host."
    });
  });
});
