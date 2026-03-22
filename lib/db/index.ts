import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

const connectionString =
  env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/woxbin";

const globalForDb = globalThis as {
  woxSql?: ReturnType<typeof postgres>;
  woxDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const sql =
  globalForDb.woxSql ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: connectionString.includes("127.0.0.1") || connectionString.includes("localhost") ? undefined : "require"
  });

const db = globalForDb.woxDb ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.woxSql = sql;
  globalForDb.woxDb = db;
}

/** Tagged-template SQL client (postgres.js); use for raw queries e.g. worker job claim. */
export { db, sql, schema };

export function ensureDatabaseUrl() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
}
