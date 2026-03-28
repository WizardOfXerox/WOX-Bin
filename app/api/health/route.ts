import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logError } from "@/lib/logging";
import { getRateLimitHealthStatus } from "@/lib/rate-limit";

/**
 * Load balancer / uptime checks. Unauthenticated; returns 503 if DB ping fails.
 * Does not verify external workers or third-party services end-to-end.
 */
export async function GET() {
  const rateLimit = getRateLimitHealthStatus();
  const deployment = {
    environment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "development",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.trim()?.slice(0, 12) || null
  };

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      db: "up",
      time: new Date().toISOString(),
      rateLimit,
      deployment
    });
  } catch (err) {
    logError("health.check.failed", err);
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        time: new Date().toISOString(),
        rateLimit,
        deployment
      },
      { status: 503 }
    );
  }
}
