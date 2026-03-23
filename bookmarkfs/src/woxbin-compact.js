/**
 * Compact Wox-Bin panel — styled to match app/globals.css (dark “deep space” theme).
 * Default site URL: build-time __WOXBIN_DEFAULT_SITE_URL__ (see webpack.config.js).
 */

/* global __WOXBIN_DEFAULT_SITE_URL__ */

import { storageLocalGet, storageLocalSet } from "./storage/chrome-local.js";
import {
  WOXBIN_STORAGE,
  deleteProfile,
  forgetProfilePassphrase,
  getSelectedProfile,
  loadProfiles,
  normalizeBaseUrl,
  resolveProfileCredentials,
  saveProfile,
  setSelectedProfileId,
  unlockProfile
} from "./cloud/woxbin-profiles.js";
import {
  buildOfflineCacheAssets,
  loadOfflineCacheEntries,
  offlineAssetToBlob,
  pushOfflineCacheEntry,
  removeOfflineCacheEntry,
  sanitizeFilenamePart
} from "./cloud/offline-cache.js";
import { takePendingCompose } from "./vault/bridge.js";

const DEFAULT_SITE_URL =
  typeof __WOXBIN_DEFAULT_SITE_URL__ !== "undefined" && __WOXBIN_DEFAULT_SITE_URL__
    ? String(__WOXBIN_DEFAULT_SITE_URL__).trim()
    : "";

const PAGE_SIZE = 30;
const RECENT_SLUGS_MAX = 20;
const DRAFT_DEBOUNCE_MS = 450;
const SEARCH_DEBOUNCE_MS = 320;

