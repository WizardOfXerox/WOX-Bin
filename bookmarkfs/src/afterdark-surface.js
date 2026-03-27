import { loadOfflineCacheEntries } from "./cloud/offline-cache.js";
import {
  buildCasefileComposePayload,
  createEmptyCasefile,
  deleteDarkBinCasefile,
  importDarkBinExport,
  loadDarkBinState,
  saveDarkBinCasefile,
  serializeDarkBinExport,
  setSelectedDarkBinCaseId
} from "./cloud/darkbin-casefiles.js";
import {
  WOXBIN_STORAGE,
  getSelectedProfile,
  loadProfiles,
  normalizeBaseUrl,
  resolveProfileCredentials,
  setSelectedProfileId,
  unlockProfile
} from "./cloud/woxbin-profiles.js";
import { storageLocalGet, storageLocalSet } from "./storage/chrome-local.js";
import { setPendingCompose } from "./vault/bridge.js";

const PAGE_SIZE = 8;
const DEFAULT_ROUTE_LABELS = [
  ["/app", "Workspace"],
  ["/quick", "Quick paste"],
  ["/clipboard", "Clipboard"],
  ["/fragment", "Fragment"],
  ["/privacy-tools", "Privacy suite"],
  ["/bookmarkfs/sync", "Hosted sync"]
];

const LANGUAGES = [
  ["none", "Plain text"],
  ["markdown", "Markdown"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["bash", "Bash"],
  ["json", "JSON"]
];

const searchParams = new URLSearchParams(window.location.search || "");
const EMBEDDED = searchParams.get("embed") === "1";

function joinUrl(base, path) {
  const normalized = normalizeBaseUrl(base);
  if (!normalized) {
    return "";
  }
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString();
}

function formatRelativeSize(chars) {
  const size = Number(chars || 0);
  if (size < 1024) {
    return `${size} chars`;
  }
  return `${(size / 1024).toFixed(size < 10_240 ? 1 : 0)} KB`;
}

function safeTextPreview(text, limit = 220) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "(empty)";
  }
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized;
}

function parseTagsInput(raw) {
  return String(raw || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function countAllTimelineEntries(casefiles) {
  return (Array.isArray(casefiles) ? casefiles : []).reduce(
    (sum, casefile) => sum + (Array.isArray(casefile.timeline) ? casefile.timeline.length : 0),
    0
  );
}

function countAllEvidenceEntries(casefiles) {
  return (Array.isArray(casefiles) ? casefiles : []).reduce(
    (sum, casefile) => sum + (Array.isArray(casefile.evidence) ? casefile.evidence.length : 0),
    0
  );
}

function buildDownload(filename, text, mimeType = "application/json") {
  const blob = new Blob([text], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function guessLanguageFromFilename(filename) {
  const ext = String(filename || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  switch (ext) {
    case "md":
      return "markdown";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "sh":
    case "bash":
      return "bash";
    case "json":
      return "json";
    default:
      return "none";
  }
}

function dataBase64ToBlob(base64, mimeType = "application/octet-stream") {
  const raw = atob(base64 || "");
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function postParent(message) {
  if (!EMBEDDED || !window.parent || window.parent === window) {
    return;
  }
  window.parent.postMessage(
    {
      source: "bookmarkfs-afterdark",
      ...message
    },
    "*"
  );
}

async function vaultRpc(action, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "bookmarkfs-sync-rpc",
        action,
        payload
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Vault bridge is unavailable."));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || "Vault request failed."));
          return;
        }
        resolve(response.data);
      }
    );
  });
}

async function createApiFetch() {
  const profile = await getSelectedProfile();
  const creds = await resolveProfileCredentials(profile);
  return async function apiFetch(path, init = {}) {
    if (!creds.baseUrl || !creds.apiKey) {
      throw new Error("Select an unlocked profile with an API key first.");
    }
    const response = await fetch(joinUrl(creds.baseUrl, path), {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {})
      },
      body: init.body,
      cache: "no-store"
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!response.ok) {
      throw new Error(json?.error || text || `HTTP ${response.status}`);
    }
    return json;
  };
}

