import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/woxbin";

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: connectionString.includes("127.0.0.1") || connectionString.includes("localhost") ? undefined : "require"
});

export type SeededUser = {
  id: string;
  username: string;
  email: string;
  password: string;
};

export type SeededPaste = {
  id: string;
  slug: string;
  title: string;
};

export async function seedUser(options?: {
  role?: "user" | "moderator" | "admin";
  password?: string;
  prefix?: string;
}) {
  const id = randomUUID();
  const stamp = `${Date.now().toString(36)}-${id.slice(0, 8)}`;
  const username = `${options?.prefix ?? "e2e-user"}-${stamp}`.toLowerCase();
  const email = `${username}@example.test`;
  const password = options?.password ?? "PlaywrightP@55!";
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await sql`
    insert into users (
      id,
      username,
      email,
      email_verified,
      password_hash,
      display_name,
      name,
      role,
      onboarding_complete,
      created_at,
      updated_at
    ) values (
      ${id},
      ${username},
      ${email},
      ${now},
      ${passwordHash},
      ${username},
      ${username},
      ${options?.role ?? "user"},
      true,
      ${now},
      ${now}
    )
  `;

  return {
    id,
    username,
    email,
    password
  } satisfies SeededUser;
}

export async function deleteUser(userId: string) {
  await sql`delete from users where id = ${userId}`;
}

export async function seedPublicPaste(options?: {
  titlePrefix?: string;
  content?: string;
  language?: string;
  userId?: string | null;
}) {
  const id = randomUUID();
  const slug = `e2e-public-${Date.now().toString(36)}-${id.slice(0, 6)}`.toLowerCase();
  const title = `${options?.titlePrefix ?? "E2E public paste"} ${slug.slice(-6)}`;
  const now = new Date();

  await sql`
    insert into pastes (
      id,
      slug,
      user_id,
      title,
      content,
      language,
      tags,
      visibility,
      status,
      password_hash,
      view_count,
      created_at,
      updated_at
    ) values (
      ${id},
      ${slug},
      ${options?.userId ?? null},
      ${title},
      ${options?.content ?? "Playwright public paste body."},
      ${options?.language ?? "markdown"},
      ${sql.json(["playwright", "public-feed"])},
      'public',
      'active',
      null,
      0,
      ${now},
      ${now}
    )
  `;

  return {
    id,
    slug,
    title
  } satisfies SeededPaste;
}

export async function deletePaste(pasteId: string) {
  await sql`delete from pastes where id = ${pasteId}`;
}

export async function closeE2eSql() {
  await sql.end({ timeout: 5 });
}
