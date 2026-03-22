const test = require("node:test");
const assert = require("node:assert/strict");

test("buildVirtualWindow clamps and overscans page ranges", async () => {
  const { buildVirtualWindow } = await import("../src/vault/ui.js");
  const entries = Array.from({ length: 120 }, (_, idx) => ({ name: `item-${idx}` }));
  const state = buildVirtualWindow(entries, 3, 20, 1);
  assert.equal(state.currentPage, 3);
  assert.equal(state.totalPages, 6);
  assert.equal(state.pageEntries.length, 20);
  assert.equal(state.renderEntries.length, 60);
});

test("summarizeVaultAnalytics uses cached stored bytes only", async () => {
  const { summarizeVaultAnalytics } = await import("../src/vault/ui.js");
  const summary = summarizeVaultAnalytics(4, [{ sizeStored: 10 }, { sizeStored: 15 }, { nope: true }]);
  assert.equal(summary.itemCount, 4);
  assert.equal(summary.indexedCount, 3);
  assert.equal(summary.storedBytes, 25);
});