function ensureModal() {
  let modal = document.getElementById("afterdark-modal");
  if (modal) {
    return modal;
  }
  modal = document.createElement("div");
  modal.id = "afterdark-modal";
  modal.className = "afterdark-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="afterdark-modal__backdrop" data-close="1"></div>
    <div class="afterdark-modal__card">
      <div class="afterdark-modal__head">
        <div>
          <p class="afterdark-modal__eyebrow">Preview</p>
          <h2 id="afterdark-modal-title">Vault file</h2>
        </div>
        <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-close="1">Close</button>
      </div>
      <div class="afterdark-modal__body" id="afterdark-modal-body"></div>
    </div>
  `;
  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.close === "1") {
      modal.hidden = true;
    }
  });
  document.body.appendChild(modal);
  return modal;
}

function openModal(title, bodyHtml) {
  const modal = ensureModal();
  const titleEl = modal.querySelector("#afterdark-modal-title");
  const bodyEl = modal.querySelector("#afterdark-modal-body");
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (bodyEl) {
    bodyEl.innerHTML = bodyHtml;
  }
  modal.hidden = false;
}

export async function mountAfterdarkSurface(rootEl) {
  if (!rootEl) {
    return;
  }

  rootEl.innerHTML = `
    <div class="afterdark-shell${EMBEDDED ? " afterdark-shell--embedded" : ""}">
      <header class="afterdark-hero">
        <div class="afterdark-hero__copy">
          <p class="afterdark-hero__eyebrow">${EMBEDDED ? "Injected takeover mode" : "Extension-only mode"}</p>
          <h1>WOX-Bin Afterdark</h1>
          <p class="afterdark-hero__text">
            ${
              EMBEDDED
                ? "The extension is replacing the current WOX-Bin page shell with an extension-owned privacy desk while keeping your selected profile, local BookmarkFS vault, cached hosted data, and casefiles connected."
                : "A private extension-owned workspace for quick publish, local casefiles, BookmarkFS vault handoff, cached hosted references, and the main WOX-Bin routes. This surface lives in the extension, not in the public app."
            }
          </p>
        </div>
        <div class="afterdark-hero__actions">
          <button type="button" class="afterdark-btn afterdark-btn--primary" id="afterdark-open-app">Open workspace</button>
          <button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-open-sync">Open sync</button>
          ${
            EMBEDDED
              ? '<button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-open-detached">Open detached</button><button type="button" class="afterdark-btn afterdark-btn--ghost" id="afterdark-open-companion">Return to page</button>'
              : '<button type="button" class="afterdark-btn afterdark-btn--ghost" id="afterdark-open-companion">Back to companion</button>'
          }
        </div>
      </header>

      <section class="afterdark-stats" id="afterdark-stats"></section>

      <div class="afterdark-layout">
        <aside class="afterdark-sidebar">
          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Profiles</p>
                <h2>Hosted targets</h2>
              </div>
            </div>
            <div id="afterdark-profile-list" class="afterdark-profile-list"></div>
            <div class="afterdark-setting">
              <label class="afterdark-toggle">
                <input type="checkbox" id="afterdark-page-launcher" />
                <span>Show Afterdark launcher on WOX-Bin pages</span>
              </label>
              <p class="afterdark-hint">Adds a small floating launcher on supported WOX-Bin pages when the extension is installed.</p>
            </div>
            <div id="afterdark-unlock-wrap" class="afterdark-unlock" hidden>
              <label for="afterdark-passphrase">Profile passphrase</label>
              <input type="password" id="afterdark-passphrase" class="afterdark-input" placeholder="Unlock selected profile" />
              <button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-unlock-btn">Unlock profile</button>
            </div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Routes</p>
                <h2>Jump points</h2>
              </div>
            </div>
            <div class="afterdark-route-grid" id="afterdark-route-grid"></div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Registry</p>
                <h2>Casefiles</h2>
              </div>
              <div class="afterdark-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" id="afterdark-new-case">New</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="afterdark-import-case">Import</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="afterdark-export-cases">Export all</button>
              </div>
            </div>
            <label class="afterdark-field">
              <span>Search casefiles</span>
              <input type="search" id="afterdark-search-case" class="afterdark-input" placeholder="Alias, title, tag…" />
            </label>
            <div id="afterdark-case-list" class="afterdark-case-list"></div>
            <input type="file" id="afterdark-import-file" accept="application/json" hidden />
          </section>
        </aside>

        <main class="afterdark-main">
          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Quick compose</p>
                <h2>Send something fast</h2>
              </div>
            </div>
            <div class="afterdark-compose">
              <input type="text" id="afterdark-title" class="afterdark-input" placeholder="Title" />
              <div class="afterdark-compose__row">
                <select id="afterdark-vis" class="afterdark-input">
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
                <select id="afterdark-lang" class="afterdark-input">
                  ${LANGUAGES.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
                </select>
              </div>
              <textarea id="afterdark-body" class="afterdark-textarea" placeholder="Write a paste, a note, or a vault handoff here..."></textarea>
              <div class="afterdark-actions">
                <button type="button" class="afterdark-btn afterdark-btn--primary" id="afterdark-publish">Publish now</button>
                <button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-queue">Queue into workspace</button>
              </div>
            </div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Casefile editor</p>
                <h2 id="afterdark-editor-title">Casefile editor</h2>
              </div>
              <div class="afterdark-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" id="afterdark-duplicate-case">Duplicate</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="afterdark-export-case">Export JSON</button>
              </div>
            </div>

            <div class="afterdark-editor-grid">
              <label class="afterdark-field">
                <span>Case title</span>
                <input type="text" class="afterdark-input" id="afterdark-case-title" maxlength="180" />
              </label>
              <label class="afterdark-field">
                <span>Alias</span>
                <input
                  type="text"
                  class="afterdark-input"
                  id="afterdark-case-alias"
                  maxlength="120"
                  placeholder="Neutral codename or handle"
                />
              </label>
            </div>

            <div class="afterdark-editor-grid afterdark-editor-grid--compact">
              <label class="afterdark-field">
                <span>Status</span>
                <select class="afterdark-input" id="afterdark-case-status">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="watch">Watch</option>
                  <option value="sealed">Sealed</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label class="afterdark-field">
                <span>Classification</span>
                <select class="afterdark-input" id="afterdark-case-classification">
                  <option value="private">Private</option>
                  <option value="sensitive">Sensitive</option>
                  <option value="sealed">Sealed</option>
                </select>
              </label>
              <label class="afterdark-field">
                <span>Retention</span>
                <select class="afterdark-input" id="afterdark-case-retention">
                  <option value="manual">Manual delete</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </label>
            </div>

            <label class="afterdark-field">
              <span>Tags</span>
              <input type="text" class="afterdark-input" id="afterdark-case-tags" placeholder="private, incident, follow-up" />
            </label>

            <label class="afterdark-field">
              <span>Summary</span>
              <textarea
                class="afterdark-textarea afterdark-textarea--summary"
                id="afterdark-case-summary"
                placeholder="High-level context, scope, and handling notes."
              ></textarea>
            </label>

            <label class="afterdark-field">
              <span>Notes</span>
              <textarea
                class="afterdark-textarea afterdark-textarea--notes"
                id="afterdark-case-notes"
                placeholder="Local private notes. Keep personal data out unless you truly need it."
              ></textarea>
            </label>

            <div class="afterdark-editor-footer">
              <div class="afterdark-meta" id="afterdark-case-meta"></div>
              <div class="afterdark-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--primary" id="afterdark-save-case">Save casefile</button>
                <button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-queue-case">Queue to workspace</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost" id="afterdark-delete-case">Delete</button>
              </div>
            </div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Timeline</p>
                <h2>Events</h2>
              </div>
            </div>
            <div class="afterdark-timeline-composer">
              <textarea
                class="afterdark-textarea afterdark-textarea--event"
                id="afterdark-event-body"
                placeholder="Add a local event note, handoff, or observation."
              ></textarea>
              <button type="button" class="afterdark-btn afterdark-btn--secondary" id="afterdark-add-event">Add event</button>
            </div>
            <div class="afterdark-timeline" id="afterdark-timeline"></div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Hosted</p>
                <h2>Recent hosted pastes</h2>
              </div>
              <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="afterdark-refresh-hosted">Refresh</button>
            </div>
            <div id="afterdark-hosted-list" class="afterdark-list"></div>
          </section>
        </main>

        <aside class="afterdark-rail">
          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Evidence</p>
                <h2>Attached references</h2>
              </div>
            </div>
            <div id="afterdark-evidence-list" class="afterdark-list"></div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Vault</p>
                <h2>Local BookmarkFS files</h2>
              </div>
              <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="afterdark-refresh-vault">Refresh</button>
            </div>
            <div id="afterdark-vault-list" class="afterdark-list"></div>
          </section>

          <section class="afterdark-card">
            <div class="afterdark-card__head">
              <div>
                <p class="afterdark-card__eyebrow">Offline cache</p>
                <h2>Recent cached pastes</h2>
              </div>
            </div>
            <div id="afterdark-cache-list" class="afterdark-list"></div>
          </section>
        </aside>
      </div>

      <p class="afterdark-status" id="afterdark-status"></p>
    </div>
  `;

  const statusEl = rootEl.querySelector("#afterdark-status");
  const statsEl = rootEl.querySelector("#afterdark-stats");
  const profileListEl = rootEl.querySelector("#afterdark-profile-list");
  const routeGridEl = rootEl.querySelector("#afterdark-route-grid");
  const caseListEl = rootEl.querySelector("#afterdark-case-list");
  const hostedListEl = rootEl.querySelector("#afterdark-hosted-list");
  const evidenceListEl = rootEl.querySelector("#afterdark-evidence-list");
  const vaultListEl = rootEl.querySelector("#afterdark-vault-list");
  const cacheListEl = rootEl.querySelector("#afterdark-cache-list");
  const launcherToggle = rootEl.querySelector("#afterdark-page-launcher");
  const unlockWrap = rootEl.querySelector("#afterdark-unlock-wrap");
  const unlockPassphrase = rootEl.querySelector("#afterdark-passphrase");
  const importFileEl = rootEl.querySelector("#afterdark-import-file");
  const searchCaseEl = rootEl.querySelector("#afterdark-search-case");
  const eventBodyEl = rootEl.querySelector("#afterdark-event-body");
  const timelineEl = rootEl.querySelector("#afterdark-timeline");
  const metaEl = rootEl.querySelector("#afterdark-case-meta");
  const editorTitleEl = rootEl.querySelector("#afterdark-editor-title");

  const titleInput = rootEl.querySelector("#afterdark-title");
  const bodyInput = rootEl.querySelector("#afterdark-body");
  const visibilityInput = rootEl.querySelector("#afterdark-vis");
  const languageInput = rootEl.querySelector("#afterdark-lang");

  const formEls = {
    title: rootEl.querySelector("#afterdark-case-title"),
    alias: rootEl.querySelector("#afterdark-case-alias"),
    status: rootEl.querySelector("#afterdark-case-status"),
    classification: rootEl.querySelector("#afterdark-case-classification"),
    retention: rootEl.querySelector("#afterdark-case-retention"),
    tags: rootEl.querySelector("#afterdark-case-tags"),
    summary: rootEl.querySelector("#afterdark-case-summary"),
    notes: rootEl.querySelector("#afterdark-case-notes")
  };

  let currentProfile = null;
  let currentCreds = { baseUrl: "", apiKey: "", locked: true };
  let hostedItems = [];
  let vaultItems = [];
  let cacheItems = [];
  let profileCount = 0;
  let caseState = { casefiles: [], selectedCaseId: null };
  let currentCase = null;
  let caseSearchQuery = "";

  function setStatus(message, kind = "") {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message || "";
    statusEl.className = `afterdark-status${kind ? ` ${kind}` : ""}`;
    statusEl.hidden = !message;
  }

  function openRoute(path) {
    const href = currentCreds.baseUrl ? joinUrl(currentCreds.baseUrl, path) : "";
    if (!href) {
      setStatus("Select an unlocked profile first.", "err");
      return;
    }
    if (EMBEDDED) {
      postParent({
        type: "woxbin-afterdark-navigate",
        href
      });
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function syncFormFromCasefile() {
    if (!currentCase) {
      return;
    }
    if (editorTitleEl) {
      editorTitleEl.textContent = currentCase.title;
    }
    formEls.title.value = currentCase.title;
    formEls.alias.value = currentCase.alias || "";
    formEls.status.value = currentCase.status;
    formEls.classification.value = currentCase.classification;
    formEls.retention.value = currentCase.retention;
    formEls.tags.value = currentCase.tags.join(", ");
    formEls.summary.value = currentCase.summary || "";
    formEls.notes.value = currentCase.notes || "";
    if (metaEl) {
      metaEl.textContent = `Created ${formatDate(currentCase.createdAt)} · Updated ${formatDate(currentCase.updatedAt)}`;
    }
  }

  function buildFormCasefile() {
    if (!currentCase) {
      return createEmptyCasefile();
    }
    return {
      ...currentCase,
      title: formEls.title.value || "Untitled casefile",
      alias: formEls.alias.value || "",
      status: formEls.status.value,
      classification: formEls.classification.value,
      retention: formEls.retention.value,
      tags: parseTagsInput(formEls.tags.value),
      summary: formEls.summary.value || "",
      notes: formEls.notes.value || ""
    };
  }

  async function ensureCaseSelection() {
    if (!caseState.casefiles.length) {
      const saved = await saveDarkBinCasefile(createEmptyCasefile());
      caseState = {
        casefiles: saved.casefiles,
        selectedCaseId: saved.selectedCaseId
      };
    }
    currentCase =
      caseState.casefiles.find((casefile) => casefile.id === caseState.selectedCaseId) || caseState.casefiles[0] || null;
    if (currentCase && caseState.selectedCaseId !== currentCase.id) {
      caseState.selectedCaseId = currentCase.id;
      await setSelectedDarkBinCaseId(currentCase.id);
    }
  }

  async function attachEvidence(evidence) {
    if (!currentCase) {
      setStatus("Select a casefile first.", "err");
      return;
    }
    const nextCase = {
      ...buildFormCasefile(),
      evidence: [evidence, ...currentCase.evidence.filter((item) => item.ref !== evidence.ref || item.label !== evidence.label)].slice(0, 200)
    };
    const saved = await saveDarkBinCasefile(nextCase);
    caseState = {
      casefiles: saved.casefiles,
      selectedCaseId: saved.selectedCaseId
    };
    currentCase = saved.casefile;
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderEvidence();
    setStatus(`Attached "${evidence.label}" to ${currentCase.title}.`, "ok");
  }

  function renderRoutes() {
    if (!routeGridEl) {
      return;
    }
    routeGridEl.innerHTML = DEFAULT_ROUTE_LABELS.map(
      ([path, label]) => `
        <button type="button" class="afterdark-route" data-route="${escapeHtml(path)}" ${currentCreds.baseUrl ? "" : "disabled"}>
          <span>${escapeHtml(label)}</span>
          <small>${escapeHtml(path)}</small>
        </button>
      `
    ).join("");
    routeGridEl.querySelectorAll("[data-route]").forEach((button) => {
      button.addEventListener("click", () => openRoute(button.getAttribute("data-route") || "/"));
    });
  }

  function renderStats() {
    if (!statsEl) {
      return;
    }
    const stats = [
      ["Profiles", String(profileCount)],
      ["Casefiles", String(caseState.casefiles.length)],
      ["Evidence refs", String(countAllEvidenceEntries(caseState.casefiles))],
      ["Local sources", String(vaultItems.length + cacheItems.length)]
    ];
    statsEl.innerHTML = stats
      .map(
        ([label, value]) => `
          <div class="afterdark-stat">
            <span class="afterdark-stat__value">${escapeHtml(value)}</span>
            <span class="afterdark-stat__label">${escapeHtml(label)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderProfiles(profiles, selectedProfileId) {
    if (!profileListEl) {
      return;
    }
    profileListEl.innerHTML = profiles.length
      ? profiles
          .map((profile) => {
            const selected = profile.id === selectedProfileId;
            return `
              <button type="button" class="afterdark-profile${selected ? " is-active" : ""}" data-profile-id="${escapeHtml(profile.id)}">
                <strong>${escapeHtml(profile.label)}</strong>
                <span>${escapeHtml(profile.baseUrl)}</span>
              </button>
            `;
          })
          .join("")
      : `<p class="afterdark-empty">No saved profiles yet. Add one in the normal companion view first.</p>`;

    profileListEl.querySelectorAll("[data-profile-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const profileId = button.getAttribute("data-profile-id");
        if (!profileId) {
          return;
        }
        await setSelectedProfileId(profileId);
        await refreshAll();
      });
    });
  }

  function renderCaseList() {
    if (!caseListEl) {
      return;
    }
    const filtered = caseState.casefiles.filter((casefile) => {
      const haystack = `${casefile.title} ${casefile.alias} ${casefile.tags.join(" ")} ${casefile.summary}`.toLowerCase();
      return !caseSearchQuery || haystack.includes(caseSearchQuery);
    });

    if (!filtered.length) {
      caseListEl.innerHTML = `<p class="afterdark-empty">No casefiles match this search yet.</p>`;
      return;
    }

    caseListEl.innerHTML = filtered
      .map(
        (casefile) => `
          <button type="button" class="afterdark-case${casefile.id === currentCase?.id ? " is-active" : ""}" data-case-id="${escapeHtml(casefile.id)}">
            <div class="afterdark-case__head">
              <strong>${escapeHtml(casefile.title)}</strong>
              <span class="afterdark-pill afterdark-pill--${escapeHtml(casefile.status)}">${escapeHtml(casefile.status)}</span>
            </div>
            <p>${escapeHtml(casefile.alias || safeTextPreview(casefile.summary, 90))}</p>
            <div class="afterdark-case__meta">
              <span>${escapeHtml(casefile.classification)}</span>
              <span>${escapeHtml(formatDate(casefile.updatedAt))}</span>
            </div>
          </button>
        `
      )
      .join("");

    caseListEl.querySelectorAll("[data-case-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const nextId = button.getAttribute("data-case-id");
        if (!nextId || nextId === currentCase?.id) {
          return;
        }
        currentCase = caseState.casefiles.find((casefile) => casefile.id === nextId) || currentCase;
        if (!currentCase) {
          return;
        }
        caseState.selectedCaseId = currentCase.id;
        await setSelectedDarkBinCaseId(currentCase.id);
        syncFormFromCasefile();
        renderCaseList();
        renderTimeline();
        renderEvidence();
      });
    });
  }

  function renderTimeline() {
    if (!timelineEl) {
      return;
    }
    if (!currentCase?.timeline?.length) {
      timelineEl.innerHTML = `<p class="afterdark-empty">No local events yet. Add a handoff note, observation, or scrub reminder.</p>`;
      return;
    }

    timelineEl.innerHTML = currentCase.timeline
      .map(
        (event) => `
          <article class="afterdark-event">
            <div class="afterdark-event__copy">
              <strong>${escapeHtml(formatDate(event.createdAt))}</strong>
              <p>${escapeHtml(event.body)}</p>
            </div>
            <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-remove-event="${escapeHtml(event.id)}">Remove</button>
          </article>
        `
      )
      .join("");

    timelineEl.querySelectorAll("[data-remove-event]").forEach((button) => {
      button.addEventListener("click", async () => {
        const eventId = button.getAttribute("data-remove-event");
        if (!eventId || !currentCase) {
          return;
        }
        const nextCase = {
          ...buildFormCasefile(),
          timeline: currentCase.timeline.filter((event) => event.id !== eventId)
        };
        const saved = await saveDarkBinCasefile(nextCase);
        caseState = {
          casefiles: saved.casefiles,
          selectedCaseId: saved.selectedCaseId
        };
        currentCase = saved.casefile;
        syncFormFromCasefile();
        renderStats();
        renderCaseList();
        renderTimeline();
      });
    });
  }

  function renderEvidence() {
    if (!evidenceListEl) {
      return;
    }
    if (!currentCase?.evidence?.length) {
      evidenceListEl.innerHTML = `<p class="afterdark-empty">Attach vault files, cached hosted pastes, or private links to the active casefile.</p>`;
      return;
    }

    evidenceListEl.innerHTML = currentCase.evidence
      .map(
        (item) => `
          <article class="afterdark-item">
            <div class="afterdark-item__copy">
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.excerpt || item.ref || item.href || "local reference")}</p>
              <span>${escapeHtml(item.kind)} · ${escapeHtml(formatDate(item.addedAt))}</span>
            </div>
            <div class="afterdark-item__actions">
              <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-open-evidence="${escapeHtml(item.id)}">Open</button>
              <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-remove-evidence="${escapeHtml(item.id)}">Remove</button>
            </div>
          </article>
        `
      )
      .join("");

    evidenceListEl.querySelectorAll("[data-remove-evidence]").forEach((button) => {
      button.addEventListener("click", async () => {
        const evidenceId = button.getAttribute("data-remove-evidence");
        if (!evidenceId || !currentCase) {
          return;
        }
        const nextCase = {
          ...buildFormCasefile(),
          evidence: currentCase.evidence.filter((item) => item.id !== evidenceId)
        };
        const saved = await saveDarkBinCasefile(nextCase);
        caseState = {
          casefiles: saved.casefiles,
          selectedCaseId: saved.selectedCaseId
        };
        currentCase = saved.casefile;
        syncFormFromCasefile();
        renderStats();
        renderCaseList();
        renderEvidence();
      });
    });

    evidenceListEl.querySelectorAll("[data-open-evidence]").forEach((button) => {
      button.addEventListener("click", async () => {
        const evidenceId = button.getAttribute("data-open-evidence");
        const item = currentCase?.evidence.find((entry) => entry.id === evidenceId);
        if (!item) {
          return;
        }
        if (item.kind === "link" && item.href) {
          window.open(item.href, "_blank", "noopener,noreferrer");
          return;
        }
        if (item.kind === "cache") {
          const href =
            item.href || (item.ref && currentCreds.baseUrl ? joinUrl(currentCreds.baseUrl, `/p/${encodeURIComponent(item.ref)}`) : "");
          if (href) {
            window.open(href, "_blank", "noopener,noreferrer");
            return;
          }
        }
        if (item.kind === "vault" && item.ref) {
          try {
            const file = await vaultRpc("vault.read", { fullName: item.ref });
            if (file.textLike) {
              openModal(item.label, `<pre class="afterdark-preview">${escapeHtml(file.textContent || "")}</pre>`);
              return;
            }
            const mimeType = file.mimeType || "application/octet-stream";
            if (mimeType.startsWith("image/")) {
              openModal(
                item.label,
                `<img class="afterdark-preview__media" src="data:${escapeHtml(mimeType)};base64,${file.dataBase64}" alt="${escapeHtml(item.label)}" />`
              );
              return;
            }
            if (mimeType.startsWith("video/")) {
              openModal(
                item.label,
                `<video class="afterdark-preview__media" src="data:${escapeHtml(mimeType)};base64,${file.dataBase64}" controls autoplay playsinline></video>`
              );
              return;
            }
            const blob = dataBase64ToBlob(file.dataBase64, mimeType);
            const objectUrl = URL.createObjectURL(blob);
            openModal(
              item.label,
              `<div class="afterdark-preview__actions"><a class="afterdark-btn afterdark-btn--primary" href="${objectUrl}" download="${escapeHtml(
                item.label
              )}">Download file</a></div>`
            );
          } catch (error) {
            setStatus(error instanceof Error ? error.message : String(error), "err");
          }
          return;
        }
        openModal(item.label, `<p class="afterdark-empty">${escapeHtml(item.excerpt || item.ref || item.href || "No preview available.")}</p>`);
      });
    });
  }

  function renderHosted() {
    if (!hostedListEl) {
      return;
    }
    hostedListEl.innerHTML = hostedItems.length
      ? hostedItems
          .map(
            (item) => `
              <article class="afterdark-item">
                <div class="afterdark-item__copy">
                  <strong>${escapeHtml(item.title || item.slug || "Untitled")}</strong>
                  <p>${escapeHtml(safeTextPreview(item.content || ""))}</p>
                  <span>${escapeHtml(item.visibility || "private")} · ${escapeHtml(item.language || "none")} · ${escapeHtml(formatDate(item.updatedAt || item.createdAt))}</span>
                </div>
                <div class="afterdark-item__actions">
                  <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-open-slug="${escapeHtml(
                    item.slug || ""
                  )}">Open</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-queue-slug="${escapeHtml(
                    item.slug || ""
                  )}">Queue</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-attach-hosted="${escapeHtml(
                    item.slug || ""
                  )}">Attach</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<p class="afterdark-empty">No hosted pastes loaded yet.</p>`;

    hostedListEl.querySelectorAll("[data-open-slug]").forEach((button) => {
      button.addEventListener("click", () => {
        const slug = button.getAttribute("data-open-slug");
        if (slug) {
          openRoute(`/p/${slug}`);
        }
      });
    });

    hostedListEl.querySelectorAll("[data-queue-slug]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.getAttribute("data-queue-slug");
        if (!slug) {
          return;
        }
        const apiFetch = await createApiFetch();
        try {
          const body = await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`);
          await setPendingCompose({
            title: body.title || slug,
            content: body.content || "",
            visibility: body.visibility || "private",
            language: body.language || "none",
            folderName: body.folderName || "",
            tags: Array.isArray(body.tags) ? body.tags : [],
            pinned: Boolean(body.pinned),
            favorite: Boolean(body.favorite),
            attachments: Array.isArray(body.files) ? body.files : []
          });
          openRoute("/app");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error), "err");
        }
      });
    });

    hostedListEl.querySelectorAll("[data-attach-hosted]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.getAttribute("data-attach-hosted");
        const entry = hostedItems.find((item) => item.slug === slug);
        if (!entry) {
          return;
        }
        await attachEvidence({
          kind: "link",
          label: entry.title || entry.slug || "Hosted paste",
          ref: entry.slug || "",
          href: currentCreds.baseUrl && entry.slug ? joinUrl(currentCreds.baseUrl, `/p/${entry.slug}`) : "",
          excerpt: safeTextPreview(entry.content || "", 140)
        });
      });
    });
  }

  function renderVault() {
    if (!vaultListEl) {
      return;
    }
    vaultListEl.innerHTML = vaultItems.length
      ? vaultItems
          .slice(0, 8)
          .map(
            (entry) => `
              <article class="afterdark-item afterdark-item--vault">
                <div class="afterdark-item__copy">
                  <strong>${escapeHtml(entry.displayName || entry.name || entry.fullName || "Vault file")}</strong>
                  <p>${escapeHtml(entry.dir || "vault root")}</p>
                  <div class="afterdark-item__meta-row">
                    <span class="afterdark-item__type">${escapeHtml(entry.typeLabel || entry.mimeType || "file")}</span>
                    <span>${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                  </div>
                </div>
                <div class="afterdark-item__actions afterdark-item__actions--vault">
                  <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-preview-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Preview</button>
                  <button type="button" class="afterdark-btn afterdark-btn--primary afterdark-btn--tiny" data-queue-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Queue</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-download-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Download</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-sync-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Sync</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny afterdark-btn--wide" data-attach-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Attach reference</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<p class="afterdark-empty">No local vault files yet.</p>`;

    vaultListEl.querySelectorAll("[data-preview-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-preview-vault");
        if (!fullName) {
          return;
        }
        try {
          const file = await vaultRpc("vault.read", { fullName });
          if (file.textLike) {
            openModal(
              file.displayName || fullName,
              `<pre class="afterdark-preview">${escapeHtml(file.textContent || "")}</pre>`
            );
            return;
          }
          const blob = dataBase64ToBlob(file.dataBase64, file.mimeType);
          const objectUrl = URL.createObjectURL(blob);
          const isImage = String(file.mimeType || "").startsWith("image/");
          openModal(
            file.displayName || fullName,
            isImage
              ? `<img class="afterdark-preview__media" src="${objectUrl}" alt="${escapeHtml(file.displayName || fullName)}" />`
              : `<div class="afterdark-preview__actions"><a class="afterdark-btn afterdark-btn--primary" href="${objectUrl}" download="${escapeHtml(
                  file.displayName || "vault-file"
                )}">Download file</a></div>`
          );
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error), "err");
        }
      });
    });

    vaultListEl.querySelectorAll("[data-download-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-download-vault");
        if (!fullName) {
          return;
        }
        try {
          const file = await vaultRpc("vault.read", { fullName });
          const blob = dataBase64ToBlob(file.dataBase64, file.mimeType);
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = file.displayName || fullName.split("/").pop() || "vault-file";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
          setStatus(`Downloaded ${file.displayName || fullName}.`, "ok");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error), "err");
        }
      });
    });

    vaultListEl.querySelectorAll("[data-queue-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-queue-vault");
        if (!fullName) {
          return;
        }
        try {
          const file = await vaultRpc("vault.read", { fullName });
          if (file.textLike) {
            await setPendingCompose({
              title: file.displayName || fullName,
              content: file.textContent || "",
              visibility: "private",
              language: guessLanguageFromFilename(file.displayName || fullName)
            });
            openRoute("/app");
            return;
          }
          const mimeType = file.mimeType || "application/octet-stream";
          if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) {
            await setPendingCompose({
              title: file.displayName || fullName,
              content: "",
              visibility: "private",
              language: "none",
              attachments: [
                {
                  filename: file.displayName || fullName,
                  content: file.dataBase64,
                  language: "none",
                  mediaKind: mimeType.startsWith("image/") ? "image" : "video",
                  mimeType
                }
              ]
            });
            openRoute("/app");
            return;
          }
          setStatus("Only text, image, and video vault files can be queued directly into the workspace.", "err");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error), "err");
        }
      });
    });

    vaultListEl.querySelectorAll("[data-sync-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-sync-vault");
        if (!fullName) {
          return;
        }
        await attachEvidence({
          kind: "vault",
          label: fullName.split("/").pop() || fullName,
          ref: fullName,
          excerpt: "Open the hosted sync page to browse, edit, rename, or push this vault item."
        });
        openRoute("/bookmarkfs/sync");
      });
    });

    vaultListEl.querySelectorAll("[data-attach-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-attach-vault");
        const entry = vaultItems.find((item) => item.fullName === fullName);
        if (!entry) {
          return;
        }
        await attachEvidence({
          kind: "vault",
          label: entry.displayName || entry.fullName,
          ref: entry.fullName,
          excerpt: entry.dir ? `/${entry.dir}` : "vault root"
        });
      });
    });
  }

  function renderCache() {
    if (!cacheListEl) {
      return;
    }
    cacheListEl.innerHTML = cacheItems.length
      ? cacheItems
          .slice(0, 8)
          .map(
            (entry) => `
              <article class="afterdark-item">
                <div class="afterdark-item__copy">
                  <strong>${escapeHtml(entry.title || entry.slug || "Cached paste")}</strong>
                  <p>${escapeHtml(safeTextPreview(entry.content || ""))}</p>
                  <span>${escapeHtml(entry.visibility || "private")} · ${escapeHtml(formatRelativeSize((entry.content || "").length))}</span>
                </div>
                <div class="afterdark-item__actions">
                  <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-queue-cache="${escapeHtml(
                    entry.slug || entry.title || ""
                  )}">Queue</button>
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-attach-cache="${escapeHtml(
                    entry.slug || entry.title || ""
                  )}">Attach</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<p class="afterdark-empty">No cached hosted pastes yet.</p>`;

    cacheListEl.querySelectorAll("[data-queue-cache]").forEach((button) => {
      button.addEventListener("click", async () => {
        const key = button.getAttribute("data-queue-cache");
        const entry = cacheItems.find((item) => (item.slug || item.title || "") === key);
        if (!entry) {
          return;
        }
        await setPendingCompose({
          title: entry.title || entry.slug || "Cached paste",
          content: entry.content || "",
          visibility: entry.visibility || "private",
          language: entry.language || "none",
          folderName: entry.folderName || "",
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          pinned: Boolean(entry.pinned),
          favorite: Boolean(entry.favorite),
          attachments: Array.isArray(entry.files) ? entry.files : []
        });
        openRoute("/app");
      });
    });

    cacheListEl.querySelectorAll("[data-attach-cache]").forEach((button) => {
      button.addEventListener("click", async () => {
        const key = button.getAttribute("data-attach-cache");
        const entry = cacheItems.find((item) => (item.slug || item.title || "") === key);
        if (!entry) {
          return;
        }
        await attachEvidence({
          kind: "cache",
          label: entry.title || entry.slug || "Cached paste",
          ref: entry.slug || "",
          href: currentCreds.baseUrl && entry.slug ? joinUrl(currentCreds.baseUrl, `/p/${entry.slug}`) : "",
          excerpt: safeTextPreview(entry.content || "", 140)
        });
      });
    });
  }

  async function refreshAll() {
    setStatus("Refreshing Afterdark…");
    try {
      const [{ profiles, selectedProfileId }, launcherState, cacheResult, vaultResult, loadedCaseState] = await Promise.all([
        loadProfiles(),
        storageLocalGet([WOXBIN_STORAGE.afterdarkLauncherEnabled]),
        loadOfflineCacheEntries(),
        vaultRpc("vault.list"),
        loadDarkBinState()
      ]);

      currentProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0] || null;
      profileCount = profiles.length;
      currentCreds = await resolveProfileCredentials(currentProfile);
      cacheItems = cacheResult || [];
      vaultItems = Array.isArray(vaultResult?.entries) ? vaultResult.entries : [];
      caseState = loadedCaseState || { casefiles: [], selectedCaseId: null };
      await ensureCaseSelection();

      renderProfiles(profiles, currentProfile?.id || "");
      renderRoutes();
      renderCaseList();
      syncFormFromCasefile();
      renderTimeline();
      renderEvidence();
      renderCache();
      renderVault();

      if (launcherToggle) {
        launcherToggle.checked = Boolean(launcherState[WOXBIN_STORAGE.afterdarkLauncherEnabled]);
      }
      if (unlockWrap) {
        unlockWrap.hidden = !currentCreds.locked;
      }

      if (!currentCreds.locked && currentCreds.baseUrl && currentCreds.apiKey) {
        const apiFetch = await createApiFetch();
        const hosted = await apiFetch(`/api/v1/pastes?limit=${PAGE_SIZE}&offset=0`);
        hostedItems = Array.isArray(hosted?.pastes) ? hosted.pastes : [];
      } else {
        hostedItems = [];
      }
      renderHosted();
      renderStats();
      setStatus(
        currentProfile
          ? `Afterdark is connected to ${currentProfile.label}${currentCreds.locked ? " (locked profile)" : ""}.`
          : "Add a WOX-Bin profile in the companion view to unlock this surface.",
        "ok"
      );
    } catch (error) {
      hostedItems = [];
      renderHosted();
      renderStats();
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  }

  launcherToggle?.addEventListener("change", async () => {
    await storageLocalSet({ [WOXBIN_STORAGE.afterdarkLauncherEnabled]: launcherToggle.checked });
    setStatus(
      launcherToggle.checked ? "Afterdark launcher enabled for WOX-Bin pages." : "Afterdark launcher disabled.",
      "ok"
    );
  });

  rootEl.querySelector("#afterdark-open-app")?.addEventListener("click", () => openRoute("/app"));
  rootEl.querySelector("#afterdark-open-sync")?.addEventListener("click", () => openRoute("/bookmarkfs/sync"));
  rootEl.querySelector("#afterdark-open-companion")?.addEventListener("click", () => {
    if (EMBEDDED) {
      postParent({
        type: "woxbin-afterdark-close"
      });
      return;
    }
    window.open(chrome.runtime.getURL("dist/index.html"), "_blank");
  });
  rootEl.querySelector("#afterdark-open-detached")?.addEventListener("click", () => {
    if (EMBEDDED) {
      postParent({
        type: "woxbin-afterdark-detach"
      });
    } else {
      window.open(chrome.runtime.getURL("dist/afterdark.html"), "_blank");
    }
  });
  rootEl.querySelector("#afterdark-refresh-hosted")?.addEventListener("click", () => void refreshAll());
  rootEl.querySelector("#afterdark-refresh-vault")?.addEventListener("click", () => void refreshAll());

  rootEl.querySelector("#afterdark-unlock-btn")?.addEventListener("click", async () => {
    if (!currentProfile) {
      return;
    }
    const passphrase = String(unlockPassphrase?.value || "").trim();
    if (!passphrase) {
      setStatus("Enter the profile passphrase first.", "err");
      return;
    }
    const ok = await unlockProfile(currentProfile.id, passphrase);
    if (!ok) {
      setStatus("That passphrase did not unlock the selected profile.", "err");
      return;
    }
    if (unlockPassphrase) {
      unlockPassphrase.value = "";
    }
    await refreshAll();
  });

  rootEl.querySelector("#afterdark-publish")?.addEventListener("click", async () => {
    try {
      const apiFetch = await createApiFetch();
      const created = await apiFetch("/api/v1/pastes", {
        method: "POST",
        body: JSON.stringify({
          title: titleInput?.value?.trim() || "Untitled",
          content: bodyInput?.value || "",
          language: languageInput?.value || "none",
          visibility: visibilityInput?.value || "private",
          tags: [],
          pinned: false,
          favorite: false,
          files: []
        })
      });
      setStatus(`Published ${created?.slug || "paste"} from Afterdark.`, "ok");
      await refreshAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  rootEl.querySelector("#afterdark-queue")?.addEventListener("click", async () => {
    await setPendingCompose({
      title: titleInput?.value || "",
      content: bodyInput?.value || "",
      visibility: visibilityInput?.value || "private",
      language: languageInput?.value || "none"
    });
    openRoute("/app");
  });

  rootEl.querySelector("#afterdark-new-case")?.addEventListener("click", async () => {
    const saved = await saveDarkBinCasefile(createEmptyCasefile({ title: "New casefile" }));
    caseState = {
      casefiles: saved.casefiles,
      selectedCaseId: saved.selectedCaseId
    };
    currentCase = saved.casefile;
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
    renderEvidence();
  });

  rootEl.querySelector("#afterdark-import-case")?.addEventListener("click", () => {
    importFileEl?.click();
  });

  importFileEl?.addEventListener("change", async () => {
    const file = importFileEl.files?.[0];
    importFileEl.value = "";
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const imported = await importDarkBinExport(text);
      caseState = {
        casefiles: imported.casefiles,
        selectedCaseId: imported.selectedCaseId
      };
      await ensureCaseSelection();
      syncFormFromCasefile();
      renderStats();
      renderCaseList();
      renderTimeline();
      renderEvidence();
      setStatus(`Imported ${imported.importedCount} casefile(s) into Afterdark.`, "ok");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  rootEl.querySelector("#afterdark-export-cases")?.addEventListener("click", () => {
    buildDownload(
      `afterdark-casefiles-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
      serializeDarkBinExport(caseState.casefiles)
    );
  });

  rootEl.querySelector("#afterdark-export-case")?.addEventListener("click", () => {
    if (!currentCase) {
      return;
    }
    buildDownload(
      `${currentCase.title.replace(/[<>:\"/\\\\|?*]+/g, "-").slice(0, 80) || "afterdark-casefile"}.json`,
      serializeDarkBinExport([buildFormCasefile()])
    );
  });

  rootEl.querySelector("#afterdark-duplicate-case")?.addEventListener("click", async () => {
    if (!currentCase) {
      return;
    }
    const draft = buildFormCasefile();
    const duplicate = createEmptyCasefile({
      ...draft,
      id: undefined,
      title: `${draft.title} copy`
    });
    const saved = await saveDarkBinCasefile(duplicate);
    caseState = {
      casefiles: saved.casefiles,
      selectedCaseId: saved.selectedCaseId
    };
    currentCase = saved.casefile;
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
    renderEvidence();
  });

  rootEl.querySelector("#afterdark-save-case")?.addEventListener("click", async () => {
    const saved = await saveDarkBinCasefile(buildFormCasefile());
    caseState = {
      casefiles: saved.casefiles,
      selectedCaseId: saved.selectedCaseId
    };
    currentCase = saved.casefile;
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
    renderEvidence();
    setStatus(`Saved ${currentCase?.title || "casefile"}.`, "ok");
  });

  rootEl.querySelector("#afterdark-delete-case")?.addEventListener("click", async () => {
    if (!currentCase) {
      return;
    }
    if (!confirm(`Delete "${currentCase.title}" from Afterdark?`)) {
      return;
    }
    caseState = await deleteDarkBinCasefile(currentCase.id);
    await ensureCaseSelection();
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
    renderEvidence();
    setStatus("Casefile deleted.", "ok");
  });

  rootEl.querySelector("#afterdark-queue-case")?.addEventListener("click", async () => {
    try {
      const saved = await saveDarkBinCasefile(buildFormCasefile());
      caseState = {
        casefiles: saved.casefiles,
        selectedCaseId: saved.selectedCaseId
      };
      currentCase = saved.casefile;
      syncFormFromCasefile();
      renderStats();
      renderCaseList();
      renderTimeline();
      renderEvidence();
      await setPendingCompose(buildCasefileComposePayload(currentCase));
      openRoute("/app");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  rootEl.querySelector("#afterdark-add-event")?.addEventListener("click", async () => {
    const body = String(eventBodyEl?.value || "").trim();
    if (!body || !currentCase) {
      return;
    }
    const nextCase = {
      ...buildFormCasefile(),
      timeline: [
        {
          id: `event_${Date.now().toString(36)}`,
          body,
          createdAt: new Date().toISOString()
        },
        ...currentCase.timeline
      ].slice(0, 200)
    };
    const saved = await saveDarkBinCasefile(nextCase);
    caseState = {
      casefiles: saved.casefiles,
      selectedCaseId: saved.selectedCaseId
    };
    currentCase = saved.casefile;
    if (eventBodyEl) {
      eventBodyEl.value = "";
    }
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
  });

  searchCaseEl?.addEventListener("input", () => {
    caseSearchQuery = String(searchCaseEl.value || "").trim().toLowerCase();
    renderCaseList();
  });

  await refreshAll();
}
