import { describe, expect, it } from "vitest";

import { summarizeDeploymentChecks, type DeploymentCheck } from "@/lib/deployment-readiness";

describe("summarizeDeploymentChecks", () => {
  it("prioritizes fail checks ahead of warnings and computes counts", () => {
    const checks: DeploymentCheck[] = [
      {
        id: "redis",
        group: "security",
        label: "Upstash Redis",
        level: "warn",
        summary: "Redis is not configured.",
        docs: ["docs/VERCEL-SETUP.md"]
      },
      {
        id: "auth-secret",
        group: "core",
        label: "AUTH_SECRET",
        level: "fail",
        summary: "AUTH_SECRET is missing.",
        docs: ["docs/VERCEL-SETUP.md"]
      },
      {
        id: "smtp",
        group: "integrations",
        label: "SMTP",
        level: "warn",
        summary: "SMTP is not configured.",
        docs: ["docs/SMTP.md"]
      },
      {
        id: "database-ping",
        group: "core",
        label: "Database connectivity",
        level: "pass",
        summary: "Database ping succeeded."
      }
    ];

    const summary = summarizeDeploymentChecks(checks);

    expect(summary.counts).toEqual({
      pass: 1,
      warn: 2,
      fail: 1,
      info: 0
    });
    expect(summary.overallLevel).toBe("fail");
    expect(summary.nextActions.map((action) => action.checkId)).toEqual(["auth-secret", "smtp", "redis"]);
    expect(summary.nextActions[0]).toEqual({
      checkId: "auth-secret",
      label: "AUTH_SECRET",
      level: "fail",
      summary: "AUTH_SECRET is missing.",
      docs: ["docs/VERCEL-SETUP.md"]
    });
  });

  it("reports pass when no warn or fail checks exist", () => {
    const summary = summarizeDeploymentChecks([
      {
        id: "database-ping",
        group: "core",
        label: "Database connectivity",
        level: "pass",
        summary: "Database ping succeeded."
      },
      {
        id: "google-oauth",
        group: "integrations",
        label: "Google OAuth",
        level: "info",
        summary: "Google sign-in is disabled."
      }
    ]);

    expect(summary.overallLevel).toBe("pass");
    expect(summary.nextActions).toEqual([]);
  });
});
