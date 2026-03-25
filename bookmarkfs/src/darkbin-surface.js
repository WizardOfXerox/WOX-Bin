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
  getSelectedProfile,
  loadProfiles,
  normalizeBaseUrl,
  resolveProfileCredentials,
  setSelectedProfileId,
  unlockProfile
} from "./cloud/woxbin-profiles.js";
import { setPendingCompose } from "./vault/bridge.js";

const DEFAULT_ROUTE_LABELS = [
  ["/app", "Workspace"],
  ["/quick", "Quick paste"],
  ["/clipboard", "Clipboard"],
  ["/fragment", "Fragment"],
  ["/privacy-tools", "Privacy suite"],
  ["/bookmarkfs/sync", "Hosted sync"]
];

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

function safeTextPreview(text, limit = 160) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "(empty)";
  }
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized;
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseTagsInput(raw) {
  return String(raw || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function extensionPageUrl(page) {
  return chrome.runtime.getURL(`dist/${page}.html`);
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

function ensureModal() {
  let modal = document.getElementById("darkbin-modal");
  if (modal) {
    return modal;
  }
  modal = document.createElement("div");
  modal.id = "darkbin-modal";
  modal.className = "afterdark-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="afterdark-modal__backdrop" data-close="1"></div>
    <div class="afterdark-modal__card">
      <div class="afterdark-modal__head">
        <div>
          <p class="afterdark-modal__eyebrow">Dark-Bin preview</p>
          <h2 id="darkbin-modal-title">Entry preview</h2>
        </div>
        <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-close="1">Close</button>
      </div>
      <div class="afterdark-modal__body" id="darkbin-modal-body"></div>
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
  const titleEl = modal.querySelector("#darkbin-modal-title");
  const bodyEl = modal.querySelector("#darkbin-modal-body");
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (bodyEl) {
    bodyEl.innerHTML = bodyHtml;
  }
  modal.hidden = false;
}

export async function mountDarkBinSurface(rootEl) {
  if (!rootEl) {
    return;
  }

  rootEl.innerHTML = `
    <div class="darkbin-shell">
      <header class="darkbin-hero">
        <div class="darkbin-hero__copy">
          <p class="darkbin-hero__eyebrow">Extension-only private desk</p>
          <h1>Dark-Bin</h1>
          <p class="darkbin-hero__text">
            A local-first casefile board for incident notes, cached evidence pointers, and quick WOX-Bin handoff.
            This mode is private to the extension and built for trace reduction, not public indexing. Private does not mean anonymous.
          </p>
        </div>
        <div class="darkbin-hero__actions">
          <button type="button" class="afterdark-btn afterdark-btn--primary" id="darkbin-open-workspace">Open workspace</button>
          <button type="button" class="afterdark-btn afterdark-btn--secondary" id="darkbin-open-afterdark">Afterdark ↗</button>
          <button type="button" class="afterdark-btn afterdark-btn--ghost" id="darkbin-open-companion">Companion ↗</button>
        </div>
      </header>

      <section class="darkbin-stats" id="darkbin-stats"></section>

      <div class="darkbin-layout">
        <aside class="darkbin-sidebar">
          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Registry</p>
                <h2>Casefiles</h2>
              </div>
              <div class="darkbin-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" id="darkbin-new-case">New</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="darkbin-import-btn">Import</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="darkbin-export-all">Export all</button>
              </div>
            </div>
            <label class="darkbin-field">
              <span>Search cases</span>
              <input type="search" class="afterdark-input" id="darkbin-search" placeholder="Alias, title, tag…" />
            </label>
            <div class="darkbin-case-list" id="darkbin-case-list"></div>
            <input type="file" id="darkbin-import-file" accept="application/json" hidden />
          </section>

          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Profile</p>
                <h2>Hosted target</h2>
              </div>
            </div>
            <div class="darkbin-profile-list" id="darkbin-profile-list"></div>
            <div class="darkbin-unlock" id="darkbin-unlock-wrap" hidden>
              <label class="darkbin-field">
                <span>Profile passphrase</span>
                <input type="password" class="afterdark-input" id="darkbin-passphrase" placeholder="Unlock selected profile" />
              </label>
              <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" id="darkbin-unlock-btn">Unlock profile</button>
            </div>
            <p class="darkbin-hint" id="darkbin-profile-note"></p>
          </section>
        </aside>

        <main class="darkbin-main">
          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Editor</p>
                <h2 id="darkbin-editor-title">Casefile editor</h2>
              </div>
              <div class="darkbin-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" id="darkbin-duplicate">Duplicate</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" id="darkbin-export-case">Export JSON</button>
              </div>
            </div>

            <div class="darkbin-editor-grid">
              <label class="darkbin-field">
                <span>Case title</span>
                <input type="text" class="afterdark-input" id="darkbin-title" maxlength="180" />
              </label>
              <label class="darkbin-field">
                <span>Alias</span>
                <input type="text" class="afterdark-input" id="darkbin-alias" maxlength="120" placeholder="Handle or neutral codename" />
              </label>
            </div>

            <div class="darkbin-editor-grid darkbin-editor-grid--compact">
              <label class="darkbin-field">
                <span>Status</span>
                <select class="afterdark-input" id="darkbin-status">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="watch">Watch</option>
                  <option value="sealed">Sealed</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label class="darkbin-field">
                <span>Classification</span>
                <select class="afterdark-input" id="darkbin-classification">
                  <option value="private">Private</option>
                  <option value="sensitive">Sensitive</option>
                  <option value="sealed">Sealed</option>
                </select>
              </label>
              <label class="darkbin-field">
                <span>Retention</span>
                <select class="afterdark-input" id="darkbin-retention">
                  <option value="manual">Manual delete</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </label>
            </div>

            <label class="darkbin-field">
              <span>Tags</span>
              <input type="text" class="afterdark-input" id="darkbin-tags" placeholder="private, incident, follow-up" />
            </label>

            <label class="darkbin-field">
              <span>Summary</span>
              <textarea class="afterdark-textarea darkbin-textarea--summary" id="darkbin-summary" placeholder="High-level incident context, scope, and handling notes."></textarea>
            </label>

            <label class="darkbin-field">
              <span>Notes</span>
              <textarea class="afterdark-textarea darkbin-textarea--notes" id="darkbin-notes" placeholder="Local private notes. Avoid public identifiers unless you truly need them."></textarea>
            </label>

            <div class="darkbin-editor-footer">
              <div class="darkbin-meta" id="darkbin-meta"></div>
              <div class="darkbin-card__actions">
                <button type="button" class="afterdark-btn afterdark-btn--primary" id="darkbin-save">Save casefile</button>
                <button type="button" class="afterdark-btn afterdark-btn--secondary" id="darkbin-queue">Queue to workspace</button>
                <button type="button" class="afterdark-btn afterdark-btn--ghost" id="darkbin-delete">Delete</button>
              </div>
            </div>
          </section>

          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Timeline</p>
                <h2>Events</h2>
              </div>
            </div>
            <div class="darkbin-timeline-composer">
              <textarea class="afterdark-textarea darkbin-textarea--event" id="darkbin-event-body" placeholder="Add a local event note, handoff, or observation."></textarea>
              <button type="button" class="afterdark-btn afterdark-btn--secondary" id="darkbin-add-event">Add event</button>
            </div>
            <div class="darkbin-timeline" id="darkbin-timeline"></div>
          </section>
        </main>

        <aside class="darkbin-rail">
          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Actions</p>
                <h2>Route handoff</h2>
              </div>
            </div>
            <div class="darkbin-route-grid" id="darkbin-route-grid"></div>
          </section>

          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Evidence</p>
                <h2>Attached references</h2>
              </div>
            </div>
            <div class="darkbin-evidence-list" id="darkbin-evidence-list"></div>
          </section>

          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Sources</p>
                <h2>Offline cache</h2>
              </div>
            </div>
            <div class="darkbin-source-list" id="darkbin-cache-list"></div>
          </section>

          <section class="darkbin-card">
            <div class="darkbin-card__head">
              <div>
                <p class="darkbin-card__eyebrow">Sources</p>
                <h2>Local vault</h2>
              </div>
            </div>
            <div class="darkbin-source-list" id="darkbin-vault-list"></div>
          </section>
        </aside>
      </div>
    </div>
  `;

  const searchEl = rootEl.querySelector("#darkbin-search");
  const caseListEl = rootEl.querySelector("#darkbin-case-list");
  const profileListEl = rootEl.querySelector("#darkbin-profile-list");
  const profileNoteEl = rootEl.querySelector("#darkbin-profile-note");
  const unlockWrapEl = rootEl.querySelector("#darkbin-unlock-wrap");
  const passphraseEl = rootEl.querySelector("#darkbin-passphrase");
  const statsEl = rootEl.querySelector("#darkbin-stats");
  const routeGridEl = rootEl.querySelector("#darkbin-route-grid");
  const evidenceListEl = rootEl.querySelector("#darkbin-evidence-list");
  const cacheListEl = rootEl.querySelector("#darkbin-cache-list");
  const vaultListEl = rootEl.querySelector("#darkbin-vault-list");
  const timelineEl = rootEl.querySelector("#darkbin-timeline");
  const eventBodyEl = rootEl.querySelector("#darkbin-event-body");
  const metaEl = rootEl.querySelector("#darkbin-meta");
  const editorTitleEl = rootEl.querySelector("#darkbin-editor-title");
  const importFileEl = rootEl.querySelector("#darkbin-import-file");

  const formEls = {
    title: rootEl.querySelector("#darkbin-title"),
    alias: rootEl.querySelector("#darkbin-alias"),
    status: rootEl.querySelector("#darkbin-status"),
    classification: rootEl.querySelector("#darkbin-classification"),
    retention: rootEl.querySelector("#darkbin-retention"),
    tags: rootEl.querySelector("#darkbin-tags"),
    summary: rootEl.querySelector("#darkbin-summary"),
    notes: rootEl.querySelector("#darkbin-notes")
  };

  let profileState = await loadProfiles();
  let selectedProfile = await getSelectedProfile();
  let cacheEntries = await loadOfflineCacheEntries();
  let vaultEntries = [];
  let caseState = await loadDarkBinState();
  let currentCase = null;
  let searchQuery = "";

  async function refreshVaultEntries() {
    try {
      const data = await vaultRpc("vault.list");
      vaultEntries = Array.isArray(data?.entries) ? data.entries : [];
    } catch {
      vaultEntries = [];
    }
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

  function syncFormFromCasefile() {
    if (!currentCase) {
      return;
    }
    editorTitleEl.textContent = currentCase.title;
    formEls.title.value = currentCase.title;
    formEls.alias.value = currentCase.alias || "";
    formEls.status.value = currentCase.status;
    formEls.classification.value = currentCase.classification;
    formEls.retention.value = currentCase.retention;
    formEls.tags.value = currentCase.tags.join(", ");
    formEls.summary.value = currentCase.summary || "";
    formEls.notes.value = currentCase.notes || "";
    metaEl.textContent = `Created ${formatDate(currentCase.createdAt)} · Updated ${formatDate(currentCase.updatedAt)}`;
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

  function renderStats() {
    const stats = [
      [caseState.casefiles.length, "casefiles"],
      [countAllTimelineEntries(caseState.casefiles), "timeline entries"],
      [countAllEvidenceEntries(caseState.casefiles), "attached refs"],
      [vaultEntries.length + cacheEntries.length, "local sources"]
    ];
    statsEl.innerHTML = stats
      .map(
        ([value, label]) => `
          <article class="darkbin-stat">
            <strong>${escapeHtml(String(value))}</strong>
            <span>${escapeHtml(label)}</span>
          </article>
        `
      )
      .join("");
  }

  function renderCaseList() {
    const filtered = caseState.casefiles.filter((casefile) => {
      const haystack = `${casefile.title} ${casefile.alias} ${casefile.tags.join(" ")} ${casefile.summary}`.toLowerCase();
      return !searchQuery || haystack.includes(searchQuery);
    });

    if (!filtered.length) {
      caseListEl.innerHTML = `<p class="darkbin-empty">No casefiles match this search yet.</p>`;
      return;
    }

    caseListEl.innerHTML = filtered
      .map(
        (casefile) => `
          <button type="button" class="darkbin-case${casefile.id === currentCase?.id ? " is-active" : ""}" data-case-id="${escapeHtml(casefile.id)}">
            <div class="darkbin-case__head">
              <strong>${escapeHtml(casefile.title)}</strong>
              <span class="darkbin-pill darkbin-pill--${escapeHtml(casefile.status)}">${escapeHtml(casefile.status)}</span>
            </div>
            <p>${escapeHtml(casefile.alias || safeTextPreview(casefile.summary, 80))}</p>
            <div class="darkbin-case__meta">
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
        renderEvidence();
        renderTimeline();
      });
    });
  }

  async function renderProfiles() {
    profileState = await loadProfiles();
    selectedProfile = await getSelectedProfile();

    if (!profileState.profiles.length) {
      profileListEl.innerHTML = `<p class="darkbin-empty">No WOX-Bin profile saved yet. Use the companion to save one first.</p>`;
      profileNoteEl.textContent = "Dark-Bin can still work locally, but route handoff and hosted links need a saved profile.";
      unlockWrapEl.hidden = true;
      return;
    }

    const states = await Promise.all(
      profileState.profiles.map(async (profile) => {
        try {
          const creds = await resolveProfileCredentials(profile);
          return { profile, locked: !creds.apiKey };
        } catch {
          return { profile, locked: true };
        }
      })
    );

    profileListEl.innerHTML = states
      .map(
        ({ profile, locked }) => `
          <button type="button" class="darkbin-profile${profile.id === selectedProfile?.id ? " is-active" : ""}" data-profile-id="${escapeHtml(profile.id)}">
            <strong>${escapeHtml(profile.label)}</strong>
            <span>${escapeHtml(new URL(profile.baseUrl).hostname)}</span>
            <small>${locked ? "locked" : "ready"}</small>
          </button>
        `
      )
      .join("");

    profileListEl.querySelectorAll("[data-profile-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const nextId = button.getAttribute("data-profile-id");
        if (!nextId) {
          return;
        }
        await setSelectedProfileId(nextId);
        selectedProfile = await getSelectedProfile();
        await renderProfiles();
        renderRoutes();
      });
    });

    let locked = false;
    if (selectedProfile) {
      try {
        const creds = await resolveProfileCredentials(selectedProfile);
        locked = !creds.apiKey;
      } catch {
        locked = true;
      }
    }

    unlockWrapEl.hidden = !locked;
    profileNoteEl.textContent = selectedProfile
      ? `${selectedProfile.label} · ${selectedProfile.baseUrl} ${locked ? "· locked" : "· connected"}`
      : "Select a profile to enable route handoff.";
  }

  function renderRoutes() {
    const baseUrl = selectedProfile?.baseUrl || "";
    routeGridEl.innerHTML = DEFAULT_ROUTE_LABELS.map(
      ([path, label]) => `
        <button type="button" class="darkbin-route" data-route-path="${escapeHtml(path)}" ${baseUrl ? "" : "disabled"}>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(path)}</small>
        </button>
      `
    ).join("");

    routeGridEl.querySelectorAll("[data-route-path]").forEach((button) => {
      button.addEventListener("click", () => {
        const path = button.getAttribute("data-route-path") || "";
        if (!baseUrl || !path) {
          return;
        }
        window.open(joinUrl(baseUrl, path), "_blank", "noopener,noreferrer");
      });
    });
  }

  function renderTimeline() {
    if (!currentCase?.timeline?.length) {
      timelineEl.innerHTML = `<p class="darkbin-empty">No local events yet. Add a handoff note, observation, or scrub reminder.</p>`;
      return;
    }

    timelineEl.innerHTML = currentCase.timeline
      .map(
        (event) => `
          <article class="darkbin-event">
            <div class="darkbin-event__copy">
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

  async function attachEvidence(evidence) {
    if (!currentCase) {
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
  }

  function renderEvidence() {
    if (!currentCase?.evidence?.length) {
      evidenceListEl.innerHTML = `<p class="darkbin-empty">Attach local vault files, cached hosted pastes, or private links to the active casefile.</p>`;
      return;
    }

    evidenceListEl.innerHTML = currentCase.evidence
      .map(
        (item) => `
          <article class="darkbin-evidence">
            <div class="darkbin-evidence__copy">
              <div class="darkbin-evidence__meta">
                <span class="darkbin-pill darkbin-pill--muted">${escapeHtml(item.kind)}</span>
                <span>${escapeHtml(formatDate(item.addedAt))}</span>
              </div>
              <strong>${escapeHtml(item.label)}</strong>
              <p>${escapeHtml(item.excerpt || item.ref || item.href || "local reference")}</p>
            </div>
            <div class="darkbin-evidence__actions">
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
        if (item.kind === "cache" && item.ref && selectedProfile?.baseUrl) {
          window.open(joinUrl(selectedProfile.baseUrl, `/p/${encodeURIComponent(item.ref)}`), "_blank", "noopener,noreferrer");
          return;
        }
        if (item.kind === "vault" && item.ref) {
          try {
            const file = await vaultRpc("vault.read", { fullName: item.ref });
            if (file.previewKind === "text" && file.textContent != null) {
              openModal(file.displayName, `<pre class="darkbin-modal-pre">${escapeHtml(file.textContent)}</pre>`);
              return;
            }
            const mimeType = file.mimeType || "application/octet-stream";
            const dataUrl = `data:${mimeType};base64,${file.dataBase64}`;
            if (file.previewKind === "image") {
              openModal(file.displayName, `<img class="darkbin-modal-image" src="${dataUrl}" alt="${escapeHtml(file.displayName)}" />`);
              return;
            }
            if (file.previewKind === "video") {
              openModal(file.displayName, `<video class="darkbin-modal-video" src="${dataUrl}" controls autoplay></video>`);
              return;
            }
            window.open(dataUrl, "_blank", "noopener,noreferrer");
          } catch (error) {
            openModal("Vault preview failed", `<p class="darkbin-empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`);
          }
          return;
        }
        openModal(item.label, `<p class="darkbin-empty">${escapeHtml(item.excerpt || item.ref || item.href || "No preview available.")}</p>`);
      });
    });
  }

  function renderCache() {
    if (!cacheEntries.length) {
      cacheListEl.innerHTML = `<p class="darkbin-empty">No cached hosted pastes yet. Use the companion or Afterdark to cache one first.</p>`;
      return;
    }

    cacheListEl.innerHTML = cacheEntries
      .slice(0, 8)
      .map(
        (entry) => `
          <article class="darkbin-source">
            <div class="darkbin-source__copy">
              <strong>${escapeHtml(entry.title || entry.slug || "Cached paste")}</strong>
              <p>${escapeHtml(safeTextPreview(entry.content || "", 88))}</p>
            </div>
            <div class="darkbin-source__actions">
              <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-attach-cache="${escapeHtml(entry.slug || "")}">Attach</button>
            </div>
          </article>
        `
      )
      .join("");

    cacheListEl.querySelectorAll("[data-attach-cache]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.getAttribute("data-attach-cache");
        const entry = cacheEntries.find((item) => item.slug === slug);
        if (!entry) {
          return;
        }
        await attachEvidence({
          kind: "cache",
          label: entry.title || entry.slug || "Cached paste",
          ref: entry.slug || "",
          excerpt: safeTextPreview(entry.content || "", 140)
        });
      });
    });
  }

  function renderVault() {
    if (!vaultEntries.length) {
      vaultListEl.innerHTML = `<p class="darkbin-empty">No indexed local vault files yet.</p>`;
      return;
    }

    vaultListEl.innerHTML = vaultEntries
      .slice(0, 10)
      .map(
        (entry) => `
          <article class="darkbin-source">
            <div class="darkbin-source__copy">
              <strong>${escapeHtml(entry.displayName || entry.fullName)}</strong>
              <p>${escapeHtml(entry.dir ? `/${entry.dir}` : "vault root")}</p>
            </div>
            <div class="darkbin-source__actions">
              <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-attach-vault="${escapeHtml(entry.fullName)}">Attach</button>
            </div>
          </article>
        `
      )
      .join("");

    vaultListEl.querySelectorAll("[data-attach-vault]").forEach((button) => {
      button.addEventListener("click", async () => {
        const fullName = button.getAttribute("data-attach-vault");
        const entry = vaultEntries.find((item) => item.fullName === fullName);
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

  async function openWorkspaceRoute(path = "/app") {
    const profile = await getSelectedProfile();
    if (!profile?.baseUrl) {
      return;
    }
    window.open(joinUrl(profile.baseUrl, path), "_blank", "noopener,noreferrer");
  }

  async function saveCurrentCase() {
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
  }

  await refreshVaultEntries();
  await ensureCaseSelection();
  syncFormFromCasefile();
  renderStats();
  renderCaseList();
  await renderProfiles();
  renderRoutes();
  renderTimeline();
  renderEvidence();
  renderCache();
  renderVault();

  rootEl.querySelector("#darkbin-open-afterdark")?.addEventListener("click", () => {
    window.open(extensionPageUrl("afterdark"), "_blank");
  });
  rootEl.querySelector("#darkbin-open-companion")?.addEventListener("click", () => {
    window.open(extensionPageUrl("index"), "_blank");
  });
  rootEl.querySelector("#darkbin-open-workspace")?.addEventListener("click", async () => {
    await openWorkspaceRoute("/app");
  });

  rootEl.querySelector("#darkbin-new-case")?.addEventListener("click", async () => {
    const saved = await saveDarkBinCasefile(
      createEmptyCasefile({
        title: "New casefile"
      })
    );
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

  rootEl.querySelector("#darkbin-import-btn")?.addEventListener("click", () => {
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
      currentCase = caseState.casefiles.find((casefile) => casefile.id === caseState.selectedCaseId) || caseState.casefiles[0] || null;
      syncFormFromCasefile();
      renderStats();
      renderCaseList();
      renderTimeline();
      renderEvidence();
    } catch (error) {
      openModal("Import failed", `<p class="darkbin-empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`);
    }
  });

  rootEl.querySelector("#darkbin-export-all")?.addEventListener("click", async () => {
    buildDownload(
      `dark-bin-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
      serializeDarkBinExport(caseState.casefiles)
    );
  });

  rootEl.querySelector("#darkbin-export-case")?.addEventListener("click", () => {
    if (!currentCase) {
      return;
    }
    buildDownload(
      `${currentCase.title.replace(/[<>:"/\\|?*]+/g, "-").slice(0, 80) || "dark-bin-case"}.json`,
      serializeDarkBinExport([buildFormCasefile()])
    );
  });

  rootEl.querySelector("#darkbin-duplicate")?.addEventListener("click", async () => {
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

  rootEl.querySelector("#darkbin-save")?.addEventListener("click", async () => {
    await saveCurrentCase();
  });

  rootEl.querySelector("#darkbin-delete")?.addEventListener("click", async () => {
    if (!currentCase) {
      return;
    }
    if (!confirm(`Delete "${currentCase.title}" from Dark-Bin?`)) {
      return;
    }
    const nextState = await deleteDarkBinCasefile(currentCase.id);
    caseState = nextState;
    await ensureCaseSelection();
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
    renderEvidence();
  });

  rootEl.querySelector("#darkbin-queue")?.addEventListener("click", async () => {
    try {
      await saveCurrentCase();
      await setPendingCompose(buildCasefileComposePayload(currentCase));
      await openWorkspaceRoute("/app");
    } catch (error) {
      openModal("Queue failed", `<p class="darkbin-empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`);
    }
  });

  rootEl.querySelector("#darkbin-add-event")?.addEventListener("click", async () => {
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
    eventBodyEl.value = "";
    syncFormFromCasefile();
    renderStats();
    renderCaseList();
    renderTimeline();
  });

  searchEl?.addEventListener("input", () => {
    searchQuery = String(searchEl.value || "").trim().toLowerCase();
    renderCaseList();
  });

  rootEl.querySelector("#darkbin-unlock-btn")?.addEventListener("click", async () => {
    if (!selectedProfile?.id) {
      return;
    }
    const passphrase = String(passphraseEl?.value || "").trim();
    if (!passphrase) {
      return;
    }
    const ok = await unlockProfile(selectedProfile.id, passphrase);
    if (ok) {
      passphraseEl.value = "";
      await renderProfiles();
      renderRoutes();
      return;
    }
    openModal("Unlock failed", `<p class="darkbin-empty">That passphrase did not unlock the selected profile.</p>`);
  });
}