const WOXBIN_LANGUAGES = [
  ["none", "Plain text"],
  ["markdown", "Markdown"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["python", "Python"],
  ["bash", "Bash"],
  ["json", "JSON"]
];

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function joinUrl(base, path) {
  const b = normalizeBaseUrl(base);
  if (!b) return "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function defaultUrlForInput() {
  const n = normalizeBaseUrl(DEFAULT_SITE_URL);
  return n || DEFAULT_SITE_URL;
}

function formatApiError(status, json, text) {
  const errStr = typeof json?.error === "string" ? json.error : "";
  const base = errStr || (text && text.length < 400 ? text : "") || `HTTP ${status}`;
  if (status === 401) {
    return "Invalid or missing API key — open the site, Workspace → API keys, and paste a current key.";
  }
  if (status === 429) {
    return "Rate limited. Wait a short time and try again.";
  }
  if (status === 403 && json && typeof json === "object") {
    const code = json.code;
    const plan = json.plan ? ` (${json.plan})` : "";
    if (code === "hosted_pastes") {
      return `Hosted paste limit reached${plan}. Delete old pastes or upgrade.`;
    }
    if (code === "storage") {
      return `Hosted storage is full${plan}. Remove pastes or attachments, or upgrade.`;
    }
    if (code === "paste_size") {
      return `Paste or attachment is too large for your plan${plan}.`;
    }
    if (code === "files_per_paste") {
      const lim = json.limit != null ? ` (max ${json.limit})` : "";
      return `Too many attachments for your plan${plan}${lim}.`;
    }
    if (code === "api_keys") {
      return `API key limit reached${plan}. Revoke an old key in the workspace.`;
    }
    return `${base}${plan}`;
  }
  return base;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error || new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

async function fileToAttachment(file) {
  const mime = (file.type || "").split(";")[0].trim() || "application/octet-stream";
  const name = file.name || "file";
  if (mime.startsWith("image/")) {
    const dataUrl = await readFileAsDataURL(file);
    const i = dataUrl.indexOf(",");
    const base64 = i >= 0 ? dataUrl.slice(i + 1) : "";
    return { filename: name, content: base64, language: "none", mediaKind: "image", mimeType: mime };
  }
  if (mime.startsWith("video/")) {
    const dataUrl = await readFileAsDataURL(file);
    const j = dataUrl.indexOf(",");
    const base64 = j >= 0 ? dataUrl.slice(j + 1) : "";
    return { filename: name, content: base64, language: "none", mediaKind: "video", mimeType: mime };
  }
  const textLike =
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    mime === "application/xml" ||
    ((!mime || mime === "application/octet-stream") &&
      /\.(txt|md|json|js|ts|mjs|cjs|css|html|htm|xml|yml|yaml|sh|env|gitignore|csv|log)$/i.test(name));
  if (textLike) {
    const text = await file.text();
    return { filename: name, content: text, language: "none" };
  }
  throw new Error(`Unsupported attachment type: ${name}. Use text, code, or image/video files.`);
}

function serializeFilesForApi(list) {
  return list.map((f) => {
    const o = {
      filename: f.filename,
      content: f.content,
      language: f.language || "none"
    };
    if (f.mediaKind === "image" || f.mediaKind === "video") {
      o.mediaKind = f.mediaKind;
      o.mimeType = f.mimeType || "";
    }
    return o;
  });
}

function detectExtensionViewMode() {
  return new Promise((resolve) => {
    const fallback = () => resolve(window.innerWidth <= 560 ? "popup" : "options");
    try {
      if (!chrome?.tabs?.getCurrent) {
        fallback();
        return;
      }
      chrome.tabs.getCurrent((tab) => {
        if (chrome.runtime?.lastError) {
          fallback();
          return;
        }
        resolve(tab ? "options" : "popup");
      });
    } catch {
      fallback();
    }
  });
}

export async function mountWoxBinCompact(rootEl) {
  if (!rootEl) return;

  rootEl.innerHTML = "";
  const viewMode = await detectExtensionViewMode();
  rootEl.classList.add(`wb-view-${viewMode}`);
  document.body.classList.toggle("ext-popup-view", viewMode === "popup");
  document.body.classList.toggle("ext-options-view", viewMode === "options");

  const langOpts = WOXBIN_LANGUAGES.map(
    ([v, l]) => `<option value="${v}">${l}</option>`
  ).join("");

  const main = document.createElement("div");
  main.className = `wb-root wb-root--${viewMode}`;
  main.innerHTML = `
    <div class="wb-onboard" id="wb-onboard" hidden>
      <div class="wb-onboard__inner">
        <strong>WOX-Bin companion</strong>
        <p class="wb-hint" style="margin:6px 0 0">Save multiple site profiles, manage API keys, cache cloud pastes locally, and use <span class="wb-font-mono">Ctrl+Enter</span> to publish.</p>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-onboard-dismiss">Dismiss</button>
      </div>
    </div>

    <section class="wb-panel wb-panel--profiles">
      <h2>Profiles</h2>
      <p class="wb-lead">WOX-Bin cloud is the primary mode. Save one or more hosted profiles, optionally encrypt stored keys with a passphrase, and switch between deployments without retyping everything.</p>
      <div class="wb-field">
        <label for="wb-profile-select"><span>Saved profile</span></label>
        <div class="wb-inline-row">
          <select id="wb-profile-select" class="wb-select"></select>
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-profile-new">New</button>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-profile-delete">Delete</button>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-profile-lock">Forget passphrase</button>
        </div>
      </div>
      <div class="wb-field">
        <label for="wb-profile-label"><span>Profile label</span></label>
        <input type="text" id="wb-profile-label" class="wb-input" maxlength="64" placeholder="Production, staging, local…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="wb-field">
        <label for="wb-base-url"><span>Site URL</span></label>
        <input type="url" id="wb-base-url" class="wb-input wb-font-mono" placeholder="https://….vercel.app" list="wb-url-presets" autocomplete="off" spellcheck="false" />
        <datalist id="wb-url-presets"></datalist>
      </div>
      <div class="wb-field wb-presets-row">
        <span class="wb-muted">Presets</span>
        <div class="wb-btns" style="margin:0;flex-wrap:wrap">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-preset-add" title="Save current URL as preset">Save URL preset</button>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-preset-clear" title="Remove all presets">Clear presets</button>
        </div>
      </div>
      <ol class="wb-steps">
        <li>Copy your API key when it is shown (one time only).</li>
        <li>Paste <strong>URL</strong> + <strong>key</strong> below, then <strong>Save profile</strong>.</li>
      </ol>
      <div class="wb-field">
        <label for="wb-api-key">
          <span>API key</span>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-toggle-key" aria-pressed="false">Show</button>
        </label>
        <input type="password" id="wb-api-key" class="wb-input wb-font-mono" placeholder="Paste secret key" autocomplete="off" spellcheck="false" />
      </div>
      <div class="wb-field">
        <label for="wb-profile-passphrase"><span>Profile passphrase (optional)</span></label>
        <input type="password" id="wb-profile-passphrase" class="wb-input wb-font-mono" placeholder="Encrypt this stored API key on this device" autocomplete="new-password" spellcheck="false" />
      </div>
      <div class="wb-btns">
        <button type="button" class="wb-btn wb-btn-primary" id="wb-save-creds">Save profile</button>
        <button type="button" class="wb-btn wb-btn-secondary" id="wb-unlock-profile">Unlock profile</button>
      </div>
      <p class="wb-hint">Profiles live in <span class="wb-font-mono">chrome.storage.local</span> on this device. Hosted sites must use <strong>https://</strong>; plain <strong>http://</strong> is limited to localhost for development.</p>
      <p class="wb-connected" id="wb-connected" aria-live="polite"></p>
    </section>

    <section class="wb-panel wb-panel--keys">
      <h2>API keys</h2>
      <p class="wb-lead">Create, inspect, and revoke API keys from the extension. This uses the current bearer key, so treat the active profile as a credential manager.</p>
      <div class="wb-field">
        <label for="wb-new-key-label"><span>New key label</span></label>
        <div class="wb-inline-row">
          <input type="text" id="wb-new-key-label" class="wb-input" maxlength="64" placeholder="Extension, CLI, staging bot…" autocomplete="off" spellcheck="false" />
          <button type="button" class="wb-btn wb-btn-secondary" id="wb-create-key">Create key</button>
        </div>
      </div>
      <div id="wb-key-list" class="wb-stack-list"></div>
    </section>

    <section class="wb-panel wb-panel--library">
      <h2>Library</h2>
      <div class="wb-field wb-search-row">
        <label for="wb-search">Search</label>
        <input type="search" id="wb-search" class="wb-input wb-font-mono" placeholder="Title or slug…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="wb-list-head">
        <div class="wb-btns" style="margin:0">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-refresh">Refresh</button>
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-open-workspace">Workspace ↗</button>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-open-app">Open site ↗</button>
        </div>
        <span class="wb-list-meta" id="wb-list-meta"></span>
      </div>
      <div id="wb-list-wrap"></div>
      <div class="wb-loadmore-wrap">
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-load-more" disabled>Load more</button>
      </div>
      <div class="wb-cache-wrap">
        <div class="wb-list-head">
          <strong class="wb-muted">Offline cache</strong>
          <span class="wb-list-meta" id="wb-cache-meta"></span>
        </div>
        <div id="wb-cache-list" class="wb-stack-list"></div>
      </div>
    </section>

    <section class="wb-panel wb-panel--composer">
      <h2>Composer</h2>
      <div class="wb-edit-bar" id="wb-edit-bar" hidden>
        <span class="wb-edit-badge" id="wb-edit-badge"></span>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-cancel-edit">Cancel edit</button>
      </div>
      <div class="wb-recent-row" id="wb-recent-row" hidden>
        <span class="wb-muted">Recent</span>
        <div class="wb-recent-btns" id="wb-recent-btns"></div>
      </div>
      <div class="wb-field">
        <label for="wb-title">Title</label>
        <input type="text" id="wb-title" class="wb-input" maxlength="500" placeholder="Note title" />
      </div>
      <div class="wb-row2">
        <div class="wb-field" style="margin:0">
          <label for="wb-vis">Visibility</label>
          <select id="wb-vis" class="wb-select">
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div class="wb-field" style="margin:0">
          <label for="wb-lang">Syntax</label>
          <select id="wb-lang" class="wb-select">${langOpts}</select>
        </div>
      </div>
      <div class="wb-row2">
        <div class="wb-field" style="margin:0">
          <label for="wb-folder"><span>Folder</span></label>
          <div class="wb-inline-row">
            <select id="wb-folder" class="wb-select">
              <option value="">No folder</option>
            </select>
            <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-folder-create">New folder</button>
          </div>
        </div>
        <div class="wb-field" style="margin:0">
          <label for="wb-tags">Tags</label>
          <input type="text" id="wb-tags" class="wb-input" maxlength="240" placeholder="comma, separated, tags" />
        </div>
      </div>
      <div class="wb-inline-checks">
        <label><input type="checkbox" id="wb-pinned" /> Pin paste</label>
        <label><input type="checkbox" id="wb-favorite" /> Favorite</label>
        <label><input type="checkbox" id="wb-mirror-local" /> Mirror to local vault after publish</label>
      </div>
      <div class="wb-field">
        <label for="wb-content">Body <span class="wb-muted">(Ctrl+Enter · Esc clears status)</span></label>
        <textarea id="wb-content" class="wb-textarea wb-font-mono" placeholder="Write or paste content…"></textarea>
      </div>
      <div class="wb-field" id="wb-attach-field">
        <label>Attachments <span class="wb-muted">(optional · text/code or images)</span></label>
        <div class="wb-attach-toolbar">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-attach-pick">Add files…</button>
          <input type="file" id="wb-attach-input" multiple style="display:none" accept="text/*,.md,.json,.js,.ts,.mjs,.cjs,.css,.html,.htm,.xml,.yml,.yaml,image/*,video/mp4,video/webm" />
        </div>
        <ul class="wb-attach-list" id="wb-attach-list"></ul>
      </div>
      <div class="wb-btns">
        <button type="button" class="wb-btn wb-btn-primary" id="wb-create">Publish paste</button>
        <button type="button" class="wb-btn wb-btn-secondary" id="wb-clear-composer">Clear</button>
      </div>
    </section>

    <div class="wb-status" id="wb-status" role="status"></div>
  `;

  rootEl.appendChild(main);

  const $ = (id) => rootEl.querySelector(`#${id}`);

  const statusEl = $("wb-status");
  const listWrap = $("wb-list-wrap");
  const listMeta = $("wb-list-meta");
  const loadMoreBtn = $("wb-load-more");
  const searchInput = $("wb-search");
  const connectedEl = $("wb-connected");
  const datalistEl = $("wb-url-presets");
  const profileSelect = $("wb-profile-select");
  const profileLabelInput = $("wb-profile-label");
  const baseUrlInput = $("wb-base-url");
  const apiKeyInput = $("wb-api-key");
  const passphraseInput = $("wb-profile-passphrase");
  const btnUnlockProfile = $("wb-unlock-profile");
  const btnDeleteProfile = $("wb-profile-delete");
  const btnForgetProfile = $("wb-profile-lock");
  const btnNewProfile = $("wb-profile-new");
  const keyList = $("wb-key-list");
  const newKeyLabelInput = $("wb-new-key-label");
  const cacheMeta = $("wb-cache-meta");
  const cacheList = $("wb-cache-list");
  const folderSelect = $("wb-folder");
  const tagsInput = $("wb-tags");
  const pinnedInput = $("wb-pinned");
  const favoriteInput = $("wb-favorite");
  const mirrorLocalInput = $("wb-mirror-local");
  const clearComposerBtn = $("wb-clear-composer");
  const openWorkspaceBtn = $("wb-open-workspace");
  const createFolderBtn = $("wb-folder-create");
  const onboardEl = $("wb-onboard");
  const editBar = $("wb-edit-bar");
  const editBadge = $("wb-edit-badge");
  const btnCancelEdit = $("wb-cancel-edit");
  const btnCreate = $("wb-create");
  const attachInput = $("wb-attach-input");
  const attachPick = $("wb-attach-pick");
  const attachList = $("wb-attach-list");

  let listOffset = 0;
  let listTotal = 0;
  let listLoading = false;
  let editingSlug = null;
  let currentKeyId = null;
  let currentProfile = null;
  let currentPlan = "free";
  /** @type {Array<{ filename: string; content: string; language: string; mediaKind?: string; mimeType?: string }>} */
  let composerAttachments = [];

  function updateEditChrome() {
    const isEditing = Boolean(editingSlug);
    editBar.toggleAttribute("hidden", !isEditing);
    if (isEditing) {
      editBadge.textContent = `Editing · ${editingSlug}`;
      btnCreate.textContent = "Save changes";
    } else {
      editBadge.textContent = "";
      btnCreate.textContent = "Publish paste";
    }
  }

  function renderAttachList() {
    attachList.innerHTML = "";
    composerAttachments.forEach((f, idx) => {
      const li = document.createElement("li");
      li.className = "wb-attach-item";
      const tag = f.mediaKind === "image" ? "Image" : f.mediaKind === "video" ? "Video" : "Text";
      const nameSpan = document.createElement("span");
      nameSpan.className = "wb-attach-name";
      nameSpan.textContent = f.filename;
      const tagSpan = document.createElement("span");
      tagSpan.className = "wb-attach-tag";
      tagSpan.textContent = tag;
      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "wb-btn wb-btn-ghost wb-btn-tiny";
      rm.textContent = "Remove";
      rm.addEventListener("click", () => {
        composerAttachments = composerAttachments.filter((_, i) => i !== idx);
        renderAttachList();
      });
      li.appendChild(rm);
      attachList.appendChild(li);
    });
  }

  function clearEditMode() {
    editingSlug = null;
    composerAttachments = [];
    updateEditChrome();
    renderAttachList();
  }

  attachPick.addEventListener("click", () => attachInput.click());
  attachInput.addEventListener("change", async () => {
    const files = Array.from(attachInput.files || []);
    attachInput.value = "";
    for (const file of files) {
      try {
        composerAttachments.push(await fileToAttachment(file));
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), "err");
      }
    }
    renderAttachList();
  });

  btnCancelEdit.addEventListener("click", () => {
    $("wb-title").value = "";
    $("wb-content").value = "";
    clearEditMode();
    setStatus("Cancelled.", "ok");
  });

  updateEditChrome();
  renderAttachList();

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.classList.remove("err", "ok");
    if (kind === "err") statusEl.classList.add("err");
    if (kind === "ok") statusEl.classList.add("ok");
  }

  const keyInput = $("wb-api-key");
  $("wb-toggle-key").addEventListener("click", () => {
    const isPwd = keyInput.type === "password";
    keyInput.type = isPwd ? "text" : "password";
    $("wb-toggle-key").textContent = isPwd ? "Hide" : "Show";
    $("wb-toggle-key").setAttribute("aria-pressed", isPwd ? "true" : "false");
  });

  async function loadUrlPresetsIntoDatalist() {
    const data = await storageLocalGet([WOXBIN_STORAGE.urlPresets]);
    let presets = [];
    try {
      const raw = data[WOXBIN_STORAGE.urlPresets];
      presets = Array.isArray(raw) ? raw.map((u) => normalizeBaseUrl(u)).filter(Boolean) : [];
    } catch {
      presets = [];
    }
    datalistEl.innerHTML = presets.map((u) => `<option value="${escapeAttr(u)}"></option>`).join("");
  }

  async function getUrlPresets() {
    const data = await storageLocalGet([WOXBIN_STORAGE.urlPresets]);
    const raw = data[WOXBIN_STORAGE.urlPresets];
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map((u) => normalizeBaseUrl(u)).filter(Boolean))];
  }

  async function saveUrlPresets(urls) {
    await storageLocalSet({ [WOXBIN_STORAGE.urlPresets]: urls.slice(0, 12) });
    await loadUrlPresetsIntoDatalist();
  }

  $("wb-preset-add").addEventListener("click", async () => {
    const u = normalizeBaseUrl($("wb-base-url").value);
    if (!u) {
      setStatus("Enter a valid URL before saving a preset.", "err");
      return;
    }
    const cur = await getUrlPresets();
    if (!cur.includes(u)) cur.unshift(u);
    await saveUrlPresets(cur);
    setStatus("URL preset saved.", "ok");
  });

  $("wb-preset-clear").addEventListener("click", async () => {
    await storageLocalSet({ [WOXBIN_STORAGE.urlPresets]: [] });
    await loadUrlPresetsIntoDatalist();
    setStatus("Presets cleared.", "ok");
  });

  async function renderProfileOptions(selectedId = null) {
    const state = await loadProfiles();
    const effectiveSelected = selectedId || state.selectedProfileId || "";
    profileSelect.innerHTML = "";
    const createOption = document.createElement("option");
    createOption.value = "";
    createOption.textContent = state.profiles.length ? "New profile…" : "Create your first profile…";
    profileSelect.appendChild(createOption);
    state.profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.label} · ${new URL(profile.baseUrl).hostname}`;
      profileSelect.appendChild(option);
    });
    profileSelect.value = effectiveSelected;
    return state;
  }

  async function syncProfileForm(profileId = null) {
    const state = await renderProfileOptions(profileId);
    const activeProfile =
      state.profiles.find((profile) => profile.id === (profileId || state.selectedProfileId || "")) || null;
    currentProfile = activeProfile;
    profileLabelInput.value = activeProfile?.label || "";
    baseUrlInput.value = activeProfile?.baseUrl || defaultUrlForInput();
    passphraseInput.value = "";
    if (!activeProfile) {
      apiKeyInput.value = "";
      apiKeyInput.placeholder = "Paste secret key";
      currentKeyId = null;
      return;
    }

    const creds = await resolveProfileCredentials(activeProfile);
    apiKeyInput.value = creds.locked ? "" : creds.apiKey;
    apiKeyInput.placeholder = creds.locked ? "Locked profile — enter passphrase and unlock" : "Paste secret key";
  }

  async function getCreds() {
    currentProfile = currentProfile || (await getSelectedProfile());
    if (!currentProfile) {
      throw new Error("Create and save a profile first.");
    }
    const passphrase = passphraseInput.value.trim();
    const resolved = await resolveProfileCredentials(currentProfile, passphrase);
    if (resolved.locked) {
      throw new Error("Profile is locked. Enter the passphrase and unlock it first.");
    }
    if (passphrase) {
      passphraseInput.value = "";
    }
    return resolved;
  }

  async function loadComposerDraft() {
    const data = await storageLocalGet([WOXBIN_STORAGE.draft]);
    const d = data[WOXBIN_STORAGE.draft];
    if (!d || typeof d !== "object") return;
    if (d.title != null) $("wb-title").value = String(d.title);
    if (d.content != null) $("wb-content").value = String(d.content);
    if (d.visibility && $("wb-vis").querySelector(`option[value="${escapeAttr(d.visibility)}"]`)) {
      $("wb-vis").value = d.visibility;
    }
    if (d.language && $("wb-lang").querySelector(`option[value="${escapeAttr(d.language)}"]`)) {
      $("wb-lang").value = d.language;
    }
    if (typeof d.folderName === "string") {
      folderSelect.value = d.folderName;
    }
    if (Array.isArray(d.tags)) {
      tagsInput.value = d.tags.join(", ");
    }
    pinnedInput.checked = Boolean(d.pinned);
    favoriteInput.checked = Boolean(d.favorite);
    mirrorLocalInput.checked = Boolean(d.mirrorLocal);
  }

  const persistDraft = debounce(async () => {
    await storageLocalSet({
      [WOXBIN_STORAGE.draft]: {
        title: $("wb-title").value,
        content: $("wb-content").value,
        visibility: $("wb-vis").value,
        language: $("wb-lang").value,
        folderName: folderSelect.value || "",
        tags: tagsInput.value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 50),
        pinned: pinnedInput.checked,
        favorite: favoriteInput.checked,
        mirrorLocal: mirrorLocalInput.checked,
        updatedAt: Date.now()
      }
    });
  }, DRAFT_DEBOUNCE_MS);

  ["wb-title", "wb-content", "wb-vis", "wb-lang", "wb-folder", "wb-tags", "wb-pinned", "wb-favorite", "wb-mirror-local"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", () => persistDraft());
    el.addEventListener("change", () => persistDraft());
  });

  $("wb-save-creds").addEventListener("click", async () => {
    try {
      const profile = await saveProfile({
        profileId: profileSelect.value || null,
        label: profileLabelInput.value,
        baseUrl: baseUrlInput.value,
        apiKey: apiKeyInput.value,
        passphrase: passphraseInput.value.trim()
      });
      currentProfile = profile;
      const presets = await getUrlPresets();
      if (!presets.includes(profile.baseUrl)) {
        presets.unshift(profile.baseUrl);
        await saveUrlPresets(presets);
      }
      await syncProfileForm(profile.id);
      setStatus("Profile saved. Loading library…", "ok");
      await Promise.all([refreshList(), fetchMe(), loadFolders(), renderApiKeys(), renderOfflineCache()]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  profileSelect.addEventListener("change", async () => {
    const nextId = profileSelect.value || null;
    await setSelectedProfileId(nextId);
    await syncProfileForm(nextId);
    listWrap.innerHTML = "";
    keyList.innerHTML = "";
    connectedEl.textContent = "";
    if (nextId) {
      await Promise.allSettled([refreshList(), fetchMe(), loadFolders(), renderApiKeys(), renderOfflineCache()]);
    } else {
      folderSelect.innerHTML = `<option value="">No folder</option>`;
      await renderOfflineCache();
    }
  });

  btnNewProfile.addEventListener("click", async () => {
    await setSelectedProfileId(null);
    currentProfile = null;
    await syncProfileForm(null);
    listWrap.innerHTML = "";
    keyList.innerHTML = "";
    connectedEl.textContent = "";
    folderSelect.innerHTML = `<option value="">No folder</option>`;
    setStatus("Creating a new profile.", "ok");
  });

  btnDeleteProfile.addEventListener("click", async () => {
    const id = profileSelect.value || currentProfile?.id || "";
    if (!id) {
      setStatus("Select a profile first.", "err");
      return;
    }
    if (!confirm("Delete this saved profile from the extension?")) {
      return;
    }
    const state = await deleteProfile(id);
    currentProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId) || null;
    await syncProfileForm(state.selectedProfileId || null);
    listWrap.innerHTML = "";
    keyList.innerHTML = "";
    connectedEl.textContent = "";
    if (!currentProfile) {
      folderSelect.innerHTML = `<option value="">No folder</option>`;
    }
    await Promise.allSettled([renderOfflineCache(), currentProfile ? refreshList() : Promise.resolve(), currentProfile ? fetchMe() : Promise.resolve(), currentProfile ? loadFolders() : Promise.resolve(), currentProfile ? renderApiKeys() : Promise.resolve()]);
    setStatus("Profile deleted.", "ok");
  });

  btnForgetProfile.addEventListener("click", () => {
    const id = profileSelect.value || currentProfile?.id || "";
    if (!id) {
      setStatus("No encrypted profile is selected.", "err");
      return;
    }
    forgetProfilePassphrase(id);
    passphraseInput.value = "";
    apiKeyInput.value = "";
    apiKeyInput.placeholder = "Locked profile — enter passphrase and unlock";
    setStatus("Cached passphrase cleared for this profile.", "ok");
  });

  btnUnlockProfile.addEventListener("click", async () => {
    const id = profileSelect.value || currentProfile?.id || "";
    if (!id) {
      setStatus("Select a profile first.", "err");
      return;
    }
    const passphrase = passphraseInput.value.trim();
    if (!passphrase) {
      setStatus("Enter the profile passphrase first.", "err");
      return;
    }
    const unlocked = await unlockProfile(id, passphrase);
    if (!unlocked) {
      setStatus("Passphrase did not unlock this profile.", "err");
      return;
    }
    await syncProfileForm(id);
    setStatus("Profile unlocked.", "ok");
    await Promise.allSettled([refreshList(), fetchMe(), loadFolders(), renderApiKeys(), renderOfflineCache()]);
  });

  async function apiFetch(path, init) {
    const { baseUrl, apiKey } = await getCreds();
    if (!baseUrl || !apiKey) {
      throw new Error("Save site URL and API key in Setup first.");
    }
    const url = joinUrl(baseUrl, path);
    const headers = {
      Accept: "application/json",
      ...(init?.headers || {})
    };
    if (init?.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      throw new Error(formatApiError(res.status, json, text));
    }
    return json;
  }

  async function fetchMe() {
    connectedEl.textContent = "";
    try {
      const { baseUrl } = await getCreds();
      const data = await apiFetch("/api/v1/me");
      const u = data?.user;
      if (!u) return;
      currentPlan = u.plan || "free";
      const label = u.displayName || u.username || u.id || "Account";
      const handle = u.username ? `@${u.username}` : "";
      const profileLabel = currentProfile?.label ? ` via ${currentProfile.label}` : "";
      connectedEl.textContent = handle
        ? `Connected as ${label} (${handle}) · ${currentPlan} plan · ${baseUrl}${profileLabel}`
        : `Connected as ${label} · ${currentPlan} plan · ${baseUrl}${profileLabel}`;
    } catch (error) {
      connectedEl.textContent = "";
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  }

  async function pushRecentSlug(slug) {
    if (!slug) return;
    const data = await storageLocalGet([WOXBIN_STORAGE.recentSlugs]);
    let cur = Array.isArray(data[WOXBIN_STORAGE.recentSlugs]) ? data[WOXBIN_STORAGE.recentSlugs] : [];
    cur = [slug, ...cur.filter((s) => s !== slug)].slice(0, RECENT_SLUGS_MAX);
    await storageLocalSet({ [WOXBIN_STORAGE.recentSlugs]: cur });
    await renderRecentSlugs();
  }

  async function renderRecentSlugs() {
    const row = $("wb-recent-row");
    const box = $("wb-recent-btns");
    if (!row || !box) return;
    const data = await storageLocalGet([WOXBIN_STORAGE.recentSlugs]);
    const slugs = Array.isArray(data[WOXBIN_STORAGE.recentSlugs])
      ? data[WOXBIN_STORAGE.recentSlugs].filter(Boolean)
      : [];
    box.innerHTML = "";
    let baseUrl = "";
    try {
      baseUrl = (await getCreds()).baseUrl;
    } catch {
      baseUrl = "";
    }
    if (!baseUrl || !slugs.length) {
      row.hidden = true;
      return;
    }
    row.hidden = false;
    for (const s of slugs.slice(0, 10)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "wb-btn wb-btn-ghost wb-btn-tiny";
      b.textContent = s.length > 28 ? `${s.slice(0, 28)}…` : s;
      b.title = s;
      b.addEventListener("click", () => {
        window.open(joinUrl(baseUrl, `/p/${encodeURIComponent(s)}`), "_blank", "noopener,noreferrer");
      });
      box.appendChild(b);
    }
  }

  function applyComposerStateFromPaste(body, { duplicate = false } = {}) {
    editingSlug = duplicate ? null : body.slug || null;
    $("wb-title").value = body.title || "";
    $("wb-content").value = body.content || "";
    if (body.visibility && $("wb-vis").querySelector(`option[value="${escapeAttr(body.visibility)}"]`)) {
      $("wb-vis").value = body.visibility;
    }
    if (body.language && $("wb-lang").querySelector(`option[value="${escapeAttr(body.language)}"]`)) {
      $("wb-lang").value = body.language;
    }
    folderSelect.value = body.folderName || "";
    tagsInput.value = Array.isArray(body.tags) ? body.tags.join(", ") : "";
    pinnedInput.checked = Boolean(body.pinned);
    favoriteInput.checked = Boolean(body.favorite);
    composerAttachments = (body.files || []).map((f) => ({
      filename: f.filename,
      content: f.content,
      language: f.language || "none",
      mediaKind: f.mediaKind || undefined,
      mimeType: f.mimeType || undefined
    }));
    updateEditChrome();
    renderAttachList();
    persistDraft();
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openBlobPreview(blob, fallbackFilename) {
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) {
      triggerBlobDownload(blob, fallbackFilename);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function downloadOfflineEntryJson(entry) {
    const slug = sanitizeFilenamePart(entry.slug || entry.title || "offline-cache", "offline-cache");
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    triggerBlobDownload(blob, `${slug}.offline-cache.json`);
  }

  function renderOfflineAssetList(entry) {
    const wrap = document.createElement("div");
    wrap.className = "wb-offline-assets";
    const assets = buildOfflineCacheAssets(entry);

    assets.forEach((asset) => {
      const row = document.createElement("div");
      row.className = "wb-offline-asset";

      const meta = document.createElement("div");
      meta.className = "wb-offline-asset__meta";
      meta.innerHTML = `
        <strong>${escapeHtml(asset.filename)}</strong>
        <span class="wb-muted">${escapeHtml(asset.kind)}${asset.id === "body" ? " · main body" : ""}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "wb-paste-actions";

      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "wb-btn wb-btn-secondary wb-btn-tiny";
      openBtn.textContent = asset.kind === "text" ? "Open" : "Preview";
      openBtn.addEventListener("click", () => {
        const blob = offlineAssetToBlob(asset);
        openBlobPreview(blob, asset.filename);
      });

      const downloadBtn = document.createElement("button");
      downloadBtn.type = "button";
      downloadBtn.className = "wb-btn wb-btn-ghost wb-btn-tiny";
      downloadBtn.textContent = "Download";
      downloadBtn.addEventListener("click", () => {
        const blob = offlineAssetToBlob(asset);
        triggerBlobDownload(blob, asset.filename);
      });

      actions.append(openBtn, downloadBtn);
      row.append(meta, actions);
      wrap.appendChild(row);
    });

    return wrap;
  }

  async function renderOfflineCache() {
    const entries = await loadOfflineCacheEntries();
    cacheMeta.textContent = `${entries.length} cached`;
    cacheList.innerHTML = "";
    if (!entries.length) {
      cacheList.innerHTML = `<p class="wb-hint" style="margin:0">Use <strong>Cache local</strong> on a cloud paste to keep an offline copy in the extension.</p>`;
      return;
    }

    entries.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "wb-stack-card";
      card.innerHTML = `
        <div class="wb-paste-title">${escapeHtml(entry.title || entry.slug || "Untitled")}</div>
        <div class="wb-paste-meta">
          <span class="wb-pill">offline</span>
          <span class="wb-font-mono">${escapeHtml(entry.language || "none")}</span>
          <span>${escapeHtml(String((entry.files || []).length))} attachment${(entry.files || []).length === 1 ? "" : "s"}</span>
          <span>· ${escapeHtml(new Date(entry.cachedAt || Date.now()).toLocaleString())}</span>
        </div>
      `;
      const actions = document.createElement("div");
      actions.className = "wb-paste-actions";

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "wb-btn wb-btn-secondary wb-btn-tiny";
      loadBtn.textContent = "Load to composer";
      loadBtn.addEventListener("click", () => {
        applyComposerStateFromPaste(entry, { duplicate: true });
        setStatus(`Loaded offline cache for ${entry.slug || entry.title}.`, "ok");
      });

      const exportBtn = document.createElement("button");
      exportBtn.type = "button";
      exportBtn.className = "wb-btn wb-btn-secondary wb-btn-tiny";
      exportBtn.textContent = "Export JSON";
      exportBtn.addEventListener("click", () => {
        downloadOfflineEntryJson(entry);
        setStatus("Offline cache entry exported.", "ok");
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wb-btn wb-btn-ghost wb-btn-tiny";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", async () => {
        await removeOfflineCacheEntry(entry.slug);
        await renderOfflineCache();
        setStatus("Removed offline cache entry.", "ok");
      });

      actions.append(loadBtn, exportBtn, removeBtn);
      card.appendChild(actions);
      card.appendChild(renderOfflineAssetList(entry));
      cacheList.appendChild(card);
    });
  }

  async function loadFolders() {
    const previousValue = folderSelect.value || "";
    folderSelect.innerHTML = `<option value="">No folder</option>`;
    try {
      const data = await apiFetch("/api/v1/me/folders");
      const folders = Array.isArray(data?.folders) ? data.folders : [];
      folders.forEach((folderName) => {
        const option = document.createElement("option");
        option.value = folderName;
        option.textContent = folderName;
        folderSelect.appendChild(option);
      });
      if (folders.includes(previousValue)) {
        folderSelect.value = previousValue;
      }
    } catch {
      folderSelect.value = "";
    }
  }

  async function renderApiKeys() {
    keyList.innerHTML = "";
    try {
      const data = await apiFetch("/api/v1/me/keys");
      currentKeyId = data?.currentKeyId || null;
      const keys = Array.isArray(data?.keys) ? data.keys : [];
      if (!keys.length) {
        keyList.innerHTML = `<p class="wb-hint" style="margin:0">No API keys found for this account.</p>`;
        return;
      }

      keys.forEach((key) => {
        const item = document.createElement("div");
        item.className = "wb-stack-card";
        item.innerHTML = `
          <div class="wb-paste-title">${escapeHtml(key.label || "API key")}</div>
          <div class="wb-paste-meta">
            <span class="wb-pill">${key.id === currentKeyId ? "current" : "saved"}</span>
            <span>Created ${escapeHtml(new Date(key.createdAt).toLocaleString())}</span>
            <span>· Last used ${escapeHtml(key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "never")}</span>
          </div>
        `;
        const actions = document.createElement("div");
        actions.className = "wb-paste-actions";

        if (key.id !== currentKeyId) {
          const useBtn = document.createElement("button");
          useBtn.type = "button";
          useBtn.className = "wb-btn wb-btn-secondary wb-btn-tiny";
          useBtn.textContent = "Use in profile";
          useBtn.addEventListener("click", () => {
            setStatus("Create a replacement key first if you need to switch active credentials safely. Newly created keys are shown only once.", "ok");
          });
          actions.appendChild(useBtn);
        }

        const revokeBtn = document.createElement("button");
        revokeBtn.type = "button";
        revokeBtn.className = "wb-btn wb-btn-danger wb-btn-tiny";
        revokeBtn.textContent = key.id === currentKeyId ? "Revoke current" : "Revoke";
        revokeBtn.addEventListener("click", async () => {
          if (!confirm(`Revoke API key "${key.label}"?`)) {
            return;
          }
          const result = await apiFetch(`/api/v1/me/keys/${encodeURIComponent(key.id)}`, { method: "DELETE" });
          await renderApiKeys();
          if (result?.revokedCurrent) {
            apiKeyInput.value = "";
            setStatus("Current key was revoked. Paste a replacement key and save the profile again.", "ok");
          } else {
            setStatus("API key revoked.", "ok");
          }
        });
        actions.appendChild(revokeBtn);

        item.appendChild(actions);
        keyList.appendChild(item);
      });
    } catch (error) {
      keyList.innerHTML = `<p class="wb-hint" style="margin:0">${escapeHtml(
        error instanceof Error ? error.message : String(error)
      )}</p>`;
    }
  }

  $("wb-create-key").addEventListener("click", async () => {
    const label = newKeyLabelInput.value.trim();
    if (!label) {
      setStatus("Enter a label for the new API key.", "err");
      return;
    }
    try {
      const data = await apiFetch("/api/v1/me/keys", {
        method: "POST",
        body: JSON.stringify({ label })
      });
      newKeyLabelInput.value = "";
      if (data?.key?.token) {
        apiKeyInput.value = data.key.token;
        const shouldReplace = confirm("A new API key was created. Replace the active profile key with this new token?");
        if (shouldReplace) {
          const profile = await saveProfile({
            profileId: profileSelect.value || currentProfile?.id || null,
            label: profileLabelInput.value,
            baseUrl: baseUrlInput.value,
            apiKey: data.key.token,
            passphrase: passphraseInput.value.trim()
          });
          currentProfile = profile;
          await syncProfileForm(profile.id);
        }
      }
      await renderApiKeys();
      setStatus("New API key created. The token is shown once in the field above.", "ok");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  createFolderBtn.addEventListener("click", async () => {
    const name = prompt("Folder name");
    if (!name) {
      return;
    }
    try {
      await apiFetch("/api/v1/me/folders", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      await loadFolders();
      folderSelect.value = name.trim();
      setStatus("Folder created.", "ok");
      persistDraft();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  clearComposerBtn.addEventListener("click", () => {
    $("wb-title").value = "";
    $("wb-content").value = "";
    folderSelect.value = "";
    tagsInput.value = "";
    pinnedInput.checked = false;
    favoriteInput.checked = false;
    mirrorLocalInput.checked = false;
    clearEditMode();
    persistDraft();
    setStatus("Composer cleared.", "ok");
  });

  openWorkspaceBtn.addEventListener("click", async () => {
    try {
      const { baseUrl } = await getCreds();
      window.open(joinUrl(baseUrl, "/app"), "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), "err");
    }
  });

  function parseTagsInput() {
    return tagsInput.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  function clearComposerFields() {
    $("wb-title").value = "";
    $("wb-content").value = "";
    folderSelect.value = "";
    tagsInput.value = "";
    pinnedInput.checked = false;
    favoriteInput.checked = false;
    mirrorLocalInput.checked = false;
    clearEditMode();
    persistDraft();
  }

  function buildComposerPayload() {
    return {
      title: ($("wb-title").value || "").trim() || "Untitled",
      content: $("wb-content").value || "",
      language: $("wb-lang").value,
      visibility: $("wb-vis").value,
      folderName: folderSelect.value || null,
      tags: parseTagsInput(),
      burnAfterRead: false,
      burnAfterViews: 0,
      pinned: pinnedInput.checked,
      favorite: favoriteInput.checked,
      archived: false,
      template: false,
      files: serializeFilesForApi(composerAttachments)
    };
  }

  function buildPayloadFromBody(body, overrides = {}) {
    const payload = {
      title: (body.title || "").trim() || "Untitled",
      content: body.content || "",
      language: body.language || "none",
      visibility: body.visibility || "private",
      folderName: body.folderName || null,
      tags: Array.isArray(body.tags) ? body.tags.filter(Boolean).slice(0, 50) : [],
      burnAfterRead: Boolean(body.burnAfterRead),
      burnAfterViews: Number.isFinite(body.burnAfterViews) ? body.burnAfterViews : 0,
      pinned: Boolean(body.pinned),
      favorite: Boolean(body.favorite),
      archived: Boolean(body.archived),
      template: Boolean(body.template)
    };

    if (body.expiresAt) {
      payload.expiresAt = body.expiresAt;
    }

    if (Array.isArray(body.files)) {
      payload.files = serializeFilesForApi(
        body.files.map((file) => ({
          filename: file.filename,
          content: file.content,
          language: file.language || "none",
          mediaKind: file.mediaKind || undefined,
          mimeType: file.mimeType || undefined
        }))
      );
    }

    return { ...payload, ...overrides };
  }

  async function loadPasteBody(slug) {
    return apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`);
  }

  async function cachePasteLocally(body) {
    await pushOfflineCacheEntry({
      slug: body.slug,
      title: body.title,
      content: body.content,
      language: body.language,
      visibility: body.visibility,
      folderName: body.folderName || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      pinned: Boolean(body.pinned),
      favorite: Boolean(body.favorite),
      files: Array.isArray(body.files) ? body.files : [],
      cachedAt: Date.now()
    });
    await renderOfflineCache();
  }

  async function importPasteIntoLocalVault(body) {
    const bridge = window.__bookmarkfsVaultBridge;
    if (!bridge || typeof bridge.importPaste !== "function") {
      throw new Error("Local vault bridge is not available in this extension view.");
    }
    return bridge.importPaste(body, {
      targetDir: `woxbin-imports/${sanitizeFilenamePart(body.slug || body.title || "paste", "paste")}`
    });
  }

  async function mirrorCurrentPasteLocally(slug) {
    const bridge = window.__bookmarkfsVaultBridge;
    if (!bridge || typeof bridge.importPaste !== "function") {
      return false;
    }
    const body = await loadPasteBody(slug);
    await bridge.importPaste(body, {
      targetDir: `woxbin-mirror/${sanitizeFilenamePart(body.slug || body.title || "paste", "paste")}`
    });
    return true;
  }

  function applyPendingComposePayload(payload) {
    clearEditMode();
    $("wb-title").value = payload.title || "";
    $("wb-content").value = payload.content || "";
    if (payload.visibility && $("wb-vis").querySelector(`option[value="${escapeAttr(payload.visibility)}"]`)) {
      $("wb-vis").value = payload.visibility;
    }
    if (payload.language && $("wb-lang").querySelector(`option[value="${escapeAttr(payload.language)}"]`)) {
      $("wb-lang").value = payload.language;
    }
    folderSelect.value = payload.folderName || "";
    tagsInput.value = Array.isArray(payload.tags) ? payload.tags.join(", ") : "";
    pinnedInput.checked = Boolean(payload.pinned);
    favoriteInput.checked = Boolean(payload.favorite);
    mirrorLocalInput.checked = Boolean(payload.mirrorLocal);
    composerAttachments = Array.isArray(payload.attachments)
      ? payload.attachments.map((file) => ({
          filename: file.filename,
          content: file.content,
          language: file.language || "none",
          mediaKind: file.mediaKind || undefined,
          mimeType: file.mimeType || undefined
        }))
      : [];
    renderAttachList();
    updateEditChrome();
    persistDraft();
  }

  function renderPasteCard(p, baseUrl) {
    const title = (p.title || p.slug || "").slice(0, 120);
    const slug = p.slug || "";
    const pageUrl = joinUrl(baseUrl, `/p/${slug}`);
    const rawUrl = joinUrl(baseUrl, `/raw/${slug}`);
    const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "";
    const tags = Array.isArray(p.tags) ? p.tags.slice(0, 4) : [];
    const folderName = p.folderName || "";

    const card = document.createElement("div");
    card.className = "wb-paste-card";
    card.innerHTML = `
      <div class="wb-paste-title">${escapeHtml(title)}</div>
      <div class="wb-paste-meta">
        <span class="wb-pill">${escapeHtml(p.visibility || "")}</span>
        <span class="wb-font-mono">${escapeHtml(p.language || "none")}</span>
        ${p.pinned ? '<span class="wb-pill">pinned</span>' : ""}
        ${p.favorite ? '<span class="wb-pill">favorite</span>' : ""}
        ${folderName ? `<span class="wb-pill">folder:${escapeHtml(folderName)}</span>` : ""}
        <span>· ${escapeHtml(updated)}</span>
      </div>
      ${tags.length ? `<div class="wb-paste-tags">${tags.map((tag) => `<span class="wb-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="wb-paste-actions"></div>
    `;
    const actions = card.querySelector(".wb-paste-actions");

    const mkBtn = (label, variant = "secondary") => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `wb-btn wb-btn-tiny wb-btn-${variant}`;
      b.textContent = label;
      return b;
    };

    const bOpen = mkBtn("Open", "primary");
    bOpen.addEventListener("click", () => {
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    });

    const bRaw = mkBtn("Open raw");
    bRaw.addEventListener("click", () => {
      window.open(rawUrl, "_blank", "noopener,noreferrer");
    });

    const bCopy = mkBtn("Copy link");
    bCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setStatus("Page URL copied.", "ok");
      } catch {
        setStatus("Could not copy the page URL.", "err");
      }
    });

    const bEdit = mkBtn("Edit");
    bEdit.addEventListener("click", async () => {
      setStatus("Loading paste…", "");
      try {
        const body = await loadPasteBody(slug);
        applyComposerStateFromPaste(body);
        setStatus(`Editing ${body.slug || slug}. Ctrl+Enter to save.`, "ok");
        $("wb-content").focus();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bDuplicate = mkBtn("Duplicate");
    bDuplicate.addEventListener("click", async () => {
      setStatus("Loading paste…", "");
      try {
        const body = await loadPasteBody(slug);
        applyComposerStateFromPaste(body, { duplicate: true });
        setStatus(`Loaded ${body.slug || slug} into composer as a new paste.`, "ok");
        $("wb-title").focus();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bPin = mkBtn(p.pinned ? "Unpin" : "Pin");
    bPin.addEventListener("click", async () => {
      setStatus("Updating paste…", "");
      try {
        const body = await loadPasteBody(slug);
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          body: JSON.stringify(buildPayloadFromBody(body, { pinned: !body.pinned }))
        });
        setStatus(!body.pinned ? "Paste pinned." : "Paste unpinned.", "ok");
        await refreshList();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bFav = mkBtn(p.favorite ? "Unfavorite" : "Favorite");
    bFav.addEventListener("click", async () => {
      setStatus("Updating paste…", "");
      try {
        const body = await loadPasteBody(slug);
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          body: JSON.stringify(buildPayloadFromBody(body, { favorite: !body.favorite }))
        });
        setStatus(!body.favorite ? "Paste favorited." : "Paste unfavorited.", "ok");
        await refreshList();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bCache = mkBtn("Cache local");
    bCache.addEventListener("click", async () => {
      setStatus("Caching paste locally…", "");
      try {
        const body = await loadPasteBody(slug);
        await cachePasteLocally(body);
        setStatus(`Cached ${body.slug || slug} offline in the extension.`, "ok");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bImport = mkBtn("To vault");
    bImport.addEventListener("click", async () => {
      setStatus("Importing into local vault…", "");
      try {
        const body = await loadPasteBody(slug);
        const stored = await importPasteIntoLocalVault(body);
        setStatus(`Imported ${stored.length || 1} file(s) into the local vault.`, "ok");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bBody = mkBtn("Copy body", "ghost");
    bBody.addEventListener("click", async () => {
      setStatus("Loading body…", "");
      try {
        const body = await loadPasteBody(slug);
        await navigator.clipboard.writeText(body?.content ?? "");
        setStatus("Body copied to clipboard.", "ok");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    const bDel = mkBtn("Delete", "danger");
    bDel.addEventListener("click", async () => {
      if (!confirm(`Delete paste "${title}" (${slug})? This cannot be undone.`)) return;
      setStatus("Deleting…", "");
      try {
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`, { method: "DELETE" });
        if (editingSlug === slug) {
          clearComposerFields();
        }
        setStatus(`Deleted ${slug}.`, "ok");
        await refreshList();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
      }
    });

    actions.append(bOpen, bRaw, bCopy, bEdit, bDuplicate, bPin, bFav, bCache, bImport, bBody, bDel);
    return card;
  }

  function updateLoadMoreState() {
    loadMoreBtn.disabled = listLoading || listOffset >= listTotal || listTotal === 0;
  }

  async function fetchListPage({ append }) {
    const { baseUrl, apiKey } = await getCreds();
    if (!baseUrl || !apiKey) {
      setStatus("Complete Setup above, then save.", "err");
      listWrap.innerHTML = `<p class="wb-hint" style="margin:0">No connection yet.</p>`;
      loadMoreBtn.disabled = true;
      return;
    }

    const q = searchInput.value.trim().slice(0, 80);
    const offset = append ? listOffset : 0;
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (q) qs.set("q", q);

    listLoading = true;
    updateLoadMoreState();
    if (!append) setStatus("Loading…", "");

    try {
      const data = await apiFetch(`/api/v1/pastes?${qs.toString()}`);
      const pastes = data.pastes || [];
      listTotal = Number(data.total ?? 0);
      if (!append) {
        listWrap.innerHTML = "";
        listOffset = 0;
      }

      if (!append && !pastes.length) {
        listWrap.innerHTML = `<p class="wb-hint" style="margin:0">No pastes yet. Create one in <strong>Composer</strong> below.</p>`;
        listMeta.textContent = `${listTotal} total`;
        listOffset = 0;
        setStatus("Connected.", "ok");
        listLoading = false;
        updateLoadMoreState();
        return;
      }

      for (const p of pastes) {
        listWrap.appendChild(renderPasteCard(p, baseUrl));
      }
      listOffset = append ? listOffset + pastes.length : pastes.length;
      listMeta.textContent = `${listOffset} loaded · ${listTotal} total`;
      setStatus("Connected.", "ok");
    } catch (e) {
      if (!append) listWrap.innerHTML = "";
      setStatus(e instanceof Error ? e.message : String(e), "err");
    } finally {
      listLoading = false;
      updateLoadMoreState();
      void renderRecentSlugs();
    }
  }

  async function refreshList() {
    listOffset = 0;
    await fetchListPage({ append: false });
    await fetchMe();
  }

  const debouncedSearch = debounce(() => void refreshList(), SEARCH_DEBOUNCE_MS);
  searchInput.addEventListener("input", () => debouncedSearch());

  $("wb-refresh").addEventListener("click", () => void refreshList());

  loadMoreBtn.addEventListener("click", async () => {
    if (listOffset >= listTotal) return;
    await fetchListPage({ append: true });
  });

  async function submitComposer() {
    const payload = buildComposerPayload();

    setStatus(editingSlug ? "Saving…" : "Creating…", "");
    try {
      let slug = editingSlug;
      if (editingSlug) {
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(editingSlug)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setStatus(`Updated ${editingSlug}.`, "ok");
      } else {
        const created = await apiFetch("/api/v1/pastes", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        slug = created.slug || created.id;
        const { baseUrl: bu } = await getCreds();
        const pageUrl = joinUrl(bu, created.url || `/p/${slug}`);
        await pushRecentSlug(slug);
        setStatus(`Created ${slug}.`, "ok");
        window.open(pageUrl, "_blank", "noopener,noreferrer");
      }

      if (mirrorLocalInput.checked && slug) {
        const mirrored = await mirrorCurrentPasteLocally(slug);
        if (mirrored) {
          setStatus(`${editingSlug ? "Saved" : "Created"} ${slug} and mirrored it to the local vault.`, "ok");
        }
      }

      clearComposerFields();
      await refreshList();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e), "err");
    }
  }

  btnCreate.addEventListener("click", () => void submitComposer());

  $("wb-open-app").addEventListener("click", async () => {
    try {
      const { baseUrl } = await getCreds();
      const bu = baseUrl || normalizeBaseUrl($("wb-base-url").value);
      if (!bu) {
        setStatus("Enter and save a site URL first.", "err");
        return;
      }
      window.open(joinUrl(bu, "/app"), "_blank", "noopener,noreferrer");
    } catch (error) {
      const bu = normalizeBaseUrl($("wb-base-url").value);
      if (!bu) {
        setStatus(error instanceof Error ? error.message : String(error), "err");
        return;
      }
      window.open(joinUrl(bu, "/app"), "_blank", "noopener,noreferrer");
    }
  });

  $("wb-content").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      btnCreate.click();
    }
    if (ev.key === "Escape") {
      setStatus("", "");
    }
  });

  const dismissData = await storageLocalGet([WOXBIN_STORAGE.onboardingDismissed]);
  if (!dismissData[WOXBIN_STORAGE.onboardingDismissed]) {
    onboardEl.hidden = false;
  }
  $("wb-onboard-dismiss").addEventListener("click", async () => {
    onboardEl.hidden = true;
    await storageLocalSet({ [WOXBIN_STORAGE.onboardingDismissed]: true });
  });

  await loadUrlPresetsIntoDatalist();
  await syncProfileForm();
  await loadComposerDraft();
  await renderOfflineCache();

  const pc = await takePendingCompose();
  if (pc && typeof pc === "object") {
    applyPendingComposePayload(pc);
    setStatus("Loaded from vault or context menu.", "ok");
  }

  if (currentProfile) {
    await Promise.allSettled([refreshList(), loadFolders(), renderApiKeys(), renderOfflineCache()]);
  } else {
    await renderRecentSlugs();
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
