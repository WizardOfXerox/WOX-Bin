import { storageLocalGet, storageLocalSet } from "../storage/chrome-local.js";

export const DARKBIN_STORAGE = {
  casefiles: "woxbin_darkbin_casefiles_v1",
  selectedCaseId: "woxbin_darkbin_selected_case_id"
};

function randomId(prefix = "darkbin") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function trimString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((tag) => trimString(tag, 48))
      .filter(Boolean)
      .slice(0, 16);
  }
  if (typeof rawTags === "string") {
    return rawTags
      .split(",")
      .map((tag) => trimString(tag, 48))
      .filter(Boolean)
      .slice(0, 16);
  }
  return [];
}

function normalizeTimelineEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }
  const body = trimString(rawEntry.body, 2000);
  if (!body) {
    return null;
  }
  return {
    id: trimString(rawEntry.id, 120) || randomId("event"),
    body,
    createdAt: trimString(rawEntry.createdAt, 80) || new Date().toISOString()
  };
}

function normalizeEvidenceItem(rawEvidence) {
  if (!rawEvidence || typeof rawEvidence !== "object") {
    return null;
  }
  const kind = ["cache", "vault", "link", "note"].includes(rawEvidence.kind) ? rawEvidence.kind : "note";
  const label = trimString(rawEvidence.label, 180);
  if (!label) {
    return null;
  }
  return {
    id: trimString(rawEvidence.id, 120) || randomId("evidence"),
    kind,
    label,
    ref: trimString(rawEvidence.ref, 500),
    href: trimString(rawEvidence.href, 2048),
    excerpt: trimString(rawEvidence.excerpt, 500),
    addedAt: trimString(rawEvidence.addedAt, 80) || new Date().toISOString()
  };
}

export function createEmptyCasefile(overrides = {}) {
  const now = new Date().toISOString();
  return normalizeCasefile({
    id: randomId("case"),
    title: "Untitled casefile",
    alias: "",
    status: "draft",
    classification: "private",
    retention: "manual",
    summary: "",
    notes: "",
    tags: [],
    timeline: [],
    evidence: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  });
}

export function normalizeCasefile(rawCasefile) {
  if (!rawCasefile || typeof rawCasefile !== "object") {
    return null;
  }

  const title = trimString(rawCasefile.title || "Untitled casefile", 180) || "Untitled casefile";
  const status = ["draft", "active", "watch", "sealed", "closed"].includes(rawCasefile.status)
    ? rawCasefile.status
    : "draft";
  const classification = ["private", "sensitive", "sealed"].includes(rawCasefile.classification)
    ? rawCasefile.classification
    : "private";
  const retention = ["manual", "24h", "7d", "30d", "90d"].includes(rawCasefile.retention)
    ? rawCasefile.retention
    : "manual";
  const createdAt = trimString(rawCasefile.createdAt, 80) || new Date().toISOString();
  const updatedAt = trimString(rawCasefile.updatedAt, 80) || createdAt;

  return {
    id: trimString(rawCasefile.id, 120) || randomId("case"),
    title,
    alias: trimString(rawCasefile.alias, 120),
    status,
    classification,
    retention,
    summary: trimString(rawCasefile.summary, 2000),
    notes: trimString(rawCasefile.notes, 12000),
    tags: normalizeTags(rawCasefile.tags),
    timeline: Array.isArray(rawCasefile.timeline)
      ? rawCasefile.timeline.map(normalizeTimelineEntry).filter(Boolean).slice(0, 200)
      : [],
    evidence: Array.isArray(rawCasefile.evidence)
      ? rawCasefile.evidence.map(normalizeEvidenceItem).filter(Boolean).slice(0, 200)
      : [],
    createdAt,
    updatedAt
  };
}

