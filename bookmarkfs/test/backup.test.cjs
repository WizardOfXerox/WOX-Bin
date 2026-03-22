const test = require("node:test");
const assert = require("node:assert/strict");

test("buildBackupDocument keeps version and items", async () => {
  const { buildBackupDocument } = await import("../src/vault/backup.js");
  const doc = buildBackupDocument([{ name: "a.txt", serialized: "abc", meta: { schemaVersion: 2 } }], 2);
  assert.equal(doc.version, 2);
  assert.equal(doc.items.length, 1);
});

test("parseBackupDocument rejects malformed backup payloads", async () => {
  const { parseBackupDocument } = await import("../src/vault/backup.js");
  assert.throws(() => parseBackupDocument("{}"), /Invalid backup format/);
});

test("parseBackupDocument filters unusable items", async () => {
  const { parseBackupDocument } = await import("../src/vault/backup.js");
  const parsed = parseBackupDocument(
    JSON.stringify({
      version: 2,
      items: [
        { name: "ok.txt", serialized: "abc", meta: { schemaVersion: 2 } },
        { name: 42, serialized: "bad" },
        { name: "missing-serialized" }
      ]
    })
  );
  assert.equal(parsed.version, 2);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, "ok.txt");
});
