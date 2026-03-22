/**
 * Compact Wox-Bin panel — styled to match app/globals.css (dark “deep space” theme).
 * Default site URL: build-time __WOXBIN_DEFAULT_SITE_URL__ (see webpack.config.js).
 */

/* global __WOXBIN_DEFAULT_SITE_URL__ */

const DEFAULT_SITE_URL =
  typeof __WOXBIN_DEFAULT_SITE_URL__ !== "undefined" && __WOXBIN_DEFAULT_SITE_URL__
    ? String(__WOXBIN_DEFAULT_SITE_URL__).trim()
    : "";

const WOXBIN_STORAGE = {
  baseUrl: "woxbin_base_url",
  apiKey: "woxbin_api_key",
  urlPresets: "woxbin_url_presets",
  draft: "woxbin_composer_draft",
  onboardingDismissed: "woxbin_onboarding_dismissed",
  recentSlugs: "woxbin_recent_slugs"
};

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

function storageLocalGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageLocalSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

function storageLocalRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function normalizeBaseUrl(raw) {
  const s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return `${u.origin}`;
  } catch {
    return "";
  }
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

export async function mountWoxBinCompact(rootEl) {
  if (!rootEl) return;

  rootEl.innerHTML = "";

  const langOpts = WOXBIN_LANGUAGES.map(
    ([v, l]) => `<option value="${v}">${l}</option>`
  ).join("");

  const main = document.createElement("div");
  main.className = "wb-root";
  main.innerHTML = `
    <div class="wb-onboard" id="wb-onboard" hidden>
      <div class="wb-onboard__inner">
        <strong>Wox-Bin in the extension</strong>
        <p class="wb-hint" style="margin:6px 0 0">Save your site URL and API key below. Use <span class="wb-font-mono">Ctrl+Enter</span> in the body to publish. Right-click a page or selection to open a new tab here.</p>
        <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-onboard-dismiss">Dismiss</button>
      </div>
    </div>

    <section class="wb-panel">
      <h2>Connect</h2>
      <p class="wb-lead">Use the same site URL as in the browser (e.g. your Vercel app or localhost). Keys are created under <strong>Workspace → API keys</strong> after you sign in.</p>
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
        <li>Paste <strong>URL</strong> + <strong>key</strong> below, then <strong>Save</strong>.</li>
      </ol>
      <div class="wb-field">
        <label for="wb-api-key">
          <span>API key</span>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-toggle-key" aria-pressed="false">Show</button>
        </label>
        <input type="password" id="wb-api-key" class="wb-input wb-font-mono" placeholder="Paste secret key" autocomplete="off" spellcheck="false" />
      </div>
      <div class="wb-btns">
        <button type="button" class="wb-btn wb-btn-primary" id="wb-save-creds">Save</button>
        <button type="button" class="wb-btn wb-btn-secondary" id="wb-sign-out">Clear saved</button>
      </div>
      <p class="wb-hint">Saved in <span class="wb-font-mono">chrome.storage.local</span> on this device only — not in bookmarks.</p>
      <p class="wb-connected" id="wb-connected" aria-live="polite"></p>
    </section>

    <section class="wb-panel">
      <h2>Library</h2>
      <div class="wb-field wb-search-row">
        <label for="wb-search">Search</label>
        <input type="search" id="wb-search" class="wb-input wb-font-mono" placeholder="Title or slug…" autocomplete="off" spellcheck="false" />
      </div>
      <div class="wb-list-head">
        <div class="wb-btns" style="margin:0">
          <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-refresh">Refresh</button>
          <button type="button" class="wb-btn wb-btn-ghost wb-btn-tiny" id="wb-open-app">Open site ↗</button>
        </div>
        <span class="wb-list-meta" id="wb-list-meta"></span>
      </div>
      <div id="wb-list-wrap"></div>
      <div class="wb-loadmore-wrap">
        <button type="button" class="wb-btn wb-btn-secondary wb-btn-tiny" id="wb-load-more" disabled>Load more</button>
      </div>
    </section>

    <section class="wb-panel">
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
  /** @type {Array<{ filename: string; content: string; language: string; mediaKind?: string; mimeType?: string }>} */
  let composerAttachments = [];

  function updateEditChrome() {
    if (editingSlug) {
      editBar.hidden = false;
      editBadge.textContent = `Editing · ${editingSlug}`;
      btnCreate.textContent = "Save changes";
    } else {
      editBar.hidden = true;
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

  async function loadCreds() {
    const data = await storageLocalGet([WOXBIN_STORAGE.baseUrl, WOXBIN_STORAGE.apiKey]);
    let url = data[WOXBIN_STORAGE.baseUrl] || "";
    if (!url) url = defaultUrlForInput();
    $("wb-base-url").value = url;
    $("wb-api-key").value = data[WOXBIN_STORAGE.apiKey] || "";
  }

  async function getCreds() {
    const data = await storageLocalGet([WOXBIN_STORAGE.baseUrl, WOXBIN_STORAGE.apiKey]);
    return {
      baseUrl: normalizeBaseUrl(data[WOXBIN_STORAGE.baseUrl]),
      apiKey: String(data[WOXBIN_STORAGE.apiKey] || "").trim()
    };
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
  }

  const persistDraft = debounce(async () => {
    await storageLocalSet({
      [WOXBIN_STORAGE.draft]: {
        title: $("wb-title").value,
        content: $("wb-content").value,
        visibility: $("wb-vis").value,
        language: $("wb-lang").value,
        updatedAt: Date.now()
      }
    });
  }, DRAFT_DEBOUNCE_MS);

  ["wb-title", "wb-content", "wb-vis", "wb-lang"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", () => persistDraft());
    el.addEventListener("change", () => persistDraft());
  });

  $("wb-save-creds").addEventListener("click", async () => {
    const baseUrl = normalizeBaseUrl($("wb-base-url").value);
    const apiKey = $("wb-api-key").value.trim();
    if (!baseUrl) {
      setStatus("Enter a valid https (or http://localhost) site URL.", "err");
      return;
    }
    if (!apiKey) {
      setStatus("Paste your API key from the workspace.", "err");
      return;
    }
    await storageLocalSet({
      [WOXBIN_STORAGE.baseUrl]: baseUrl,
      [WOXBIN_STORAGE.apiKey]: apiKey
    });
    setStatus("Saved. Loading your pastes…", "ok");
    await refreshList();
    await fetchMe();
  });

  $("wb-sign-out").addEventListener("click", async () => {
    await storageLocalRemove([WOXBIN_STORAGE.baseUrl, WOXBIN_STORAGE.apiKey]);
    $("wb-base-url").value = defaultUrlForInput();
    $("wb-api-key").value = "";
    listWrap.innerHTML = "";
    listMeta.textContent = "";
    connectedEl.textContent = "";
    loadMoreBtn.disabled = true;
    setStatus("Signed out on this device.", "ok");
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
    const { baseUrl, apiKey } = await getCreds();
    if (!baseUrl || !apiKey) return;
    try {
      const data = await apiFetch("/api/v1/me");
      const u = data?.user;
      if (!u) return;
      const label = u.displayName || u.username || u.id || "Account";
      const handle = u.username ? `@${u.username}` : "";
      connectedEl.textContent = handle ? `Connected as ${label} (${handle})` : `Connected as ${label}`;
    } catch {
      connectedEl.textContent = "";
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
    const { baseUrl } = await getCreds();
    const data = await storageLocalGet([WOXBIN_STORAGE.recentSlugs]);
    const slugs = Array.isArray(data[WOXBIN_STORAGE.recentSlugs])
      ? data[WOXBIN_STORAGE.recentSlugs].filter(Boolean)
      : [];
    box.innerHTML = "";
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

  function renderPasteCard(p, baseUrl) {
    const title = (p.title || p.slug || "").slice(0, 120);
    const slug = p.slug || "";
    const pageUrl = joinUrl(baseUrl, `/p/${slug}`);
    const rawUrl = joinUrl(baseUrl, `/raw/${slug}`);
    const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "";

    const card = document.createElement("div");
    card.className = "wb-paste-card";
    card.innerHTML = `
      <div class="wb-paste-title">${escapeHtml(title)}</div>
      <div class="wb-paste-meta">
        <span class="wb-pill">${escapeHtml(p.visibility || "")}</span>
        <span class="wb-font-mono">${escapeHtml(p.language || "")}</span>
        <span>· ${escapeHtml(updated)}</span>
      </div>
      <div class="wb-paste-actions"></div>
    `;
    const actions = card.querySelector(".wb-paste-actions");

    const mkBtn = (label, primary) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `wb-btn wb-btn-tiny ${primary ? "wb-btn-primary" : "wb-btn-secondary"}`;
      b.textContent = label;
      return b;
    };

    const bOpen = mkBtn("Open", true);
    bOpen.addEventListener("click", () => {
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    });
    const bRaw = mkBtn("Raw URL", false);
    bRaw.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rawUrl);
        setStatus("Raw URL copied.", "ok");
      } catch {
        setStatus("Could not copy.", "err");
      }
    });
    const bPage = mkBtn("Copy link", false);
    bPage.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setStatus("Page URL copied.", "ok");
      } catch {
        setStatus("Could not copy.", "err");
      }
    });
    const bBody = mkBtn("Copy body", false);
    bBody.addEventListener("click", async () => {
      setStatus("Loading body…", "");
      try {
        const body = await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`);
        const text = body?.content ?? "";
        await navigator.clipboard.writeText(text);
        setStatus("Body copied to clipboard.", "ok");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), "err");
      }
    });
    const bEdit = mkBtn("Edit", false);
    bEdit.addEventListener("click", async () => {
      setStatus("Loading…", "");
      try {
        const body = await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`);
        editingSlug = body.slug || slug;
        $("wb-title").value = body.title || "";
        $("wb-content").value = body.content || "";
        if (body.visibility && $("wb-vis").querySelector(`option[value="${escapeAttr(body.visibility)}"]`)) {
          $("wb-vis").value = body.visibility;
        }
        if (body.language && $("wb-lang").querySelector(`option[value="${escapeAttr(body.language)}"]`)) {
          $("wb-lang").value = body.language;
        }
        composerAttachments = (body.files || []).map((f) => ({
          filename: f.filename,
          content: f.content,
          language: f.language || "none",
          mediaKind: f.mediaKind || undefined,
          mimeType: f.mimeType || undefined
        }));
        updateEditChrome();
        renderAttachList();
        setStatus(`Editing ${editingSlug}. Ctrl+Enter to save.`, "ok");
        $("wb-content").focus();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), "err");
      }
    });
    const bDel = mkBtn("Delete", false);
    bDel.classList.add("wb-btn-danger");
    bDel.addEventListener("click", async () => {
      if (!confirm(`Delete paste "${title}" (${slug})? This cannot be undone.`)) return;
      setStatus("Deleting…", "");
      try {
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(slug)}`, { method: "DELETE" });
        if (editingSlug === slug) {
          $("wb-title").value = "";
          $("wb-content").value = "";
          clearEditMode();
        }
        setStatus(`Deleted ${slug}.`, "ok");
        await refreshList();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), "err");
      }
    });
    actions.append(bOpen, bRaw, bPage, bBody, bEdit, bDel);
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
    const title = ($("wb-title").value || "").trim() || "Untitled";
    const content = $("wb-content").value || "";
    const visibility = $("wb-vis").value;
    const language = $("wb-lang").value;
    const files = serializeFilesForApi(composerAttachments);

    const payload = {
      title,
      content,
      language,
      visibility,
      tags: [],
      burnAfterRead: false,
      burnAfterViews: 0,
      pinned: false,
      favorite: false,
      archived: false,
      template: false,
      files
    };

    setStatus(editingSlug ? "Saving…" : "Creating…", "");
    try {
      if (editingSlug) {
        await apiFetch(`/api/v1/pastes/${encodeURIComponent(editingSlug)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setStatus(`Updated ${editingSlug}.`, "ok");
        clearEditMode();
        $("wb-title").value = "";
        $("wb-content").value = "";
      } else {
        const created = await apiFetch("/api/v1/pastes", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const slug = created.slug || created.id;
        const { baseUrl: bu } = await getCreds();
        const pageUrl = joinUrl(bu, created.url || `/p/${slug}`);
        $("wb-content").value = "";
        composerAttachments = [];
        renderAttachList();
        await storageLocalSet({
          [WOXBIN_STORAGE.draft]: {
            title: $("wb-title").value,
            content: "",
            visibility: $("wb-vis").value,
            language: $("wb-lang").value,
            updatedAt: Date.now()
          }
        });
        await pushRecentSlug(slug);
        setStatus(`Created ${slug}.`, "ok");
        window.open(pageUrl, "_blank", "noopener,noreferrer");
      }
      await refreshList();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e), "err");
    }
  }

  btnCreate.addEventListener("click", () => void submitComposer());

  $("wb-open-app").addEventListener("click", async () => {
    const { baseUrl } = await getCreds();
    const bu = baseUrl || normalizeBaseUrl($("wb-base-url").value);
    if (!bu) {
      setStatus("Enter and save a site URL first.", "err");
      return;
    }
    window.open(joinUrl(bu, "/app"), "_blank", "noopener,noreferrer");
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
  await loadCreds();
  await loadComposerDraft();

  const pending = await storageLocalGet(["woxbin_pending_compose"]);
  const pc = pending.woxbin_pending_compose;
  if (pc && typeof pc === "object") {
    if (pc.title) $("wb-title").value = String(pc.title).slice(0, 500);
    if (pc.content != null) $("wb-content").value = String(pc.content);
    if (pc.visibility && $("wb-vis").querySelector(`option[value="${escapeAttr(pc.visibility)}"]`)) {
      $("wb-vis").value = pc.visibility;
    }
    if (pc.language && $("wb-lang").querySelector(`option[value="${escapeAttr(pc.language)}"]`)) {
      $("wb-lang").value = pc.language;
    }
    await storageLocalRemove(["woxbin_pending_compose"]);
    setStatus("Loaded from vault or context menu.", "ok");
    persistDraft();
  }

  const { baseUrl, apiKey } = await getCreds();
  if (baseUrl && apiKey) {
    await refreshList();
  } else {
    setStatus("");
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
