const test = require("node:test");
const assert = require("node:assert/strict");

test("normalizePendingComposePayload trims and normalizes compose payloads", async () => {
  const { normalizePendingComposePayload } = await import("../src/vault/bridge.js");

  const payload = normalizePendingComposePayload({
    title: "  Example paste  ",
    content: "hello",
    visibility: "public",
    language: "markdown",
    folderName: " snippets ",
    tags: [" one ", "", "two"],
    pinned: true,
    favorite: false,
    attachments: [
      {
        filename: " image.png ",
        content: "abc123",
        language: "none",
        mediaKind: "image",
        mimeType: "image/png"
      },
      {
        filename: "bad.bin",
        content: ""
      }
    ]
  });

  assert.equal(payload.title, "Example paste");
  assert.equal(payload.folderName, "snippets");
  assert.deepEqual(payload.tags, ["one", "two"]);
  assert.equal(payload.attachments.length, 1);
  assert.equal(payload.attachments[0].filename, "image.png");
});
