import fs from "node:fs";
import path from "node:path";

import initSqlJs from "sql.js";

import { ensureDatabaseUrl, sql } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/crypto";

type LegacyUser = {
  id: string;
  username: string;
  password_hash: string;
  folders: string | null;
  created_at: number | null;
  webhook_url: string | null;
  display_name: string | null;
};

type LegacyPaste = {
  id: string;
  user_id: string | null;
  title: string | null;
  content: string | null;
  language: string | null;
  folder: string | null;
  category: string | null;
  tags: string | null;
  expiration: string | null;
  exposure: number | null;
  password: string | null;
  burn_after_read: number | null;
  burn_after_views: number | null;
  views: number | null;
  pinned: number | null;
  forked_from_id: string | null;
  reply_to_id: string | null;
  created_at: number | null;
  updated_at: number | null;
  claim_token: string | null;
};

type LegacyComment = {
  id: number;
  paste_id: string;
  user_id: string;
  content: string | null;
  created_at: number | null;
  parent_id: number | null;
};

type LegacyStar = {
  paste_id: string;
  user_id: string;
  created_at: number | null;
};

type LegacyApiKey = {
  id: string;
  user_id: string;
  key_hash: string;
  label: string | null;
  created_at: number | null;
  last_used_at: number | null;
};

type LegacyPasteFile = {
  paste_id: string;
  filename: string;
  content: string | null;
  language: string | null;
  sort_order: number | null;
};

function readRows<T>(database: Database, query: string): T[] {
  const statement = database.prepare(query);
  const rows: T[] = [];

  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }

  statement.free();
  return rows;
}

type Database = {
  prepare: (query: string) => {
    step: () => boolean;
    getAsObject: () => Record<string, unknown>;
    free: () => void;
  };
};

function mapVisibility(exposure: number | null | undefined) {
  if (exposure === 0) {
    return "public";
  }

  if (exposure === 1) {
    return "unlisted";
  }

  return "private";
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function toDate(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return new Date();
  }

  return new Date(Number(value));
}

function parseExpiration(code: string | null | undefined, createdAt: Date) {
  if (!code || code === "N") {
    return null;
  }

  const next = new Date(createdAt);

  switch (code) {
    case "10M":
      next.setMinutes(next.getMinutes() + 10);
      return next;
    case "1H":
      next.setHours(next.getHours() + 1);
      return next;
    case "1D":
      next.setDate(next.getDate() + 1);
      return next;
    case "1W":
      next.setDate(next.getDate() + 7);
      return next;
    case "2W":
      next.setDate(next.getDate() + 14);
      return next;
    case "1M":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "6M":
      next.setMonth(next.getMonth() + 6);
      return next;
    case "1Y":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return null;
  }
}

