import { loadOfflineCacheEntries } from "./cloud/offline-cache.js";
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
                ? "The extension is replacing the current WOX-Bin page shell with an extension-owned control surface while keeping your selected profile, local BookmarkFS vault, and cached hosted data connected."
                : "A separate extension-hosted control surface for your selected WOX-Bin profile, local BookmarkFS vault, cached pastes, and privacy routes. This page lives inside the extension, not the Vercel app."
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
  const hostedListEl = rootEl.querySelector("#afterdark-hosted-list");
  const vaultListEl = rootEl.querySelector("#afterdark-vault-list");
  const cacheListEl = rootEl.querySelector("#afterdark-cache-list");
  const launcherToggle = rootEl.querySelector("#afterdark-page-launcher");
  const unlockWrap = rootEl.querySelector("#afterdark-unlock-wrap");
  const unlockPassphrase = rootEl.querySelector("#afterdark-passphrase");

  const titleInput = rootEl.querySelector("#afterdark-title");
  const bodyInput = rootEl.querySelector("#afterdark-body");
  const visibilityInput = rootEl.querySelector("#afterdark-vis");
  const languageInput = rootEl.querySelector("#afterdark-lang");

  let currentProfile = null;
  let currentCreds = { baseUrl: "", apiKey: "", locked: true };
  let hostedItems = [];
  let vaultItems = [];
  let cacheItems = [];
  let profileCount = 0;

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
      setStatus("Select a profile first.", "err");
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

  function renderRoutes() {
    if (!routeGridEl) {
      return;
    }
    routeGridEl.innerHTML = DEFAULT_ROUTE_LABELS.map(
      ([path, label]) => `
        <button type="button" class="afterdark-route" data-route="${escapeHtml(path)}">
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
      ["Hosted recent", String(hostedItems.length)],
      ["Vault files", String(vaultItems.length)],
      ["Cached pastes", String(cacheItems.length)]
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
                  <button type="button" class="afterdark-btn afterdark-btn--ghost afterdark-btn--tiny" data-copy-slug="${escapeHtml(
                    item.slug || ""
                  )}">Queue</button>
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

    hostedListEl.querySelectorAll("[data-copy-slug]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slug = button.getAttribute("data-copy-slug");
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
              <article class="afterdark-item">
                <div class="afterdark-item__copy">
                  <strong>${escapeHtml(entry.displayName || entry.name || entry.fullName || "Vault file")}</strong>
                  <p>${escapeHtml(entry.dir || "vault root")}</p>
                  <span>${escapeHtml(entry.typeLabel || entry.mimeType || "file")} · ${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</span>
                </div>
                <div class="afterdark-item__actions">
                  <button type="button" class="afterdark-btn afterdark-btn--secondary afterdark-btn--tiny" data-preview-vault="${escapeHtml(
                    entry.fullName || entry.name || ""
                  )}">Preview</button>
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
              </article>
            `
          )
          .join("")
      : `<p class="afterdark-empty">No cached hosted pastes yet.</p>`;
  }

  async function refreshAll() {
    setStatus("Refreshing Afterdark…");
    try {
      const [{ profiles, selectedProfileId }, launcherState, cacheResult, vaultResult] = await Promise.all([
        loadProfiles(),
        storageLocalGet([WOXBIN_STORAGE.afterdarkLauncherEnabled]),
        loadOfflineCacheEntries(),
        vaultRpc("vault.list")
      ]);

      currentProfile = profiles.find((profile) => profile.id === selectedProfileId) || profiles[0] || null;
      profileCount = profiles.length;
      currentCreds = await resolveProfileCredentials(currentProfile);
      cacheItems = cacheResult || [];
      vaultItems = Array.isArray(vaultResult?.entries) ? vaultResult.entries : [];

      renderProfiles(profiles, currentProfile?.id || "");
      renderCache();
      renderVault();
      renderRoutes();

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

  await refreshAll();
}
