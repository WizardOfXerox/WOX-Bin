import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Load balancer / uptime checks. Unauthenticated; returns 503 if DB ping fails.
 * Does not verify Redis, S3, or workers.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      db: "up",
      time: new Date().toISOString()
    });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        time: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
