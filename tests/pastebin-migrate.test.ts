import { describe, expect, it } from "vitest";

import { pastebinMigrateBodySchema } from "@/lib/pastebin-migrate-schema";

describe("pastebin migrate request schema", () => {
  it("accepts a blank folder value sent as null", () => {
    const result = pastebinMigrateBodySchema.safeParse({
      username: "wizard",
      password: "secret-password",
      limit: 25,
      folderName: null
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.folderName).toBeNull();
    }
  });

  it("normalizes a whitespace folder name to null", () => {
    const result = pastebinMigrateBodySchema.safeParse({
      username: "wizard",
      password: "secret-password",
      limit: 25,
      folderName: "   "
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.folderName).toBeNull();
    }
  });
});
