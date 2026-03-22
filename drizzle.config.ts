import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

function readEnvFileValue(key: string) {
  for (const filename of [".env.local", ".env"]) {
    const filepath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filepath)) {
      continue;
    }

    const match = fs
      .readFileSync(filepath, "utf8")
      .split(/\r?\n/)
      .find((line) => line.startsWith(`${key}=`));

    if (!match) {
      continue;
    }

    return match
      .slice(key.length + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }

  return "";
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || readEnvFileValue("DATABASE_URL")
  }
});