async function main() {
  ensureDatabaseUrl();

  const dbPath = process.argv[2] || path.join(process.cwd(), "server", "woxbin.db");
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Legacy database not found at ${dbPath}`);
  }

  const SQL = await initSqlJs();
  const sqlite = new SQL.Database(fs.readFileSync(dbPath));

  const users = readRows<LegacyUser>(sqlite, "SELECT id, username, password_hash, folders, created_at, webhook_url, display_name FROM users");
  const pastes = readRows<LegacyPaste>(sqlite, "SELECT * FROM pastes");
  const comments = readRows<LegacyComment>(sqlite, "SELECT * FROM paste_comments");
  const stars = readRows<LegacyStar>(sqlite, "SELECT * FROM paste_stars");
  const apiKeys = readRows<LegacyApiKey>(sqlite, "SELECT * FROM api_keys");
  const pasteFiles = readRows<LegacyPasteFile>(sqlite, "SELECT * FROM paste_files");

  const anonymousUser = users.find((user) => user.username === "anonymous");
  const anonymousUserId = anonymousUser?.id ?? null;

  for (const user of users) {
    if (user.username === "anonymous") {
      continue;
    }

    const createdAt = toDate(user.created_at);

    await sql`
      insert into users (
        id, username, password_hash, display_name, webhook_url, onboarding_complete, created_at, updated_at
      ) values (
        ${user.id},
        ${user.username.toLowerCase()},
        ${user.password_hash || null},
        ${user.display_name || null},
        ${user.webhook_url || null},
        true,
        ${createdAt},
        ${createdAt}
      )
      on conflict (id) do nothing
    `;

    const folders = parseJsonArray(user.folders);
    for (const [index, folder] of folders.entries()) {
      await sql`
        insert into folders (user_id, name, sort_order, created_at)
        select ${user.id}, ${folder}, ${index}, ${createdAt}
        where not exists (
          select 1 from folders where user_id = ${user.id} and name = ${folder}
        )
      `;
    }
  }

  for (const paste of pastes) {
    const createdAt = toDate(paste.created_at);
    const updatedAt = toDate(paste.updated_at ?? paste.created_at);
    const tags = parseJsonArray(paste.tags);
    const isAnonymous = paste.user_id && paste.user_id === anonymousUserId;
    const userId = isAnonymous ? null : paste.user_id;
    const passwordHash = paste.password ? await hashPassword(paste.password) : null;

    await sql`
      insert into pastes (
        id, slug, user_id, title, content, language, folder_name, category, tags, visibility,
        status, password_hash, anonymous_claim_hash, burn_after_read, burn_after_views, view_count,
        pinned, favorite, archived, template, forked_from_id, reply_to_id, expires_at, created_at, updated_at
      ) values (
        ${paste.id},
        ${paste.id},
        ${userId},
        ${paste.title || "Untitled"},
        ${paste.content || ""},
        ${paste.language || "none"},
        ${paste.folder || null},
        ${paste.category || null},
        ${sql.json(tags)},
        ${mapVisibility(paste.exposure)},
        ${"active"},
        ${passwordHash},
        ${paste.claim_token ? hashToken(paste.claim_token) : null},
        ${Boolean(paste.burn_after_read)},
        ${paste.burn_after_views || 0},
        ${paste.views || 0},
        ${Boolean(paste.pinned)},
        ${false},
        ${false},
        ${false},
        ${paste.forked_from_id || null},
        ${paste.reply_to_id || null},
        ${parseExpiration(paste.expiration, createdAt)},
        ${createdAt},
        ${updatedAt}
      )
      on conflict (id) do nothing
    `;
  }

  for (const file of pasteFiles) {
    await sql`
      insert into paste_files (paste_id, filename, content, language, sort_order)
      select
        ${file.paste_id},
        ${file.filename},
        ${file.content || ""},
        ${file.language || "none"},
        ${file.sort_order || 0}
      where not exists (
        select 1
        from paste_files
        where paste_id = ${file.paste_id}
          and filename = ${file.filename}
          and sort_order = ${file.sort_order || 0}
      )
    `;
  }

  for (const comment of comments) {
    await sql`
      insert into comments (id, paste_id, user_id, parent_id, content, status, created_at, updated_at)
      values (
        ${comment.id},
        ${comment.paste_id},
        ${comment.user_id},
        ${comment.parent_id || null},
        ${comment.content || ""},
        ${"active"},
        ${toDate(comment.created_at)},
        ${toDate(comment.created_at)}
      )
      on conflict (id) do nothing
    `;
  }

  for (const star of stars) {
    await sql`
      insert into stars (paste_id, user_id, created_at)
      values (${star.paste_id}, ${star.user_id}, ${toDate(star.created_at)})
      on conflict do nothing
    `;
  }

  for (const key of apiKeys) {
    await sql`
      insert into api_keys (id, user_id, label, token_hash, created_at, last_used_at)
      values (
        ${key.id},
        ${key.user_id},
        ${key.label || "Imported key"},
        ${key.key_hash},
        ${toDate(key.created_at)},
        ${key.last_used_at ? toDate(key.last_used_at) : null}
      )
      on conflict (id) do nothing
    `;
  }

  console.log(`Imported ${users.length} users (${users.length - (anonymousUser ? 1 : 0)} real users).`);
  console.log(`Imported ${pastes.length} pastes, ${pasteFiles.length} files, ${comments.length} comments, ${stars.length} stars, and ${apiKeys.length} API keys.`);

  await sql.end({ timeout: 5 });
}

void main().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 5 }).catch(() => undefined);
  process.exit(1);
});
