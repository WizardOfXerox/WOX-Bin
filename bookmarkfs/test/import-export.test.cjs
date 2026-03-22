const test = require("node:test");
const assert = require("node:assert/strict");

test("buildImportPlan previews renamed conflicts deterministically", async () => {
  const { buildImportPlan } = await import("../src/vault/import-export.js");
  const plan = buildImportPlan(
    [
      { name: "notes.txt", serialized: "a" },
      { name: "notes.txt", serialized: "b" }
    ],
    new Set(["notes.txt"])
  );

  assert.equal(plan.total, 2);
  assert.equal(plan.renamed, 2);
  assert.equal(plan.items[0].finalName, "notes (2).txt");
  assert.equal(plan.items[1].finalName, "notes (3).txt");
});
