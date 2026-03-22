const test = require("node:test");
const assert = require("node:assert/strict");

test("buildOfflineCacheAssets exposes body and attachments with stable metadata", async () => {
  const { buildOfflineCacheAssets } = await import("../src/cloud/offline-cache.js");
  const assets = buildOfflineCacheAssets({
    slug: "demo-slug",
    title: "Demo Paste",
    language: "markdown",
    content: "# demo",
    files: [
      { filename: "notes.txt", content: "hello", language: "none" },
      { filename: "preview.png", content: "aGVsbG8=", mediaKind: "image", mimeType: "image/png" }
    ]
  });

  assert.equal(assets.length, 3);
  assert.equal(assets[0].filename, "Demo Paste.md");
  assert.equal(assets[0].kind, "text");
  assert.equal(assets[1].filename, "notes.txt");
  assert.equal(assets[1].kind, "text");
  assert.equal(assets[2].filename, "preview.png");
  assert.equal(assets[2].kind, "image");
});
