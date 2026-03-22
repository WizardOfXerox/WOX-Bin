const test = require("node:test");
const assert = require("node:assert/strict");

test("describeChunkTreeIssues reports mismatched manifest counts", async () => {
  const { describeChunkTreeIssues } = await import("../src/vault/recovery.js");
  const issues = describeChunkTreeIssues(
    { contentHash: "abc", chunkHashes: ["1", "2"], chunkSize: 9092 },
    1,
    1
  );
  assert.equal(issues.length, 1);
  assert.match(issues[0], /does not match manifest/);
});

test("collectChunkTreeStats separates meta and data nodes", async () => {
  const { collectChunkTreeStats } = await import("../src/vault/recovery.js");
  const stats = collectChunkTreeStats(
    [{ title: "!meta:abc" }, { title: "part-a" }, { title: "part-b" }],
    "!meta:"
  );
  assert.equal(stats.metaNodeCount, 1);
  assert.equal(stats.dataNodeCount, 2);
});