function sortCasefiles(casefiles) {
  return [...casefiles].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export async function loadDarkBinState() {
  const data = await storageLocalGet([DARKBIN_STORAGE.casefiles, DARKBIN_STORAGE.selectedCaseId]);
  const casefiles = Array.isArray(data[DARKBIN_STORAGE.casefiles])
    ? sortCasefiles(data[DARKBIN_STORAGE.casefiles].map(normalizeCasefile).filter(Boolean))
    : [];
  const selectedCaseId =
    typeof data[DARKBIN_STORAGE.selectedCaseId] === "string" && casefiles.some((casefile) => casefile.id === data[DARKBIN_STORAGE.selectedCaseId])
      ? data[DARKBIN_STORAGE.selectedCaseId]
      : casefiles[0]?.id || null;

  if (selectedCaseId !== data[DARKBIN_STORAGE.selectedCaseId]) {
    await storageLocalSet({ [DARKBIN_STORAGE.selectedCaseId]: selectedCaseId });
  }

  return {
    casefiles,
    selectedCaseId
  };
}

export async function setSelectedDarkBinCaseId(caseId) {
  await storageLocalSet({ [DARKBIN_STORAGE.selectedCaseId]: caseId || null });
}

export async function saveDarkBinCasefile(rawCasefile) {
  const normalized = normalizeCasefile(rawCasefile);
  if (!normalized) {
    throw new Error("Invalid casefile payload.");
  }
  const state = await loadDarkBinState();
  const existing = state.casefiles.find((casefile) => casefile.id === normalized.id);
  const next = {
    ...normalized,
    createdAt: existing?.createdAt || normalized.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const casefiles = sortCasefiles([next, ...state.casefiles.filter((casefile) => casefile.id !== next.id)]);
  await storageLocalSet({
    [DARKBIN_STORAGE.casefiles]: casefiles,
    [DARKBIN_STORAGE.selectedCaseId]: next.id
  });
  return {
    casefiles,
    selectedCaseId: next.id,
    casefile: next
  };
}

export async function deleteDarkBinCasefile(caseId) {
  const state = await loadDarkBinState();
  const casefiles = state.casefiles.filter((casefile) => casefile.id !== caseId);
  const selectedCaseId = state.selectedCaseId === caseId ? casefiles[0]?.id || null : state.selectedCaseId;
  await storageLocalSet({
    [DARKBIN_STORAGE.casefiles]: casefiles,
    [DARKBIN_STORAGE.selectedCaseId]: selectedCaseId
  });
  return {
    casefiles,
    selectedCaseId
  };
}

export function buildDarkBinExportDocument(casefiles) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    casefiles: sortCasefiles((Array.isArray(casefiles) ? casefiles : []).map(normalizeCasefile).filter(Boolean))
  };
}

export function serializeDarkBinExport(casefiles) {
  return JSON.stringify(buildDarkBinExportDocument(casefiles), null, 2);
}

export async function importDarkBinExport(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ""));
  } catch {
    throw new Error("Dark-Bin import must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.casefiles)) {
    throw new Error("Dark-Bin import is missing its casefiles array.");
  }

  const imported = sortCasefiles(parsed.casefiles.map(normalizeCasefile).filter(Boolean));
  if (!imported.length) {
    throw new Error("Dark-Bin import did not contain any valid casefiles.");
  }

  const state = await loadDarkBinState();
  const mergedMap = new Map();
  for (const casefile of state.casefiles) {
    mergedMap.set(casefile.id, casefile);
  }
  for (const casefile of imported) {
    mergedMap.set(casefile.id, {
      ...casefile,
      updatedAt: casefile.updatedAt || new Date().toISOString()
    });
  }

  const casefiles = sortCasefiles([...mergedMap.values()]);
  const selectedCaseId = imported[0]?.id || casefiles[0]?.id || null;
  await storageLocalSet({
    [DARKBIN_STORAGE.casefiles]: casefiles,
    [DARKBIN_STORAGE.selectedCaseId]: selectedCaseId
  });

  return {
    casefiles,
    selectedCaseId,
    importedCount: imported.length
  };
}

export function buildCasefileComposePayload(casefile) {
  const normalized = normalizeCasefile(casefile);
  if (!normalized) {
    throw new Error("Select a valid casefile first.");
  }

  const sections = [
    `# ${normalized.title}`,
    "",
    `- Alias: ${normalized.alias || "none"}`,
    `- Status: ${normalized.status}`,
    `- Classification: ${normalized.classification}`,
    `- Retention: ${normalized.retention}`,
    `- Updated: ${normalized.updatedAt}`,
    ""
  ];

  if (normalized.summary) {
    sections.push("## Summary", "", normalized.summary, "");
  }

  if (normalized.notes) {
    sections.push("## Notes", "", normalized.notes, "");
  }

  if (normalized.timeline.length) {
    sections.push("## Timeline", "");
    for (const event of normalized.timeline) {
      sections.push(`- ${event.createdAt}: ${event.body}`);
    }
    sections.push("");
  }

  if (normalized.evidence.length) {
    sections.push("## Evidence", "");
    for (const item of normalized.evidence) {
      const detail = item.ref || item.href || item.excerpt || "local entry";
      sections.push(`- [${item.kind}] ${item.label} — ${detail}`);
    }
    sections.push("");
  }

  return {
    title: normalized.title,
    content: sections.join("\n").trim(),
    language: "markdown",
    visibility: "private",
    tags: [...normalized.tags, "dark-bin"].slice(0, 50),
    sourceType: "extension",
    sourceTitle: "Dark-Bin"
  };
}
