const test = require("node:test");
const assert = require("node:assert/strict");

test("findCachedFileByHash returns the matching indexed entry", async () => {
  const { findCachedFileByHash } = await import("../src/vault/file-ops.js");
  const hit = findCachedFileByHash(
    [{ fullName: "a.txt", contentHash: "abc" }, { fullName: "b.txt", contentHash: "def" }],
    "def"
  );
  assert.equal(hit.fullName, "b.txt");
});

test("ensureIndexedEntries hydrates only focused missing entries", async () => {
  const { ensureIndexedEntries } = await import("../src/vault/file-ops.js");
  let reads = 0;
  const result = await ensureIndexedEntries({
    currentIndex: [{ fullName: "kept.txt", contentHash: "1" }],
    files: [{ handle: { title: "kept.txt" } }, { handle: { title: "new.txt" } }, { handle: { title: "skip.txt" } }],
    focusNames: ["new.txt"],
    async readMeta(file) {
      reads += 1;
      return { contentHash: file.handle.title };
    },
    summarizeMeta(fullName, meta) {
      return { fullName, contentHash: meta.contentHash };
    }
  });

  assert.equal(reads, 1);
  assert.equal(result.entries.length, 2);
  assert.equal(result.mutated, true);
});
