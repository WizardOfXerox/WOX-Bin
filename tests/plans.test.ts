import { describe, expect, it } from "vitest";

import { describeBillingState } from "@/lib/billing";
import {
  PlanLimitError,
  canUseFeature,
  formatPlanName,
  formatPlanStatus,
  getPlanLimits,
  isPaidPlan,
  resolveEffectivePlan,
  resolveQuotaPlan
} from "@/lib/plans";

describe("plan helpers", () => {
  it("returns the expected free and pro limits", () => {
    expect(getPlanLimits("free")).toMatchObject({
      hostedPastes: 250,
      apiKeys: 1,
      filesPerPaste: 5,
      versionHistory: 10
    });

    expect(getPlanLimits("pro")).toMatchObject({
      hostedPastes: 5000,
      apiKeys: 10,
      filesPerPaste: 25,
      versionHistory: 200
    });

    expect(getPlanLimits("admin").hostedPastes).toBe(1_000_000);
    expect(getPlanLimits("admin").apiKeys).toBe(500);
  });

  it("gates premium features by plan", () => {
    expect(canUseFeature("free", "webhooks")).toBe(false);
    expect(canUseFeature("pro", "webhooks")).toBe(true);
    expect(canUseFeature("team", "sharedWorkspaces")).toBe(true);
    expect(canUseFeature("admin", "webhooks")).toBe(true);
    expect(canUseFeature("admin", "sharedWorkspaces")).toBe(true);
  });

  it("marks paid plans correctly", () => {
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("pro")).toBe(true);
    expect(isPaidPlan("team")).toBe(true);
    expect(isPaidPlan("admin")).toBe(true);
  });

  it("falls back to free entitlements when a paid plan is inactive", () => {
    expect(resolveEffectivePlan({ plan: "pro", planStatus: "past_due" })).toBe("free");
    expect(resolveEffectivePlan({ plan: "team", planStatus: "canceled" })).toBe("free");
    expect(resolveEffectivePlan({ plan: "pro", planStatus: "trialing" })).toBe("pro");
    expect(resolveEffectivePlan({ plan: "admin", planStatus: "canceled" })).toBe("admin");
  });

  it("gives staff and admin-plan users the expected quota tier", () => {
    expect(resolveQuotaPlan({ effectivePlan: "free", role: "admin" })).toBe("admin");
    expect(resolveQuotaPlan({ effectivePlan: "team", role: "moderator" })).toBe("admin");
    expect(resolveQuotaPlan({ effectivePlan: "admin", role: "user" })).toBe("admin");
  });

  it("formats plan labels for UI copy", () => {
    expect(formatPlanName("team")).toBe("Team");
    expect(formatPlanStatus("past_due")).toBe("past due");
  });
});

describe("PlanLimitError", () => {
  it("preserves machine-readable metadata for API responses", () => {
    const error = new PlanLimitError({
      code: "api_keys",
      plan: "free",
      limit: 1,
      used: 1,
      message: "Free accounts can keep up to 1 API key."
    });

    expect(error.name).toBe("PlanLimitError");
    expect(error.code).toBe("api_keys");
    expect(error.plan).toBe("free");
    expect(error.limit).toBe(1);
    expect(error.used).toBe(1);
  });
});

describe("billing copy", () => {
  it("describes fallback states clearly", () => {
    const message = describeBillingState({
      plan: "team",
      effectivePlan: "free",
      quotaPlan: "free",
      planStatus: "past_due",
      planExpiresAt: null,
      teamId: null,
      isPaid: false,
      limits: getPlanLimits("free"),
      features: {
        webhooks: false,
        sharedWorkspaces: false,
        auditExports: false
      },
      usage: {
        pastes: 0,
        pasteFiles: 0,
        storageBytes: 0,
        apiKeys: 0,
        versions: 0
      }
    });

    expect(message).toContain("Team");
    expect(message).toContain("past due");
    expect(message).toContain("Free");
  });
});
