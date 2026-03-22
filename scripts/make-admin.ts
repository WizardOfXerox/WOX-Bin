import process from "node:process";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const identifier = process.argv[2]?.trim().toLowerCase();

  if (!identifier) {
    console.error("Usage: npm run make:admin -- <username-or-email>");
    process.exit(1);
  }

  const [{ eq, or }, { db, sql }, { users }] = await Promise.all([
    import("drizzle-orm"),
    import("../lib/db"),
    import("../lib/db/schema")
  ]);

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);

  if (!user) {
    console.error(`No user found for "${identifier}".`);
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exit(1);
  }

  if (user.role === "admin") {
    await db
      .update(users)
      .set({
        plan: "admin",
        planStatus: "active",
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    console.log(
      `User "${user.username ?? user.email ?? user.id}" was already admin; synced plan to **admin** tier. Sign out/in if the UI still shows an old plan.`
    );
    await sql.end({ timeout: 5 }).catch(() => undefined);
    return;
  }

  await db
    .update(users)
    .set({
      role: "admin",
      plan: "admin",
      planStatus: "active",
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  console.log(
    `Promoted "${user.username ?? user.email ?? user.id}" to admin (role + admin plan tier). Sign out/in if the app still shows an old plan.`
  );
  await sql.end({ timeout: 5 }).catch(() => undefined);
}

void main().catch(async (error) => {
  console.error(error);

  try {
    const { sql } = await import("../lib/db");
    await sql.end({ timeout: 5 }).catch(() => undefined);
  } catch {}

  process.exit(1);
});
