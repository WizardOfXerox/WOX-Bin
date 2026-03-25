const test = require("node:test");
const assert = require("node:assert/strict");

function installChromeStorage(initial = {}) {
  const store = { ...initial };
  global.chrome = {
    storage: {
      local: {
        get(keys, callback) {
          if (Array.isArray(keys)) {
            const next = {};
            for (const key of keys) {
              next[key] = store[key];
            }
            callback(next);
            return;
          }
          callback({ [keys]: store[keys] });
        },
        set(obj, callback) {
          Object.assign(store, obj);
          callback?.();
        }
      }
    }
  };
  return store;
}

test.afterEach(() => {
  delete global.chrome;
});

test("createEmptyCasefile builds a stable local-first draft", async () => {
  const { createEmptyCasefile } = await import("../src/cloud/darkbin-casefiles.js");
  const casefile = createEmptyCasefile({ title: "Incident alpha" });

  assert.equal(casefile.title, "Incident alpha");
  assert.equal(casefile.status, "draft");
  assert.equal(casefile.classification, "private");
  assert.equal(casefile.retention, "manual");
  assert.deepEqual(casefile.timeline, []);
  assert.deepEqual(casefile.evidence, []);
  assert.ok(casefile.id.startsWith("case_"));
});

test("normalizeCasefile trims tags, events, and evidence", async () => {
  const { normalizeCasefile } = await import("../src/cloud/darkbin-casefiles.js");
  const casefile = normalizeCasefile({
    title: "  Incident beta  ",
    alias: " neutral-handle ",
    tags: ["  redaction  ", "", " follow-up "],
    timeline: [{ body: "  first note  " }, { body: "" }],
    evidence: [{ kind: "vault", label: "  proof.txt  ", ref: "vault/proof.txt" }, { label: "" }]
  });

  assert.equal(casefile.title, "Incident beta");
  assert.equal(casefile.alias, "neutral-handle");
  assert.deepEqual(casefile.tags, ["redaction", "follow-up"]);
  assert.equal(casefile.timeline.length, 1);
  assert.equal(casefile.timeline[0].body, "first note");
  assert.equal(casefile.evidence.length, 1);
  assert.equal(casefile.evidence[0].kind, "vault");
  assert.equal(casefile.evidence[0].label, "proof.txt");
});

test("serializeDarkBinExport emits a portable export document", async () => {
  const { createEmptyCasefile, serializeDarkBinExport } = await import("../src/cloud/darkbin-casefiles.js");
  const casefile = createEmptyCasefile({ title: "Portable export" });
  const text = serializeDarkBinExport([casefile]);
  const parsed = JSON.parse(text);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.casefiles.length, 1);
  assert.equal(parsed.casefiles[0].title, "Portable export");
});

test("buildCasefileComposePayload converts a casefile into markdown handoff text", async () => {
  const { buildCasefileComposePayload, normalizeCasefile } = await import("../src/cloud/darkbin-casefiles.js");
  const payload = buildCasefileComposePayload(
    normalizeCasefile({
      title: "Compose ready",
      summary: "High level summary",
      notes: "Private notes",
      tags: ["incident", "sealed"],
      timeline: [{ body: "Observed event", createdAt: "2026-03-25T10:00:00.000Z" }],
      evidence: [{ kind: "cache", label: "Cached paste", ref: "demo-slug" }]
    })
  );

  assert.equal(payload.title, "Compose ready");
  assert.equal(payload.language, "markdown");
  assert.equal(payload.visibility, "private");
  assert.ok(payload.content.includes("## Timeline"));
  assert.ok(payload.content.includes("Observed event"));
  assert.ok(payload.content.includes("Cached paste"));
  assert.ok(payload.tags.includes("dark-bin"));
});

test("importDarkBinExport merges imported casefiles into extension storage", async () => {
  const store = installChromeStorage();
  const {
    createEmptyCasefile,
    importDarkBinExport,
    DARKBIN_STORAGE
  } = await import("../src/cloud/darkbin-casefiles.js");

  const exported = JSON.stringify({
    version: 1,
    casefiles: [createEmptyCasefile({ id: "case_import", title: "Imported case" })]
  });

  const result = await importDarkBinExport(exported);

  assert.equal(result.importedCount, 1);
  assert.equal(result.selectedCaseId, "case_import");
  assert.equal(store[DARKBIN_STORAGE.selectedCaseId], "case_import");
  assert.equal(store[DARKBIN_STORAGE.casefiles].length, 1);
  assert.equal(store[DARKBIN_STORAGE.casefiles][0].title, "Imported case");
});
