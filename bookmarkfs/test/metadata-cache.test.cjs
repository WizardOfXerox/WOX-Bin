const test = require("node:test");
const assert = require("node:assert/strict");

test("summarizeMetaForIndex keeps stable file metadata fields", async () => {
  const { summarizeMetaForIndex } = await import("../src/vault/metadata-cache.js");

  const entry = summarizeMetaForIndex("folder/example.txt", {
    schemaVersion: 2,
    sizeOriginal: 120,
    sizeStored: 64,
    dateISO: "2026-03-23T00:00:00.000Z",
    type: "text/plain",
    contentHash: "hash",
    chunkHashes: ["a", "b"]
  });

  assert.equal(entry.fullName, "folder/example.txt");
  assert.equal(entry.displayName, "example.txt");
  assert.equal(entry.dir, "folder");
  assert.equal(entry.sizeOriginal, 120);
  assert.equal(entry.chunkCount, 2);
});
