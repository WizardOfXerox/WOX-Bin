/**
 * WOX-Bin – Personal paste & notes (Pastebin-like)
 * Local: localStorage. Online: account + server API when logged in.
 */

const STORAGE_KEY = 'woxbin_data';
const ANON_CLAIMS_KEY = 'woxbin_anon_claims';
const DEFAULT_FOLDERS = ['Notes', 'Code', 'Snippets'];

const BUILTIN_TEMPLATES = [
  { id: 'py-script', title: 'Python script', language: 'python', content: '#!/usr/bin/env python3\n"""Description."""\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n' },
  { id: 'html-boiler', title: 'HTML boilerplate', language: 'markup', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Page</title>\n</head>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>\n' },
  { id: 'js-module', title: 'JavaScript module', language: 'javascript', content: 'export function hello() {\n  return "Hello";\n}\n\nexport default { hello };\n' },
  { id: 'json-empty', title: 'Empty JSON', language: 'json', content: '{\n  \n}\n' },
  { id: 'bash-script', title: 'Bash script', language: 'bash', content: '#!/usr/bin/env bash\nset -euo pipefail\n\n# Your script here\necho "Done"\n' },
  { id: 'sql-query', title: 'SQL query', language: 'sql', content: '-- Example query\nSELECT id, name\nFROM table_name\nWHERE 1=1\nORDER BY name;\n' }
];

// --- Safe storage (avoids console spam when Tracking Prevention blocks localStorage/sessionStorage)
let _localBlocked = false;
let _sessionBlocked = false;
const _localMem = {};
const _sessionMem = {};
(function () {
  try { localStorage.getItem('_'); } catch (_) { _localBlocked = true; }
  try { sessionStorage.getItem('_'); } catch (_) { _sessionBlocked = true; }
})();
function getLocal(key) {
  if (_localBlocked) return _localMem[key] !== undefined ? _localMem[key] : null;
  try { return localStorage.getItem(key); } catch (_) { _localBlocked = true; return _localMem[key] !== undefined ? _localMem[key] : null; }
}
function setLocal(key, val) {
  if (_localBlocked) { _localMem[key] = val; return; }
  try { localStorage.setItem(key, val); } catch (_) { _localBlocked = true; _localMem[key] = val; }
}
function getSession(key) {
  if (_sessionBlocked) return _sessionMem[key] !== undefined ? _sessionMem[key] : null;
  try { return sessionStorage.getItem(key); } catch (_) { _sessionBlocked = true; return _sessionMem[key] !== undefined ? _sessionMem[key] : null; }
}
function setSession(key, val) {
  if (_sessionBlocked) { _sessionMem[key] = val; return; }
  try { sessionStorage.setItem(key, val); } catch (_) { _sessionBlocked = true; _sessionMem[key] = val; }
}

// --- Account (online mode)
let user = null;
async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    if (res.status === 401 && json && (json.code === 'SESSION_EXPIRED' || json.code === 'SESSION_REVOKED')) {
      user = null;
      renderAuth();
      initFolders();
      renderPasteList();
      showToast(json.code === 'SESSION_REVOKED' ? 'Session revoked. Please sign in again.' : 'Session expired. Please sign in again.', 'error');
    }
    throw { status: res.status, body: json || text };
  }
  return json;
}
async function checkSession() {
  try {
    const j = await api('/api/me');
    user = j.user;
    data.folders = j.folders || data.folders;
    const pastesRes = await api('/api/pastes');
    data.pastes = (pastesRes.pastes || []).map(normalizePaste);
    return true;
  } catch (_) {
    user = null;
    return false;
  }
}
function normalizePaste(p) {
  return {
    ...p,
    burnAfterRead: p.burnAfterRead ?? p.burn_after_read,
    burnAfterViews: p.burnAfterViews ?? p.burn_after_views ?? 0,
    createdAt: p.createdAt ?? p.created_at,
    updatedAt: p.updatedAt ?? p.updated_at,
    forkedFromId: p.forkedFromId ?? p.forked_from_id ?? null,
    forkedFromTitle: p.forkedFromTitle ?? p.forked_from_title ?? null,
    forkCount: p.forkCount ?? p.fork_count ?? 0,
    replyToId: p.replyToId ?? p.reply_to_id ?? null,
    files: Array.isArray(p.files) ? p.files : [],
    anonymousClaimToken: p.anonymousClaimToken || p.claimToken || null
  };
}
function loadAnonClaims() {
  try {
    const raw = getLocal(ANON_CLAIMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}
function saveAnonClaims(items) {
  setLocal(ANON_CLAIMS_KEY, JSON.stringify(items.slice(0, 1000)));
}
function pasteToApi(p) {
  const out = {
    id: p.id,
    title: p.title,
    content: p.content,
    language: p.language,
    folder: p.folder,
    category: p.category,
    tags: p.tags,
    expiration: p.expiration,
    exposure: p.exposure,
    password: p.password,
    burnAfterRead: p.burnAfterRead,
    burnAfterViews: p.burnAfterViews,
    views: p.views,
    pinned: p.pinned,
    forkedFromId: p.forkedFromId || null,
    replyToId: p.replyToId || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
  if (Array.isArray(p.files) && p.files.length) out.files = p.files;
  return out;
}
function renderAuth() {
  const guest = document.getElementById('auth-guest');
  const userEl = document.getElementById('auth-user');
  const nameEl = document.getElementById('auth-username');
  if (user) {
    if (guest) guest.classList.add('hidden');
    if (userEl) userEl.classList.remove('hidden');
    if (nameEl) nameEl.textContent = 'Hello, ' + user.username;
  } else {
    if (guest) guest.classList.remove('hidden');
    if (userEl) userEl.classList.add('hidden');
  }
}
function showAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  const title = document.getElementById('auth-modal-title');
  const form = document.getElementById('auth-form');
  const err = document.getElementById('auth-error');
  const submit = document.getElementById('auth-submit');
  title.textContent = mode === 'register' ? 'Create account' : 'Sign in';
  submit.textContent = mode === 'register' ? 'Create account' : 'Sign in';
  err.classList.add('hidden');
  openModal(modal);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username-input').value.trim();
    const password = document.getElementById('auth-password-input').value;
    err.classList.add('hidden');
    try {
      const path = mode === 'register' ? '/api/register' : '/api/login';
      await api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      closeModal(modal);
      await checkSession();
      renderAuth();
      initFolders();
      renderPasteList();
      if (data.pastes.length) selectPaste(data.pastes[0].id); else showEmpty();
    } catch (e) {
      err.textContent = (e.status === 429 ? 'Too many attempts. Try again in a minute.' : (e.body && e.body.error) || 'Failed');
      err.classList.remove('hidden');
    }
  };
}
async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch (_) {}
  user = null;
  data = loadData();
  renderAuth();
  initFolders();
  renderPasteList();
  showEmpty();
  currentPasteId = null;
  if (data.pastes.length) selectPaste(data.pastes[0].id); else showEmpty();
}

// Expiration: N=never, B=burn, 10M, 1H, 1D, 1W, 2W, 1M, 6M, 1Y
function getExpiryMs(expireCode) {
  if (!expireCode || expireCode === 'N') return null;
  if (expireCode === 'B') return null; // handled separately
  const map = { '10M': 10 * 60 * 1000, '1H': 60 * 60 * 1000, '1D': 24 * 60 * 60 * 1000, '1W': 7 * 24 * 60 * 60 * 1000, '2W': 14 * 24 * 60 * 60 * 1000, '1M': 30 * 24 * 60 * 60 * 1000, '6M': 180 * 24 * 60 * 60 * 1000, '1Y': 365 * 24 * 60 * 60 * 1000 };
  return map[expireCode] || null;
}

function isPasteExpired(paste) {
  if (!paste) return true;
  if (paste.burned) return true;
  const code = paste.expiration || 'N';
  if (code === 'B') return false; // burn after read is not time expiry
  const ms = getExpiryMs(code);
  if (!ms) return false;
  const created = paste.createdAt || 0;
  return Date.now() - created > ms;
}

function loadData() {
  try {
    let raw = getLocal(STORAGE_KEY);
    if (!raw) raw = getLocal('pastebox_data'); // migrate from old name
    if (raw) {
      const data = JSON.parse(raw);
      data.pastes = data.pastes || [];
      data.folders = data.folders || DEFAULT_FOLDERS;
      // Remove expired pastes on load
      data.pastes = data.pastes.filter(p => !isPasteExpired(p));
      return data;
    }
  } catch (_) {}
  return { pastes: [], folders: [...DEFAULT_FOLDERS] };
}

function saveData(data) {
  if (user) return;
  setLocal(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- State
let data = loadData();
let currentPasteId = null;
let currentFolder = '';
let searchQuery = '';
let rawMode = false;
let sortOrder = 'newest';
let quickFilter = 'all';
let currentFileTab = 0; // 0 = main content, 1+ = p.files[index-1]
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 1500;
const MAX_VERSIONS = 10;
const RECENT_VIEWED_KEY = 'woxbin_recent_viewed';
const RECENT_VIEWED_MAX = 10;
let commentPasteId = '';

function detectLanguageFromText(content = '') {
  const c = String(content || '').trim();
  if (!c) return 'none';
  if (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(c)) {
    try { JSON.parse(c); return 'json'; } catch (_) {}
  }
  if (/(^|\n)\s*#include\s+<|std::|int\s+main\s*\(/.test(c)) return 'cpp';
  if (/(^|\n)\s*def\s+\w+\(|(^|\n)\s*import\s+\w+|(^|\n)\s*class\s+\w+\s*:/.test(c)) return 'python';
  if (/(^|\n)\s*SELECT\s+|(^|\n)\s*INSERT\s+INTO\s+|(^|\n)\s*UPDATE\s+\w+\s+SET\s+/i.test(c)) return 'sql';
  if (/<[a-z][\s\S]*>/i.test(c) && /<\/[a-z]+>/i.test(c)) return 'markup';
  if (/^\s*[-\w]+\s*:\s*.+/m.test(c) && !/[{};]/.test(c)) return 'yaml';
  if (/(^|\n)\s*function\s+\w+\(|=>|console\.log\(|\bconst\b|\blet\b/.test(c)) return 'javascript';
  if (/(^|\n)\s*Write-Host|Get-ChildItem|^\s*\$[A-Za-z_]/m.test(c)) return 'powershell';
  if (/(^|\n)\s*#!/.test(c) || /(^|\n)\s*echo\s+/.test(c)) return 'bash';
  return 'none';
}

function getRecentIds() {
  try {
    const raw = getLocal(RECENT_VIEWED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}
function pushRecentView(id) {
  if (!id) return;
  let ids = getRecentIds().filter(x => x !== id);
  ids.unshift(id);
  if (ids.length > RECENT_VIEWED_MAX) ids = ids.slice(0, RECENT_VIEWED_MAX);
  setLocal(RECENT_VIEWED_KEY, JSON.stringify(ids));
}

// --- DOM
const pasteList = document.getElementById('paste-list');
const editorEmpty = document.getElementById('editor-empty');
const editorWrap = document.getElementById('editor-wrap');
const pasteTitle = document.getElementById('paste-title');
const pasteContent = document.getElementById('paste-content');
const pasteLanguage = document.getElementById('paste-language');
const pasteFolderSelect = document.getElementById('paste-folder');
const pasteCategorySelect = document.getElementById('paste-category');
const pasteExpirationSelect = document.getElementById('paste-expiration');
const pasteExposureSelect = document.getElementById('paste-exposure');
const pastePasswordInput = document.getElementById('paste-password');
const pasteBurnCheckbox = document.getElementById('paste-burn');
const pasteBurnViewsSelect = document.getElementById('paste-burn-views');
const pasteTagsInput = document.getElementById('paste-tags');
const highlightWrap = document.getElementById('highlight-wrap');
const highlightCode = document.getElementById('highlight-code');
const searchInput = document.getElementById('search');
const newFolderName = document.getElementById('new-folder-name');
const folderButtonsContainer = document.getElementById('folder-buttons');
const passwordPrompt = document.getElementById('password-prompt');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const rawToggle = document.getElementById('raw-toggle');
const optMarkdownPreview = document.getElementById('opt-markdown-preview');
const markdownPreviewEl = document.getElementById('markdown-preview');
const markdownPreviewOpt = document.getElementById('markdown-preview-opt');
const pasteViewsEl = document.getElementById('paste-views');
const pasteCreatedEl = document.getElementById('paste-created');
const pasteStatsEl = document.getElementById('paste-stats');
const themeSelect = document.getElementById('theme-select');
const importFileInput = document.getElementById('import-file');

// --- Filter: folder or special "Public" list (Pastebin-style)
const FOLDER_PUBLIC = '__public__'; // show only public pastes (exposure 0)
const FOLDER_EVERYONE_PUBLIC = '__everyone_public__'; // server feed: all users' public pastes
let publicFeedPastes = [];
let viewingPublicPaste = null;
function getFilteredPastes() {
  if (currentFolder === FOLDER_EVERYONE_PUBLIC) return publicFeedPastes;
  let list = data.pastes.filter(p => !isPasteExpired(p));
  if (currentFolder === FOLDER_PUBLIC) {
    list = list.filter(p => (p.exposure ?? 0) === 0);
  } else if (currentFolder) {
    list = list.filter(p => (p.folder || '') === currentFolder);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(p => {
      const title = (p.title || '').toLowerCase();
      const content = (p.content || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : (p.tags || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return title.includes(q) || content.includes(q) || tags.includes(q) || cat.includes(q);
    });
  }
  if (quickFilter === 'favorites') list = list.filter(p => p.favorite);
  if (quickFilter === 'recent') list = list.filter(p => (p.updatedAt || p.createdAt || 0) > Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (quickFilter === 'archived') list = list.filter(p => p.archived);
  const pin = (p) => (p.pinned ? 1 : 0);
  const cmp = (a, b) => {
    if (pin(b) !== pin(a)) return pin(b) - pin(a);
    if (sortOrder === 'oldest') return (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0);
    if (sortOrder === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sortOrder === 'views') return (b.views || 0) - (a.views || 0);
    if (sortOrder === 'trending') return ((b.stars || 0) - (a.stars || 0)) || ((b.views || 0) - (a.views || 0));
    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  };
  return list.sort(cmp);
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString();
}

/** Escape for safe insertion into HTML body (and attribute values). Prevents XSS. */
function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}
/** Escape for safe use in HTML attribute values (e.g. data-id). Use when the value is read back via JS. */
function escapeAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Open a modal with enter animation (remove hidden, then add modal-open on next frame). */
function openModal(el) {
  if (!el) return;
  el.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('modal-open')));
}

/** Close a modal with exit animation (remove modal-open, add hidden after transition). */
function closeModal(el) {
  if (!el) return;
  el.classList.remove('modal-open');
  setTimeout(() => el.classList.add('hidden'), 280);
}

/** Show a toast message (pop-up). type: 'info' | 'success' | 'error' */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);
  const duration = 3500;
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

function renderPasteList() {
  const list = getFilteredPastes();
  const isEveryonePublic = currentFolder === FOLDER_EVERYONE_PUBLIC;
  const activeId = isEveryonePublic ? (viewingPublicPaste && viewingPublicPaste.id) : currentPasteId;
  pasteList.innerHTML = list.length === 0
    ? '<div class="paste-item" style="color: var(--text-dim); padding: 1rem;">' + (isEveryonePublic ? 'No public pastes yet, or load failed.' : 'No pastes yet. Create one!') + '</div>'
    : list.map(p => {
        if (isEveryonePublic) {
          const views = (p.views || 0);
          const stars = (p.stars || 0);
          const uname = (p.username || '').trim() ? '@' + escapeHtml(p.username) : 'anonymous';
          return `
        <div class="paste-item ${p.id === activeId ? 'active' : ''}" data-id="${escapeAttr(p.id)}">
          <div class="paste-item-body">
            <div class="paste-item-title">${escapeHtml(p.title || 'Untitled')}</div>
            <div class="paste-item-meta">${uname} · ★ ${stars} · ${views} view${views !== 1 ? 's' : ''} · ${escapeHtml(formatDate(p.updatedAt || p.createdAt))}</div>
          </div>
        </div>
      `;
        }
        const exp = p.exposure === 2 ? ' 🔒' : (p.exposure === 1 ? ' 🔗' : '');
        const pin = p.pinned ? ' 📌' : '';
        const fav = p.favorite ? ' ★' : '';
        const arch = p.archived ? ' 📦' : '';
        const views = (p.views || 0);
        return `
        <div class="paste-item ${p.id === activeId ? 'active' : ''}" data-id="${escapeAttr(p.id)}">
          <label class="paste-item-check"><input type="checkbox" class="paste-select-cb" data-id="${escapeAttr(p.id)}" /></label>
          <div class="paste-item-body">
            <div class="paste-item-title">${escapeHtml(p.title || 'Untitled')}${fav}${pin}${arch}${exp}</div>
            <div class="paste-item-meta">${p.folder ? escapeHtml(p.folder) + ' · ' : ''}${views} view${views !== 1 ? 's' : ''} · ${escapeHtml(formatDate(p.updatedAt || p.createdAt))}</div>
          </div>
        </div>
      `;
      }).join('');

  pasteList.querySelectorAll('.paste-item[data-id]').forEach(el => {
    const body = el.querySelector('.paste-item-body');
    const id = el.dataset.id;
    (body || el).addEventListener('click', () => {
      if (isEveryonePublic) selectPublicPaste(id);
      else selectPaste(id);
    });
    const cb = el.querySelector('.paste-select-cb');
    if (cb) cb.addEventListener('click', e => e.stopPropagation());
  });
  pasteList.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('paste-select-cb')) updateBulkBar();
  });
  updateStats();
  updateTagsDatalist();
}

function getSelectedPasteIds() {
  return Array.from(document.querySelectorAll('.paste-select-cb:checked')).map(cb => cb.dataset.id).filter(Boolean);
}
function updateBulkBar() {
  const ids = getSelectedPasteIds();
  const bar = document.getElementById('bulk-bar');
  const countEl = document.getElementById('bulk-count');
  if (!bar || !countEl) return;
  if (ids.length === 0) { bar.classList.add('hidden'); return; }
  countEl.textContent = ids.length + ' selected';
  bar.classList.remove('hidden');
}

function updateTagsDatalist() {
  const dl = document.getElementById('paste-tags-datalist');
  if (!dl) return;
  const tags = new Set();
  data.pastes.forEach(p => {
    (Array.isArray(p.tags) ? p.tags : []).forEach(t => { if (t && String(t).trim()) tags.add(String(t).trim()); });
  });
  dl.innerHTML = Array.from(tags).sort().slice(0, 100).map(t => `<option value="${escapeAttr(t)}">`).join('');
}

function updateStats() {
  const el = document.getElementById('stats-text');
  if (!el) return;
  const list = data.pastes.filter(p => !isPasteExpired(p));
  const totalChars = list.reduce((s, p) => s + (p.content || '').length, 0);
  el.textContent = `${list.length} paste${list.length !== 1 ? 's' : ''} · ${(totalChars / 1000).toFixed(1)}k chars`;
}

// --- Editor
function showEmpty() {
  editorEmpty.classList.remove('hidden');
  editorWrap.classList.add('hidden');
  passwordPrompt.classList.add('hidden');
  document.getElementById('public-comments')?.classList.add('hidden');
  currentPasteId = null;
}

function showEditor() {
  editorEmpty.classList.add('hidden');
  editorWrap.classList.remove('hidden');
  passwordPrompt.classList.add('hidden');
}

function showPasswordPrompt() {
  editorEmpty.classList.add('hidden');
  editorWrap.classList.add('hidden');
  passwordPrompt.classList.remove('hidden');
  passwordInput.value = '';
  passwordInput.focus();
}

function refreshFolderSelect() {
  const val = (currentPasteId && data.pastes.find(x => x.id === currentPasteId)) ? (data.pastes.find(x => x.id === currentPasteId).folder || '') : '';
  pasteFolderSelect.innerHTML = '<option value="">No folder</option>' +
    data.folders.map(f => `<option value="${escapeAttr(f)}" ${f === val ? 'selected' : ''}>${escapeHtml(f)}</option>`).join('');
}

function incrementViews(paste) {
  if (!paste) return;
  paste.views = (paste.views || 0) + 1;
  saveData(data);
  if (pasteViewsEl) pasteViewsEl.textContent = paste.views + ' view' + (paste.views !== 1 ? 's' : '');
}

function clearViewingPublicPaste() {
  if (!viewingPublicPaste) return;
  viewingPublicPaste = null;
  pasteContent.readOnly = false;
  const slugInput = document.getElementById('paste-custom-id');
  if (slugInput) slugInput.readOnly = false;
  const banner = document.getElementById('public-paste-banner');
  if (banner) banner.classList.add('hidden');
  document.getElementById('public-comments')?.classList.add('hidden');
  ['save-paste', 'delete-paste'].forEach(id => { const b = document.getElementById(id); if (b) b.style.display = ''; });
  renderPasteList();
}
function selectPaste(id, skipPasswordCheck) {
  clearViewingPublicPaste();
  let p = data.pastes.find(x => x.id === id);
  if (!p) return;
  if (isPasteExpired(p)) {
    data.pastes = data.pastes.filter(x => x.id !== id);
    saveData(data);
    renderPasteList();
    if (currentPasteId === id) showEmpty();
    currentPasteId = null;
    return;
  }
  if (!skipPasswordCheck && p.password) {
    currentPasteId = id;
    showPasswordPrompt();
    passwordSubmit.onclick = () => {
      if (passwordInput.value === p.password) {
        selectPaste(id, true);
      } else {
        alert('Wrong password.');
      }
    };
    passwordInput.onkeydown = (e) => { if (e.key === 'Enter') passwordSubmit.click(); };
    return;
  }
  currentPasteId = id;
  p = data.pastes.find(x => x.id === id);
  if (!p) return;
  if (user) {
    fetch(location.origin + '/api/pastes/' + encodeURIComponent(id), { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(full => {
      if (full && currentPasteId === id) {
        Object.assign(p, normalizePaste(full));
        const tabsWrap = document.getElementById('paste-files-tabs');
        if (tabsWrap && Array.isArray(p.files) && p.files.length > 0) {
          tabsWrap.classList.remove('hidden');
          tabsWrap.innerHTML = '<button type="button" class="paste-file-tab active" data-index="0">Main</button>' + p.files.map((f, i) => '<button type="button" class="paste-file-tab" data-index="' + (i + 1) + '">' + escapeHtml(f.filename || 'file') + '</button>').join('');
          tabsWrap.querySelectorAll('.paste-file-tab').forEach(btn => btn.addEventListener('click', () => switchPasteFileTab(parseInt(btn.dataset.index, 10))));
        }
      }
    }).catch(() => {});
  }
  incrementViews(p);
  pasteTitle.value = p.title || '';
  const slugInput = document.getElementById('paste-custom-id');
  if (slugInput) slugInput.value = p.id || '';
  pasteContent.value = p.content || '';
  pasteLanguage.value = p.language || 'none';
  pasteFolderSelect.value = p.folder || '';
  pasteCategorySelect.value = p.category || '';
  pasteExpirationSelect.value = p.expiration || 'N';
  pasteExposureSelect.value = String(p.exposure ?? 0);
  pastePasswordInput.value = p.password || '';
  pasteBurnCheckbox.checked = !!p.burnAfterRead;
  if (pasteBurnViewsSelect) pasteBurnViewsSelect.value = String(p.burnAfterViews ?? 0);
  pasteTagsInput.value = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
  pasteViewsEl.textContent = (p.views || 0) + ' view' + ((p.views || 0) !== 1 ? 's' : '');
  pasteCreatedEl.textContent = 'Created: ' + formatDate(p.createdAt);
  const forkedEl = document.getElementById('paste-forked');
  if (forkedEl) {
    if (p.forkedFromId) {
      const title = p.forkedFromTitle || p.forked_from_title || 'paste';
      forkedEl.innerHTML = 'Fork of: <a href="?p=' + encodeURIComponent(p.forkedFromId) + '" class="paste-forked-link">' + escapeHtml(title) + '</a>';
      forkedEl.classList.remove('hidden');
    } else {
      forkedEl.textContent = '';
      forkedEl.classList.add('hidden');
    }
  }
  updatePasteStats();
  document.getElementById('pin-paste').textContent = p.pinned ? '★ Pinned' : '☆ Pin';
  document.getElementById('pin-paste').dataset.pinned = p.pinned ? '1' : '';
  refreshFolderSelect();
  showEditor();
  pushRecentView(id);
  renderPasteList();
  currentFileTab = 0;
  const tabsWrap = document.getElementById('paste-files-tabs');
  if (tabsWrap) {
    const files = Array.isArray(p.files) ? p.files : [];
    if (files.length > 0) {
      tabsWrap.classList.remove('hidden');
      tabsWrap.innerHTML = '<button type="button" class="paste-file-tab active" data-index="0">Main</button>' + files.map((f, i) => '<button type="button" class="paste-file-tab" data-index="' + (i + 1) + '">' + escapeHtml(f.filename || 'file') + '</button>').join('');
      tabsWrap.querySelectorAll('.paste-file-tab').forEach(btn => btn.addEventListener('click', () => switchPasteFileTab(parseInt(btn.dataset.index, 10))));
    } else {
      tabsWrap.classList.add('hidden');
    }
  }
  updateHighlight();
  updateRawMode();
  updateMarkdownPreviewVisibility();
  if (optMarkdownPreview && optMarkdownPreview.checked) setMarkdownPreviewMode(true);
  pasteContent.readOnly = false;
  if (slugInput) slugInput.readOnly = false;
  pasteContent.focus();
  document.getElementById('public-comments')?.classList.toggle('hidden', (p.exposure ?? 0) !== 0);
  if ((p.exposure ?? 0) === 0) loadComments(p.id);
  loadReplies(id);

  // Burn after read: after viewing, delete on next action or when leaving
  if (p.burnAfterRead) {
    const burn = () => {
      data.pastes = data.pastes.filter(x => x.id !== id);
      saveData(data);
      currentPasteId = null;
      showEmpty();
      renderPasteList();
    };
    const once = () => {
      burn();
      pasteContent.removeEventListener('blur', once);
    };
    pasteContent.addEventListener('blur', once, { once: true });
  }
}

async function selectPublicPaste(id) {
  try {
    const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(id), { credentials: 'include' });
    if (!res.ok) { showToast('Could not load paste', 'error'); return; }
    const p = await res.json();
    viewingPublicPaste = p;
    currentPasteId = null;
    pasteTitle.value = p.title || '';
    const slugInput = document.getElementById('paste-custom-id');
    if (slugInput) slugInput.value = p.id || '';
    pasteContent.value = p.content || '';
    pasteLanguage.value = p.language || 'none';
    pasteFolderSelect.value = p.folder || '';
    pasteCategorySelect.value = p.category || '';
    pasteExpirationSelect.value = p.expiration || 'N';
    pasteExposureSelect.value = String(p.exposure ?? 0);
    pastePasswordInput.value = '';
    pasteBurnCheckbox.checked = !!p.burnAfterRead;
    if (pasteBurnViewsSelect) pasteBurnViewsSelect.value = '0';
    pasteTagsInput.value = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
    pasteViewsEl.textContent = (p.views || 0) + ' view' + ((p.views || 0) !== 1 ? 's' : '');
    pasteCreatedEl.textContent = 'Created: ' + formatDate(p.createdAt);
    const forkedElPub = document.getElementById('paste-forked');
    if (forkedElPub) { forkedElPub.textContent = ''; forkedElPub.classList.add('hidden'); }
    updatePasteStats();
    document.getElementById('pin-paste').textContent = '☆ Pin';
    document.getElementById('pin-paste').dataset.pinned = '';
    refreshFolderSelect();
    pasteContent.readOnly = true;
    if (slugInput) slugInput.readOnly = true;
    document.getElementById('public-paste-username').textContent = (p.username || '').trim() ? '@' + p.username : 'anonymous';
    document.getElementById('public-paste-stars').textContent = String(p.stars || 0);
    const starBtn = document.getElementById('public-paste-star');
    if (starBtn) starBtn.innerHTML = (p.starred ? '★ Star' : '☆ Star') + ' (<span id="public-paste-stars">' + (p.stars || 0) + '</span>)';
    document.getElementById('public-paste-banner').classList.remove('hidden');
    ['save-paste', 'delete-paste'].forEach(bid => { const b = document.getElementById(bid); if (b) b.style.display = 'none'; });
    document.getElementById('public-comments')?.classList.remove('hidden');
    loadComments(id);
    loadReplies(id);
    const tabsWrapPub = document.getElementById('paste-files-tabs');
    if (tabsWrapPub) {
      const files = Array.isArray(p.files) ? p.files : [];
      if (files.length > 0) {
        tabsWrapPub.classList.remove('hidden');
        tabsWrapPub.innerHTML = '<button type="button" class="paste-file-tab active" data-index="0">Main</button>' + files.map((f, i) => '<button type="button" class="paste-file-tab" data-index="' + (i + 1) + '">' + escapeHtml(f.filename || 'file') + '</button>').join('');
        tabsWrapPub.querySelectorAll('.paste-file-tab').forEach(btn => btn.addEventListener('click', () => {
          currentFileTab = parseInt(btn.dataset.index, 10);
          if (currentFileTab === 0) { pasteContent.value = p.content || ''; pasteLanguage.value = p.language || 'none'; }
          else if (p.files[currentFileTab - 1]) { pasteContent.value = p.files[currentFileTab - 1].content || ''; pasteLanguage.value = p.files[currentFileTab - 1].language || 'none'; }
          tabsWrapPub.querySelectorAll('.paste-file-tab').forEach((t, i) => t.classList.toggle('active', i === currentFileTab));
          updateHighlight();
        }));
      } else tabsWrapPub.classList.add('hidden');
    }
    showEditor();
    updateHighlight();
    updateRawMode();
    updateMarkdownPreviewVisibility();
    if (optMarkdownPreview && optMarkdownPreview.checked) setMarkdownPreviewMode(true);
    renderPasteList();
  } catch (e) {
    showToast('Failed to load paste', 'error');
  }
}

async function loadComments(pasteId) {
  if (!pasteId) return;
  commentPasteId = pasteId;
  const listEl = document.getElementById('public-comments-list');
  if (!listEl) return;
  try {
    const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(pasteId) + '/comments', { credentials: 'include' });
    if (!res.ok) { listEl.innerHTML = '<li>No comments yet.</li>'; return; }
    const json = await res.json();
    const arr = json.comments || [];
    listEl.innerHTML = arr.length
      ? arr.map(c => `<li><div class="meta">@${escapeHtml(c.username || 'user')} · ${escapeHtml(formatDate(c.createdAt))}</div><div>${escapeHtml(c.content || '')}</div></li>`).join('')
      : '<li>No comments yet.</li>';
  } catch (_) {
    listEl.innerHTML = '<li>Could not load comments.</li>';
  }
}

async function loadReplies(pasteId) {
  const wrap = document.getElementById('paste-replies');
  const listEl = document.getElementById('paste-replies-list');
  const replyBtn = document.getElementById('paste-reply-btn');
  if (!wrap || !listEl) return;
  if (!pasteId) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  if (replyBtn) replyBtn.onclick = () => { const id = currentPasteId || (viewingPublicPaste && viewingPublicPaste.id); if (id) newPaste(id); };
  try {
    const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(pasteId) + '/replies', { credentials: 'include' });
    if (!res.ok) { listEl.innerHTML = '<li>No replies.</li>'; return; }
    const json = await res.json();
    const arr = json.replies || [];
    listEl.innerHTML = arr.length
      ? arr.map(r => `<li><a href="?p=${encodeURIComponent(r.id)}" class="paste-reply-link">${escapeHtml(r.title || 'Reply')}</a> · @${escapeHtml(r.username || '')} · ${escapeHtml(formatDate(r.createdAt))}</li>`).join('')
      : '<li>No replies yet.</li>';
  } catch (_) {
    listEl.innerHTML = '<li>Could not load replies.</li>';
  }
}

let bracketMatchOffsets = null; // [openIdx, closeIdx] or null

function findMatchingBracket(text, offset) {
  const open = '([{';
  const close = ')]}';
  const c = text[offset];
  const openIdx = open.indexOf(c);
  const closeIdx = close.indexOf(c);
  if (openIdx >= 0) {
    let depth = 1;
    for (let i = offset + 1; i < text.length; i++) {
      if (text[i] === open[openIdx]) depth++;
      else if (text[i] === close[openIdx]) { depth--; if (depth === 0) return [offset, i]; }
    }
    return null;
  }
  if (closeIdx >= 0) {
    let depth = 1;
    for (let i = offset - 1; i >= 0; i--) {
      if (text[i] === close[closeIdx]) depth++;
      else if (text[i] === open[closeIdx]) { depth--; if (depth === 0) return [i, offset]; }
    }
    return null;
  }
  return null;
}

function wrapBracketMatchesInHighlight(openPos, closePos) {
  if (!highlightCode || openPos === closePos) return;
  const el = highlightCode;
  const text = (el.textContent || '');
  if (openPos < 0 || closePos < 0 || openPos >= text.length || closePos >= text.length) return;
  const positions = [openPos, closePos];
  const targets = [];
  const walk = (node, baseOffset) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      for (const pos of positions) {
        if (pos >= baseOffset && pos < baseOffset + len) {
          targets.push({ node, offsetInNode: pos - baseOffset, globalOffset: pos });
        }
      }
      return baseOffset + len;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      let off = baseOffset;
      for (const child of node.childNodes) off = walk(child, off);
      return off;
    }
    return baseOffset;
  };
  walk(el, 0);
  targets.sort((a, b) => b.globalOffset - a.globalOffset);
  for (const { node, offsetInNode } of targets) {
    if (!node.parentNode) continue;
    const t = node.textContent || '';
    if (offsetInNode < 0 || offsetInNode >= t.length) continue;
    const before = t.slice(0, offsetInNode);
    const char = t.slice(offsetInNode, offsetInNode + 1);
    const after = t.slice(offsetInNode + 1);
    const parent = node.parentNode;
    if (before) parent.insertBefore(document.createTextNode(before), node);
    const span = document.createElement('span');
    span.className = 'bracket-match';
    span.textContent = char;
    parent.insertBefore(span, node);
    if (after) parent.insertBefore(document.createTextNode(after), node);
    parent.removeChild(node);
  }
}

function applyBracketMatch() {
  if (!highlightCode) return;
  const existing = highlightCode.querySelectorAll('.bracket-match');
  existing.forEach(span => { const t = span.textContent; if (span.parentNode) { const text = document.createTextNode(t); span.parentNode.replaceChild(text, span); } });
  if (bracketMatchOffsets && bracketMatchOffsets.length === 2) {
    wrapBracketMatchesInHighlight(bracketMatchOffsets[0], bracketMatchOffsets[1]);
  }
}

function updateHighlight() {
  if (!highlightCode || !highlightWrap) return;
  if (rawMode) {
    highlightWrap.classList.add('hidden');
    pasteContent.classList.remove('transparent-overlay');
    pasteContent.style.color = 'var(--text)';
    return;
  }
  pasteContent.classList.add('transparent-overlay');
  pasteContent.style.color = '';
  highlightWrap.classList.remove('hidden');
  let lang = pasteLanguage.value;
  const content = pasteContent.value;
  if (lang === 'auto') lang = detectLanguageFromText(content);
  highlightCode.textContent = content || ' ';
  highlightCode.className = lang && lang !== 'none' ? `language-${lang}` : '';
  if (window.Prism && lang && lang !== 'none') {
    try {
      Prism.highlightElement(highlightCode);
    } catch (err) {
      console.warn('Prism highlight failed:', err);
    }
  }
  applyBracketMatch();
}

function updateRawMode() {
  rawMode = rawToggle.checked;
  pasteContent.style.color = rawMode ? 'var(--text)' : '';
  if (rawMode) {
    highlightWrap.classList.add('hidden');
    pasteContent.classList.remove('transparent-overlay');
  } else {
    pasteContent.classList.add('transparent-overlay');
    highlightWrap.classList.remove('hidden');
    updateHighlight();
  }
}

let markdownPreviewTimer = null;
function renderMarkdownPreview() {
  if (!markdownPreviewEl) return;
  const text = pasteContent.value || '';
  let html = '';
  if (typeof marked !== 'undefined') {
    try {
      marked.setOptions({ gfm: true, breaks: true });
      html = marked.parse(text);
    } catch (_) {}
  }
  if (!html && text) html = '<p>' + escapeHtml(text).replace(/\n/g, '</p><p>') + '</p>';
  if (typeof DOMPurify !== 'undefined') {
    html = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'strong', 'em', 'b', 'i', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  }
  markdownPreviewEl.innerHTML = html || '<p class="dim">Nothing to preview.</p>';
}

function setMarkdownPreviewMode(on) {
  if (!markdownPreviewEl || !pasteContent || !highlightWrap) return;
  if (on) {
    pasteContent.classList.add('hidden');
    highlightWrap.classList.add('hidden');
    markdownPreviewEl.classList.remove('hidden');
    renderMarkdownPreview();
  } else {
    pasteContent.classList.remove('hidden');
    highlightWrap.classList.remove('hidden');
    markdownPreviewEl.classList.add('hidden');
  }
}

function updateMarkdownPreviewVisibility() {
  const isMd = pasteLanguage && pasteLanguage.value === 'markdown';
  if (markdownPreviewOpt) markdownPreviewOpt.classList.toggle('hidden', !isMd);
  if (!isMd && optMarkdownPreview && optMarkdownPreview.checked) {
    optMarkdownPreview.checked = false;
    setMarkdownPreviewMode(false);
  }
}

function syncScroll() {
  highlightWrap.scrollTop = pasteContent.scrollTop;
  highlightWrap.scrollLeft = pasteContent.scrollLeft;
}

pasteContent.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = pasteContent.selectionStart;
    const end = pasteContent.selectionEnd;
    const tab = '    ';
    const before = pasteContent.value.slice(0, start);
    const after = pasteContent.value.slice(end);
    pasteContent.value = before + tab + after;
    pasteContent.selectionStart = pasteContent.selectionEnd = start + tab.length;
    updateHighlight();
    syncScroll();
  }
});
pasteContent.addEventListener('input', () => {
  bracketMatchOffsets = null;
  updateHighlight();
  syncScroll();
});
pasteContent.addEventListener('scroll', syncScroll);
function updateBracketMatch() {
  const content = pasteContent.value || '';
  const pos = pasteContent.selectionStart;
  if (pos >= 0 && pos < content.length) {
    const pair = findMatchingBracket(content, pos);
    bracketMatchOffsets = pair;
  } else bracketMatchOffsets = null;
  applyBracketMatch();
}

function syncCurrentTabToPaste() {
  if (!currentPasteId || viewingPublicPaste) return;
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  if (currentFileTab === 0) p.content = pasteContent.value;
  else if (Array.isArray(p.files) && p.files[currentFileTab - 1]) p.files[currentFileTab - 1].content = pasteContent.value;
}

function switchPasteFileTab(index) {
  syncCurrentTabToPaste();
  currentFileTab = index;
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  if (index === 0) {
    pasteContent.value = p.content || '';
    pasteLanguage.value = p.language || 'none';
  } else if (Array.isArray(p.files) && p.files[index - 1]) {
    const f = p.files[index - 1];
    pasteContent.value = f.content || '';
    pasteLanguage.value = f.language || 'none';
  }
  document.querySelectorAll('#paste-files-tabs .paste-file-tab').forEach((tab, i) => tab.classList.toggle('active', i === index));
  updateHighlight();
  updatePasteStats();
}
pasteContent.addEventListener('keyup', updateBracketMatch);
pasteContent.addEventListener('click', updateBracketMatch);
pasteLanguage.addEventListener('change', () => {
  setLocal('woxbin_default_language', pasteLanguage.value || 'none');
  updateHighlight();
  updateMarkdownPreviewVisibility();
});
rawToggle.addEventListener('change', updateRawMode);
if (optMarkdownPreview) {
  optMarkdownPreview.addEventListener('change', () => setMarkdownPreviewMode(optMarkdownPreview.checked));
}
if (pasteContent) {
  pasteContent.addEventListener('input', () => {
    if (markdownPreviewTimer) clearTimeout(markdownPreviewTimer);
    if (optMarkdownPreview && optMarkdownPreview.checked && markdownPreviewEl && !markdownPreviewEl.classList.contains('hidden')) {
      markdownPreviewTimer = setTimeout(renderMarkdownPreview, 250);
    }
  });
}

pasteFolderSelect.addEventListener('change', () => { setLocal('woxbin_default_folder', pasteFolderSelect.value || ''); saveCurrent(); });

// --- Save / Delete
async function saveCurrent() {
  if (viewingPublicPaste || !currentPasteId) return;
  syncCurrentTabToPaste();
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  const slugInput = document.getElementById('paste-custom-id');
  const desiredIdRaw = (slugInput && slugInput.value ? slugInput.value.trim() : p.id) || p.id;
  const desiredId = desiredIdRaw.toLowerCase();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(desiredId)) {
    showToast('Custom link id must be 1-64 chars (letters, numbers, _ and -)', 'error');
    return;
  }
  const newContent = pasteContent.value;
  const duplicate = data.pastes.find(x => x.id !== currentPasteId && (x.content || '') === newContent && !isPasteExpired(x));
  if (duplicate && !confirm('Another paste has the same content: "' + (duplicate.title || 'Untitled') + '". Save anyway?')) return;
  if (p.content !== newContent && (p.content || '').length > 0) {
    p.versions = p.versions || [];
    p.versions.unshift({ content: p.content, at: Date.now() });
    if (p.versions.length > MAX_VERSIONS) p.versions.length = MAX_VERSIONS;
  }
  p.title = pasteTitle.value.trim() || 'Untitled';
  p.content = pasteContent.value;
  p.language = pasteLanguage.value;
  p.folder = pasteFolderSelect.value || null;
  p.category = pasteCategorySelect.value || null;
  p.expiration = pasteExpirationSelect.value || 'N';
  p.exposure = parseInt(pasteExposureSelect.value, 10) || 0;
  p.password = pastePasswordInput.value.trim() || null;
  p.burnAfterRead = pasteBurnCheckbox.checked;
  p.burnAfterViews = pasteBurnViewsSelect ? (parseInt(pasteBurnViewsSelect.value, 10) || 0) : 0;
  p.pinned = !!document.getElementById('pin-paste').dataset.pinned;
  const tagsStr = pasteTagsInput.value.trim();
  p.tags = tagsStr ? tagsStr.split(/\s*,\s*/).filter(Boolean) : [];
  p.updatedAt = Date.now();
  const changingId = desiredId !== p.id;
  if (user) {
    try {
      if (changingId) {
        const clone = { ...p, id: desiredId };
        await api('/api/pastes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(clone)) });
        await api('/api/pastes/' + p.id, { method: 'DELETE' });
        p.id = desiredId;
        currentPasteId = desiredId;
      } else {
        await api('/api/pastes/' + p.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(p)) });
      }
    } catch (e) {
      alert('Failed to save: ' + (e.body && e.body.error || e.status));
    }
  } else {
    if (p.fromAnonymousServer) {
      saveData(data);
    } else {
      try {
        const payload = pasteToApi(p);
        delete payload.id;
        const created = await api('/api/public/pastes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const newPaste = { ...normalizePaste(created), fromAnonymousServer: true };
        if (created && created.claimToken) {
          newPaste.anonymousClaimToken = created.claimToken;
          const claims = loadAnonClaims();
          claims.push({ id: created.id, token: created.claimToken, createdAt: Date.now() });
          saveAnonClaims(claims);
        }
        data.pastes = data.pastes.filter(x => x.id !== p.id);
        data.pastes.unshift(newPaste);
        currentPasteId = created.id;
        saveData(data);
        const shareUrl = location.origin + (location.pathname || '/') + '?p=' + encodeURIComponent(created.id);
        showToast('Saved anonymously. Share: ' + shareUrl, 'success');
      } catch (e) {
        if (changingId) {
          if (data.pastes.some(x => x.id === desiredId && x !== p)) {
            showToast('That custom link id is already used', 'error');
            return;
          }
          p.id = desiredId;
          currentPasteId = desiredId;
        }
        saveData(data);
        showToast(e.status === 429 ? 'Too many pastes. Try again later.' : 'Saved locally only. Sign in to sync to server.', e.status === 429 ? 'error' : '');
      }
    }
  }
  refreshFolderSelect();
  renderPasteList();
}

async function deleteCurrent() {
  if (viewingPublicPaste || !currentPasteId) return;
  if (!confirm('Delete this paste?')) return;
  const id = currentPasteId;
  if (user) {
    try {
      await api('/api/pastes/' + id, { method: 'DELETE' });
    } catch (e) {
      alert('Failed to delete');
      return;
    }
  }
  data.pastes = data.pastes.filter(p => p.id !== id);
  saveData(data);
  currentPasteId = null;
  pasteTitle.value = '';
  pasteContent.value = '';
  showEmpty();
  renderPasteList();
}

// --- New paste (optional replyToId = paste id this is a reply to)
async function newPaste(replyToId) {
  const defaultFolder = getLocal('woxbin_default_folder') || (currentFolder && currentFolder !== FOLDER_PUBLIC ? currentFolder : null);
  const defaultLang = getLocal('woxbin_default_language') || 'none';
  const parent = replyToId ? (data.pastes.find(p => p.id === replyToId) || viewingPublicPaste) : null;
  const paste = {
    id: generateId(),
    title: replyToId ? ('Reply to: ' + (parent && (parent.title || parent.id)) || 'paste') : 'Untitled',
    content: '',
    language: defaultLang,
    folder: defaultFolder || null,
    category: '',
    expiration: 'N',
    exposure: 0,
    password: null,
    burnAfterRead: false,
    burnAfterViews: 0,
    tags: [],
    views: 0,
    pinned: false,
    favorite: false,
    archived: false,
    template: false,
    versions: [],
    forkedFromId: null,
    replyToId: replyToId || null,
    files: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  if (user) {
    try {
      const created = await api('/api/pastes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(paste)) });
      data.pastes.unshift(normalizePaste(created));
      currentPasteId = created.id;
    } catch (e) {
      alert('Failed to create: ' + (e.body && e.body.error || e.status));
      return;
    }
  } else {
    data.pastes.unshift(paste);
    saveData(data);
    currentPasteId = paste.id;
  }
  pasteTitle.value = 'Untitled';
  const slugInput = document.getElementById('paste-custom-id');
  if (slugInput) slugInput.value = currentPasteId || '';
  pasteContent.value = '';
  pasteLanguage.value = 'none';
  pasteFolderSelect.value = folder || '';
  pasteCategorySelect.value = '';
  pasteExpirationSelect.value = 'N';
  pasteExposureSelect.value = '0';
  pastePasswordInput.value = '';
  pasteBurnCheckbox.checked = false;
  if (pasteBurnViewsSelect) pasteBurnViewsSelect.value = '0';
  pasteTagsInput.value = '';
  document.getElementById('pin-paste').textContent = '☆ Pin';
  document.getElementById('pin-paste').dataset.pinned = '';
  refreshFolderSelect();
  pasteViewsEl.textContent = '0 views';
  const p = data.pastes.find(x => x.id === currentPasteId);
  pasteCreatedEl.textContent = 'Created: ' + formatDate(p && p.createdAt);
  updatePasteStats();
  showEditor();
  renderPasteList();
  updateHighlight();
  updateRawMode();
  pasteTitle.focus();
}

function updatePasteStats() {
  if (!pasteStatsEl) return;
  const text = pasteContent.value || '';
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  pasteStatsEl.textContent = chars + ' char' + (chars !== 1 ? 's' : '') + ' · ' + words + ' word' + (words !== 1 ? 's' : '');
}

function duplicatePaste(asFork) {
  if (!currentPasteId) return;
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  const copy = {
    id: generateId(),
    title: (asFork ? 'Fork of: ' : '') + (p.title || 'Untitled') + (asFork ? '' : ' (copy)'),
    content: p.content || '',
    language: p.language || 'none',
    folder: p.folder,
    category: p.category || '',
    expiration: 'N',
    exposure: 0,
    password: null,
    burnAfterRead: false,
    burnAfterViews: 0,
    tags: [...(Array.isArray(p.tags) ? p.tags : [])],
    views: 0,
    pinned: false,
    favorite: false,
    archived: false,
    template: false,
    versions: [],
    forkedFromId: asFork ? p.id : null,
    forkedFromTitle: asFork ? (p.title || 'Untitled') : null,
    replyToId: null,
    files: Array.isArray(p.files) ? p.files.map(f => ({ ...f })) : [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  data.pastes.unshift(copy);
  saveData(data);
  currentPasteId = copy.id;
  selectPaste(copy.id);
  if (asFork) showToast('Fork created. Save to sync to server.', 'success');
}

function downloadPaste() {
  if (!currentPasteId) return;
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  const fmt = (document.getElementById('download-format') && document.getElementById('download-format').value) || 'txt';
  const name = (p.title || 'paste').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80);
  let content = p.content || '';
  let mime = 'text/plain';
  let ext = '.txt';
  if (fmt === 'md') { ext = '.md'; mime = 'text/markdown'; }
  if (fmt === 'html') { ext = '.html'; mime = 'text/html'; content = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(p.title || '') + '</title></head><body><pre>' + escapeHtml(content) + '</pre></body></html>'; }
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + ext; a.click(); URL.revokeObjectURL(a.href);
}

async function togglePin() {
  if (!currentPasteId) return;
  const p = data.pastes.find(x => x.id === currentPasteId);
  if (!p) return;
  p.pinned = !p.pinned;
  document.getElementById('pin-paste').textContent = p.pinned ? '★ Pinned' : '☆ Pin';
  document.getElementById('pin-paste').dataset.pinned = p.pinned ? '1' : '';
  if (user) await saveCurrent();
  else { saveData(data); renderPasteList(); }
}

function exportAll() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), pastes: data.pastes, folders: data.folders };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'woxbin-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const pastes = payload.pastes || [];
      const folders = payload.folders || [];
      if (pastes.length) {
        const existingIds = new Set(data.pastes.map(p => p.id));
        pastes.forEach(p => {
          if (!existingIds.has(p.id)) {
            data.pastes.push({ ...p, id: p.id || generateId() });
            existingIds.add(p.id);
          }
        });
      }
      if (folders.length) {
        folders.forEach(f => {
          if (typeof f === 'string' && !data.folders.includes(f)) data.folders.push(f);
        });
        data.folders.sort();
      }
      saveData(data);
      initFolders();
      renderPasteList();
      alert('Imported ' + (payload.pastes || []).length + ' paste(s).');
    } catch (e) {
      alert('Invalid backup file.');
    }
  };
  reader.readAsText(file);
}

const PRISM_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/';
function getEffectiveThemeLight() {
  const saved = (themeSelect && themeSelect.value) || getLocal('woxbin_theme') || 'dark';
  if (saved === 'system') return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches;
  return saved === 'light';
}
function applyTheme(light) {
  const highContrast = themeSelect && themeSelect.value === 'highcontrast';
  document.body.classList.toggle('theme-light', light && !highContrast);
  document.body.classList.toggle('theme-highcontrast', highContrast);
  const link = document.getElementById('prism-theme');
  if (link) link.href = light && !highContrast ? PRISM_BASE + 'prism.min.css' : PRISM_BASE + 'prism-tomorrow.min.css';
  if (currentPasteId) updateHighlight();
}
function applyThemeFromPreference() {
  const light = getEffectiveThemeLight();
  applyTheme(light);
}

function updateHeaderNavActive() {
  const myBtn = document.getElementById('nav-my-pastes');
  const publicBtn = document.getElementById('nav-public-pastes');
  const isPublic = currentFolder === FOLDER_EVERYONE_PUBLIC;
  if (myBtn) myBtn.classList.toggle('active', !isPublic);
  if (publicBtn) publicBtn.classList.toggle('active', isPublic);
}

// --- Folders
async function setFolder(folder) {
  if (currentFolder === folder) return;
  if (currentFolder === FOLDER_EVERYONE_PUBLIC || folder === FOLDER_EVERYONE_PUBLIC) clearViewingPublicPaste();
  currentFolder = folder || '';
  updateHeaderNavActive();
  document.querySelectorAll('.folder-btn').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.folder || '') === currentFolder);
  });
  if (currentFolder === FOLDER_EVERYONE_PUBLIC && (location.protocol === 'http:' || location.protocol === 'https:')) {
    try {
      const res = await fetch(location.origin + '/api/pastes/public?sort=' + encodeURIComponent(sortOrder || 'newest'), { credentials: 'include' });
      const json = await res.json();
      publicFeedPastes = json.pastes || [];
    } catch (_) {
      publicFeedPastes = [];
      showToast('Could not load public pastes', 'error');
    }
  }
  renderPasteList();
}

document.getElementById('nav-my-pastes')?.addEventListener('click', () => setFolder(''));
document.getElementById('nav-public-pastes')?.addEventListener('click', () => setFolder(FOLDER_EVERYONE_PUBLIC));

async function addFolder() {
  const name = newFolderName.value.trim();
  if (!name || data.folders.includes(name)) return;
  data.folders.push(name);
  data.folders.sort();
  if (user) {
    try {
      await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folders: data.folders }) });
    } catch (_) {}
  } else {
    saveData(data);
  }
  newFolderName.value = '';
  initFolders();
}

async function deleteFolder(name) {
  if (!name || name === FOLDER_PUBLIC || name === FOLDER_EVERYONE_PUBLIC) return;
  if (!data.folders.includes(name)) return;
  if (!confirm('Delete folder "' + name + '"? Pastes in this folder will be moved to "No folder".')) return;
  data.folders = data.folders.filter(f => f !== name);
  const affected = data.pastes.filter(p => (p.folder || '') === name);
  affected.forEach(p => { p.folder = null; });
  if (user) {
    try {
      await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folders: data.folders }) });
      for (const p of affected) {
        try {
          await api('/api/pastes/' + encodeURIComponent(p.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(p)) });
        } catch (_) {}
      }
    } catch (_) {
      showToast('Failed to sync folder delete', 'error');
    }
  } else {
    saveData(data);
  }
  if (currentFolder === name) setFolder('');
  refreshFolderSelect();
  initFolders();
  renderPasteList();
  if (currentPasteId) {
    const p = data.pastes.find(x => x.id === currentPasteId);
    if (p) { pasteFolderSelect.value = p.folder || ''; }
  }
}

async function renameFolder(name) {
  if (!name || name === FOLDER_PUBLIC || name === FOLDER_EVERYONE_PUBLIC) return;
  if (!data.folders.includes(name)) return;
  const next = prompt('Rename folder:', name);
  if (!next) return;
  const newName = next.trim();
  if (!newName || newName === name) return;
  if (data.folders.includes(newName)) {
    showToast('Folder already exists', 'error');
    return;
  }
  data.folders = data.folders.map(f => f === name ? newName : f);
  data.folders.sort();
  const affected = data.pastes.filter(p => (p.folder || '') === name);
  affected.forEach(p => { p.folder = newName; p.updatedAt = Date.now(); });
  if (user) {
    try {
      await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folders: data.folders }) });
      for (const p of affected) {
        try {
          await api('/api/pastes/' + encodeURIComponent(p.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(p)) });
        } catch (_) {}
      }
    } catch (_) {
      showToast('Failed to sync folder rename', 'error');
    }
  } else {
    saveData(data);
  }
  if (currentFolder === name) currentFolder = newName;
  refreshFolderSelect();
  initFolders();
  renderPasteList();
  if (currentPasteId) {
    const p = data.pastes.find(x => x.id === currentPasteId);
    if (p) pasteFolderSelect.value = p.folder || '';
  }
}
function refreshBulkMoveFolders() {
  const sel = document.getElementById('bulk-move-folder');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Move to…</option><option value="__none__">No folder</option>' +
    data.folders.map(f => `<option value="${escapeAttr(f)}">${escapeHtml(f)}</option>`).join('');
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function initFolders() {
  folderButtonsContainer.innerHTML = '';
  const buttons = [
    { folder: '', label: 'All' },
    { folder: FOLDER_PUBLIC, label: 'Public' },
    ...data.folders.map(f => ({ folder: f, label: f }))
  ];
  buttons.forEach(({ folder, label }) => {
    const isCustom = folder !== '' && folder !== FOLDER_PUBLIC;
    if (isCustom) {
      const wrap = document.createElement('div');
      wrap.className = 'folder-btn-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'folder-btn' + (folder === currentFolder ? ' active' : '');
      btn.dataset.folder = folder;
      btn.textContent = label || folder;
      btn.addEventListener('click', () => setFolder(folder));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'folder-btn-delete';
      del.setAttribute('aria-label', 'Delete folder');
      del.title = 'Delete folder';
      del.textContent = '×';
      del.addEventListener('click', (e) => { e.stopPropagation(); deleteFolder(folder); });
      const ren = document.createElement('button');
      ren.type = 'button';
      ren.className = 'folder-btn-delete';
      ren.setAttribute('aria-label', 'Rename folder');
      ren.title = 'Rename folder';
      ren.textContent = '✎';
      ren.addEventListener('click', (e) => { e.stopPropagation(); renameFolder(folder); });
      wrap.appendChild(btn);
      wrap.appendChild(ren);
      wrap.appendChild(del);
      folderButtonsContainer.appendChild(wrap);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'folder-btn' + (folder === currentFolder ? ' active' : '');
      btn.dataset.folder = folder;
      btn.textContent = label || 'All';
      btn.addEventListener('click', () => setFolder(folder));
      folderButtonsContainer.appendChild(btn);
    }
  });
  const actions = document.querySelector('.folder-actions');
  if (actions && !actions.parentNode) document.querySelector('.folders').appendChild(actions);
  document.getElementById('add-folder').onclick = addFolder;
  document.getElementById('rename-folder').onclick = () => {
    if (!currentFolder || currentFolder === FOLDER_PUBLIC || currentFolder === FOLDER_EVERYONE_PUBLIC) {
      showToast('Select a custom folder first', 'error');
      return;
    }
    renameFolder(currentFolder);
  };
  newFolderName.onkeydown = (e) => { if (e.key === 'Enter') addFolder(); };
  const headerEl = document.querySelector('.app-header');
  if (headerEl) headerEl.classList.toggle('app-header-public', location.protocol === 'http:' || location.protocol === 'https:');
  refreshBulkMoveFolders();
  updateHeaderNavActive();
}

// --- Search
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderPasteList();
});

// --- Clipboard & link
document.getElementById('paste-clipboard').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    pasteContent.value += (pasteContent.value ? '\n' : '') + text;
    updateHighlight();
  } catch (_) {
    alert('Could not read clipboard. Try pasting with Ctrl+V.');
  }
});

document.getElementById('copy-clipboard').addEventListener('click', async () => {
  const text = pasteContent.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-clipboard');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
    showToast('Copied to clipboard', 'success');
  } catch (_) {
    alert('Could not copy to clipboard.');
  }
});

// --- Ribbon (Word-style): Clipboard, Font, Paragraph, Editing
function getEditorSelection() {
  const start = pasteContent.selectionStart;
  const end = pasteContent.selectionEnd;
  return { start, end, text: pasteContent.value.slice(start, end) };
}
function setEditorSelection(start, end) {
  pasteContent.setSelectionRange(start, end);
  pasteContent.focus();
}
document.getElementById('ribbon-cut')?.addEventListener('click', async () => {
  const { start, end, text } = getEditorSelection();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const v = pasteContent.value;
    pasteContent.value = v.slice(0, start) + v.slice(end);
    setEditorSelection(start, start);
    updateHighlight();
    syncScroll();
    showToast('Cut', 'success');
  } catch (_) { showToast('Could not cut', 'error'); }
});
document.getElementById('ribbon-copy')?.addEventListener('click', async () => {
  const { start, end, text } = getEditorSelection();
  const toCopy = text || pasteContent.value;
  if (!toCopy) return;
  try {
    await navigator.clipboard.writeText(toCopy);
    showToast('Copied', 'success');
  } catch (_) { showToast('Could not copy', 'error'); }
});
document.getElementById('ribbon-paste')?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const { start, end } = getEditorSelection();
    const v = pasteContent.value;
    pasteContent.value = v.slice(0, start) + text + v.slice(end);
    setEditorSelection(start + text.length, start + text.length);
    updateHighlight();
    syncScroll();
    showToast('Pasted', 'success');
  } catch (_) { showToast('Could not paste', 'error'); }
});
document.getElementById('ribbon-font-decrease')?.addEventListener('click', () => {
  const sel = document.getElementById('opt-font-size') || document.getElementById('ribbon-font-size');
  if (!sel) return;
  const opts = Array.from(sel.options);
  const i = opts.findIndex(o => o.value === sel.value);
  if (i > 0) { sel.value = opts[i - 1].value; sel.dispatchEvent(new Event('change')); }
});
document.getElementById('ribbon-font-increase')?.addEventListener('click', () => {
  const sel = document.getElementById('opt-font-size') || document.getElementById('ribbon-font-size');
  if (!sel) return;
  const opts = Array.from(sel.options);
  const i = opts.findIndex(o => o.value === sel.value);
  if (i >= 0 && i < opts.length - 1) { sel.value = opts[i + 1].value; sel.dispatchEvent(new Event('change')); }
});
document.getElementById('ribbon-clear-format')?.addEventListener('click', () => {
  const fontSel = document.getElementById('opt-font-family');
  const sizeSel = document.getElementById('opt-font-size');
  const ribbonFont = document.getElementById('ribbon-font');
  const ribbonSize = document.getElementById('ribbon-font-size');
  if (fontSel) { fontSel.value = 'system'; fontSel.dispatchEvent(new Event('change')); }
  if (sizeSel) { sizeSel.value = '14'; sizeSel.dispatchEvent(new Event('change')); }
  if (ribbonFont) ribbonFont.value = 'system';
  if (ribbonSize) ribbonSize.value = '14';
  showToast('Format cleared', 'success');
});
function indentOutdentSelection(indent) {
  const v = pasteContent.value;
  const start = pasteContent.selectionStart;
  const end = pasteContent.selectionEnd;
  const lineStart = v.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = v.indexOf('\n', end);
  if (lineEnd < 0) lineEnd = v.length;
  const lines = v.slice(lineStart, lineEnd).split('\n');
  const pad = indent ? '    ' : '';
  const newLines = lines.map(line => {
    if (indent) return pad + line;
    return line.replace(/^(\s{1,4}|\t)/, '');
  });
  const newBlock = newLines.join('\n');
  pasteContent.value = v.slice(0, lineStart) + newBlock + v.slice(lineEnd);
  const newLen = newBlock.length;
  setEditorSelection(lineStart, lineStart + newLen);
  updateHighlight();
  syncScroll();
}
document.getElementById('ribbon-indent')?.addEventListener('click', () => indentOutdentSelection(true));
document.getElementById('ribbon-outdent')?.addEventListener('click', () => indentOutdentSelection(false));
document.getElementById('ribbon-find')?.addEventListener('click', () => { document.getElementById('find-in-paste-wrap')?.classList.remove('hidden'); document.getElementById('replace-in-paste-wrap')?.classList.add('hidden'); document.getElementById('find-in-paste-input')?.focus(); updateFindCount?.(); });
document.getElementById('ribbon-replace')?.addEventListener('click', () => { document.getElementById('replace-in-paste-wrap')?.classList.remove('hidden'); document.getElementById('find-in-paste-wrap')?.classList.add('hidden'); document.getElementById('replace-find-input')?.focus(); });
document.getElementById('ribbon-select-all')?.addEventListener('click', () => { pasteContent.setSelectionRange(0, pasteContent.value.length); pasteContent.focus(); });
// Sync ribbon font/size with editor options on load
(function syncRibbonFontFromOpts() {
  const optFont = document.getElementById('opt-font-family');
  const optSize = document.getElementById('opt-font-size');
  const ribbonFont = document.getElementById('ribbon-font');
  const ribbonSize = document.getElementById('ribbon-font-size');
  if (ribbonFont && optFont) { ribbonFont.value = optFont.value; ribbonFont.addEventListener('change', () => { optFont.value = ribbonFont.value; optFont.dispatchEvent(new Event('change')); }); }
  if (ribbonSize && optSize) { ribbonSize.value = optSize.value; ribbonSize.addEventListener('change', () => { optSize.value = ribbonSize.value; optSize.dispatchEvent(new Event('change')); }); }
  if (optFont) optFont.addEventListener('change', () => { if (ribbonFont) ribbonFont.value = optFont.value; });
  if (optSize) optSize.addEventListener('change', () => { if (ribbonSize) ribbonSize.value = optSize.value; });
})();

function getShareLink() {
  if (!currentPasteId) return '';
  const base = location.origin + location.pathname.replace(/\/$/, '') || location.origin + '/';
  return base + '?p=' + encodeURIComponent(currentPasteId);
}

document.getElementById('copy-link').addEventListener('click', async () => {
  const url = getShareLink();
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    const btn = document.getElementById('copy-link');
    const orig = btn.textContent;
    btn.textContent = 'Link copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
    showToast('Link copied', 'success');
  } catch (_) {
    alert('Could not copy link.');
  }
});

// --- Buttons
pasteContent.addEventListener('input', updatePasteStats);

document.getElementById('new-paste').addEventListener('click', newPaste);
document.getElementById('save-paste').addEventListener('click', saveCurrent);
document.getElementById('delete-paste').addEventListener('click', deleteCurrent);
document.getElementById('duplicate-paste').addEventListener('click', () => duplicatePaste(false));
document.getElementById('fork-paste').addEventListener('click', () => duplicatePaste(true));
document.getElementById('public-paste-star')?.addEventListener('click', async () => {
  const id = viewingPublicPaste && viewingPublicPaste.id;
  if (!id) return;
  try {
    const j = await api('/api/pastes/' + encodeURIComponent(id) + '/star', { method: 'POST' });
    const btn = document.getElementById('public-paste-star');
    const stars = j && typeof j.stars === 'number' ? j.stars : 0;
    if (btn) btn.innerHTML = (j.starred ? '★ Star' : '☆ Star') + ' (<span id="public-paste-stars">' + stars + '</span>)';
    const starsEl = document.getElementById('public-paste-stars');
    if (starsEl) starsEl.textContent = String(stars);
    if (viewingPublicPaste) { viewingPublicPaste.stars = stars; viewingPublicPaste.starred = !!j.starred; }
    publicFeedPastes = publicFeedPastes.map(p => p.id === id ? { ...p, stars } : p);
    renderPasteList();
  } catch (_) {
    showToast('Sign in to star pastes', 'error');
  }
});
document.getElementById('public-comment-send')?.addEventListener('click', async () => {
  const id = commentPasteId || (viewingPublicPaste && viewingPublicPaste.id) || currentPasteId;
  const inp = document.getElementById('public-comment-input');
  const content = (inp && inp.value ? inp.value.trim() : '');
  if (!id || !content) return;
  try {
    await api('/api/pastes/' + encodeURIComponent(id) + '/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
    if (inp) inp.value = '';
    await loadComments(id);
    showToast('Comment posted', 'success');
  } catch (e) {
    showToast((e.body && e.body.error) || 'Could not post comment', 'error');
  }
});
  document.getElementById('copy-public-to-mine')?.addEventListener('click', async () => {
    if (!viewingPublicPaste) return;
    const p = viewingPublicPaste;
    const paste = {
      id: generateId(),
      title: (p.title || 'Untitled') + ' (copy)',
      content: p.content || '',
      language: p.language || 'none',
      folder: p.folder || null,
      category: p.category || '',
      expiration: p.expiration || 'N',
      exposure: 0,
      password: null,
      burnAfterRead: false,
      burnAfterViews: 0,
      tags: Array.isArray(p.tags) ? p.tags : [],
      views: 0,
      pinned: false,
      favorite: false,
      archived: false,
      template: false,
      versions: [],
      forkedFromId: p.id || null,
      forkedFromTitle: p.title || null,
      replyToId: null,
      files: Array.isArray(p.files) ? p.files.map(f => ({ filename: f.filename || '', content: f.content || '', language: f.language || 'none' })) : [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (user) {
      try {
        const created = await api('/api/pastes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(paste)) });
        data.pastes.unshift(normalizePaste(created));
        clearViewingPublicPaste();
        selectPaste(created.id);
        showToast('Copied to your pastes', 'success');
      } catch (e) {
        showToast('Failed to copy: ' + (e.body && e.body.error || e.status), 'error');
      }
    } else {
      data.pastes.unshift(paste);
      saveData(data);
      clearViewingPublicPaste();
      selectPaste(paste.id);
      showToast('Copied to your pastes', 'success');
    }
  });
document.getElementById('download-paste').addEventListener('click', downloadPaste);
document.getElementById('pin-paste').addEventListener('click', togglePin);
document.getElementById('export-all').addEventListener('click', exportAll);
document.getElementById('import-btn').addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', () => {
  const f = importFileInput.files && importFileInput.files[0];
  if (f) { importFromFile(f); importFileInput.value = ''; }
});
if (themeSelect) {
  themeSelect.addEventListener('change', () => {
    setLocal('woxbin_theme', themeSelect.value);
    applyThemeFromPreference();
  });
  if (typeof matchMedia !== 'undefined') matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (themeSelect.value === 'system') applyThemeFromPreference(); });
}

document.getElementById('btn-login').addEventListener('click', () => showAuthModal('login'));
document.getElementById('btn-register').addEventListener('click', () => showAuthModal('register'));
document.getElementById('btn-logout').addEventListener('click', logout);
document.getElementById('auth-modal-close').addEventListener('click', () => closeModal(document.getElementById('auth-modal')));

// --- Account settings modal
function renderAccountKeys(keys) {
  const keysList = document.getElementById('account-keys-list');
  if (!keysList) return;
  keysList.innerHTML = keys.length ? keys.map(k => {
    const label = escapeHtml(k.label || 'Unnamed');
    const created = k.createdAt ? formatDate(k.createdAt) : '';
    return `<li><span title="Created: ${escapeAttr(created)}">${label}</span><button type="button" class="btn btn-ghost btn-sm account-revoke-key" data-id="${escapeAttr(String(k.id))}" title="Revoke key">Revoke</button></li>`;
  }).join('') : '<li class="dim">No API keys yet</li>';
  keysList.querySelectorAll('.account-revoke-key').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!id || !confirm('Revoke this API key? It will stop working immediately.')) return;
      try {
        await api('/api/keys/' + id, { method: 'DELETE' });
        openAccountSettings();
      } catch (_) { showToast('Failed to revoke key', 'error'); }
    });
  });
}
function renderAccountSessions(sessions) {
  const list = document.getElementById('account-sessions-list');
  if (!list) return;
  list.innerHTML = sessions.length ? sessions.map(s => {
    const ua = escapeHtml((s.userAgent || '').slice(0, 80) || 'Unknown device');
    const meta = (s.current ? 'Current session' : 'Active session') + ' · Last seen ' + escapeHtml(formatDate(s.lastSeenAt)) + (s.lastIp ? (' · IP ' + escapeHtml(s.lastIp)) : '');
    return `<li><span><strong>${ua}</strong><br><small class="dim">${meta}</small></span>${s.current ? '<span class="dim">Current</span>' : '<button type="button" class="btn btn-ghost btn-sm account-revoke-session" data-sid="' + escapeAttr(s.sid) + '">Revoke</button>'}</li>`;
  }).join('') : '<li class="dim">No active sessions</li>';
  list.querySelectorAll('.account-revoke-session').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.sid;
      if (!sid || !confirm('Revoke this session?')) return;
      try {
        await api('/api/me/sessions/' + encodeURIComponent(sid), { method: 'DELETE' });
        showToast('Session revoked', 'success');
        openAccountSettings();
      } catch (_) { showToast('Failed to revoke session', 'error'); }
    });
  });
}
async function openAccountSettings() {
  if (!user) return;
  const modal = document.getElementById('account-settings-modal');
  if (!modal) return;
  const usernameEl = document.getElementById('account-username');
  if (usernameEl) usernameEl.textContent = user.username || '';
  const pwForm = document.getElementById('account-password-form');
  if (pwForm) { pwForm.reset(); document.getElementById('account-password-error')?.classList.add('hidden'); }
  const keyResult = document.getElementById('account-key-result');
  if (keyResult) { keyResult.classList.add('hidden'); keyResult.querySelector('#account-key-token').textContent = ''; }
  const delPw = document.getElementById('account-delete-password');
  if (delPw) delPw.value = '';
  const keysList = document.getElementById('account-keys-list');
  const sessionsList = document.getElementById('account-sessions-list');
  if (keysList) {
    keysList.innerHTML = '<li class="dim">Loading…</li>';
  }
  if (sessionsList) {
    sessionsList.innerHTML = '<li class="dim">Loading…</li>';
  }
  try {
    const [meRes, keysRes, sessRes] = await Promise.all([api('/api/me'), api('/api/keys'), api('/api/me/sessions')]);
    const webhookInput = document.getElementById('account-webhook-url');
    if (webhookInput) webhookInput.value = meRes.webhookUrl || '';
    renderAccountKeys(keysRes.keys || []);
    renderAccountSessions(sessRes.sessions || []);
  } catch (_) {
    if (keysList) keysList.innerHTML = '<li class="dim">Could not load keys</li>';
    if (sessionsList) sessionsList.innerHTML = '<li class="dim">Could not load sessions</li>';
  }
  openModal(modal);
}
document.getElementById('account-save-webhook')?.addEventListener('click', async () => {
  const input = document.getElementById('account-webhook-url');
  const url = input && input.value.trim() ? input.value.trim() : null;
  try {
    await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl: url || null }) });
    showToast('Webhook saved', 'success');
  } catch (e) {
    showToast((e.body && e.body.error) || 'Failed to save webhook', 'error');
  }
});
document.getElementById('btn-account')?.addEventListener('click', openAccountSettings);
document.getElementById('account-settings-close')?.addEventListener('click', () => closeModal(document.getElementById('account-settings-modal')));
document.getElementById('account-revoke-others')?.addEventListener('click', async () => {
  if (!confirm('Log out all other sessions?')) return;
  try {
    await api('/api/me/sessions/revoke-others', { method: 'POST' });
    showToast('Other sessions logged out', 'success');
    openAccountSettings();
  } catch (_) { showToast('Failed to revoke sessions', 'error'); }
});
document.getElementById('account-claim-anon')?.addEventListener('click', async () => {
  const claims = loadAnonClaims();
  if (!claims.length) {
    showToast('No anonymous pastes found in this browser', 'error');
    return;
  }
  try {
    const res = await api('/api/me/claim-anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: claims.map(c => ({ id: c.id, token: c.token })) })
    });
    const claimed = res.claimed || 0;
    if (claimed > 0) {
      saveAnonClaims([]);
      data.pastes.forEach(p => {
        if (p.fromAnonymousServer && p.anonymousClaimToken) {
          p.fromAnonymousServer = false;
          p.anonymousClaimToken = null;
        }
      });
      saveData(data);
      await checkSession();
      renderPasteList();
    }
    showToast('Claimed ' + claimed + ' anonymous paste(s)', claimed ? 'success' : 'info');
  } catch (e) {
    showToast((e.body && e.body.error) || 'Failed to claim anonymous pastes', 'error');
  }
});
document.getElementById('account-delete-btn')?.addEventListener('click', async () => {
  const pw = document.getElementById('account-delete-password')?.value || '';
  if (!pw) { showToast('Enter password to delete account', 'error'); return; }
  if (!confirm('Delete your account permanently? This cannot be undone.')) return;
  try {
    await api('/api/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    user = null;
    data = loadData();
    currentPasteId = null;
    renderAuth();
    initFolders();
    renderPasteList();
    showEmpty();
    closeModal(document.getElementById('account-settings-modal'));
    showToast('Account deleted', 'success');
  } catch (e) {
    showToast((e.body && e.body.error) || 'Failed to delete account', 'error');
  }
});
document.getElementById('account-password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('account-password-error');
  const current = document.getElementById('account-current-password').value;
  const newPw = document.getElementById('account-new-password').value;
  const confirmPw = document.getElementById('account-confirm-password').value;
  errEl.classList.add('hidden');
  if (newPw.length < 6) { errEl.textContent = 'New password must be at least 6 characters'; errEl.classList.remove('hidden'); return; }
  if (newPw !== confirmPw) { errEl.textContent = 'New passwords do not match'; errEl.classList.remove('hidden'); return; }
  try {
    await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: current, newPassword: newPw }) });
    showToast('Password changed', 'success');
    document.getElementById('account-password-form').reset();
  } catch (e) {
    errEl.textContent = (e.body && e.body.error) || 'Failed to change password';
    errEl.classList.remove('hidden');
  }
});
document.getElementById('account-create-key')?.addEventListener('click', async () => {
  const labelInput = document.getElementById('account-key-label');
  const label = (labelInput && labelInput.value ? labelInput.value.trim() : '') || 'Default key';
  try {
    const j = await api('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
    const token = j.token;
    const resultEl = document.getElementById('account-key-result');
    const tokenEl = document.getElementById('account-key-token');
    if (resultEl && tokenEl) { tokenEl.textContent = token; resultEl.classList.remove('hidden'); }
    if (labelInput) labelInput.value = '';
    const keysRes = await api('/api/keys');
    renderAccountKeys(keysRes.keys || []);
  } catch (e) { showToast((e.body && e.body.error) || 'Failed to create key', 'error'); }
});
document.addEventListener('keydown', (e) => {
  const accountModal = document.getElementById('account-settings-modal');
  if (e.key === 'Escape' && accountModal && !accountModal.classList.contains('hidden')) {
    closeModal(accountModal);
  }
});

// --- Keyboard
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    newPaste();
  }
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveCurrent();
  }
  if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
    const wrap = document.getElementById('find-in-paste-wrap');
    if (wrap && document.getElementById('editor-wrap') && !document.getElementById('editor-wrap').classList.contains('hidden')) {
      e.preventDefault();
      wrap.classList.remove('hidden');
      document.getElementById('replace-in-paste-wrap')?.classList.add('hidden');
      document.getElementById('find-in-paste-input')?.focus();
    }
  }
  if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
    const wrap = document.getElementById('replace-in-paste-wrap');
    if (wrap && document.getElementById('editor-wrap') && !document.getElementById('editor-wrap').classList.contains('hidden')) {
      e.preventDefault();
      wrap.classList.remove('hidden');
      document.getElementById('find-in-paste-wrap')?.classList.add('hidden');
      document.getElementById('replace-find-input')?.focus();
    }
  }
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault();
    openQuickSwitcher();
  }
});

// --- Open paste from URL (?p=id or #id), optional #L5 or #L5-L10 line permalink
async function openPasteFromUrl() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('p');
  const fromHash = location.hash ? location.hash.replace(/^#/, '') : '';
  const lineMatch = fromHash.match(/^L(\d+)(?:-L?(\d+))?$/i);
  const id = fromQuery || (fromHash && !lineMatch ? fromHash : '');
  if (!id) return;
  if (data.pastes.some(p => p.id === id)) {
    selectPaste(id);
    return;
  }
  try {
    const p = await api('/api/pastes/' + id);
    const norm = normalizePaste(p);
    if (!data.pastes.some(x => x.id === id)) data.pastes.unshift(norm);
    selectPaste(id);
  } catch (_) {}
}

function applyLineHash() {
  const hash = (location.hash || '').replace(/^#/, '');
  const m = hash.match(/^L(\d+)(?:-L?(\d+))?$/i);
  if (!m || !pasteContent) return;
  const lineStart = Math.max(1, parseInt(m[1], 10));
  const lineEnd = m[2] ? Math.max(lineStart, parseInt(m[2], 10)) : lineStart;
  const lines = (pasteContent.value || '').split('\n');
  if (lineStart > lines.length) return;
  const lineHeight = parseInt(getComputedStyle(pasteContent).lineHeight, 10) || 20;
  const targetLine = Math.min(lineStart, lines.length);
  pasteContent.scrollTop = Math.max(0, (targetLine - 1) * lineHeight - pasteContent.clientHeight / 2);
  pasteContent.focus();
  const startOffset = lines.slice(0, lineStart - 1).join('\n').length;
  const endLine = Math.min(lineEnd, lines.length);
  const endOffset = lines.slice(0, endLine).join('\n').length;
  pasteContent.setSelectionRange(startOffset, endOffset);
}

function openQuickSwitcher() {
  const modal = document.getElementById('quick-switcher-modal');
  const input = document.getElementById('quick-switcher-input');
  const listEl = document.getElementById('quick-switcher-list');
  if (!modal || !input || !listEl) return;
  input.value = '';
  let selectedIndex = 0;
  const recentIds = getRecentIds();
  function getPastesForList() {
    const all = getFilteredPastes();
    const q = input.value.trim().toLowerCase();
    let list = q ? all.filter(p => (p.title || '').toLowerCase().includes(q) || (p.folder || '').toLowerCase().includes(q)) : all;
    list = list.slice(0, 50);
    list.sort((a, b) => {
      const ai = recentIds.indexOf(a.id);
      const bi = recentIds.indexOf(b.id);
      if (ai >= 0 && bi < 0) return -1;
      if (ai < 0 && bi >= 0) return 1;
      if (ai >= 0 && bi >= 0) return ai - bi;
      return 0;
    });
    return list;
  }
  function render() {
    const list = getPastesForList();
    selectedIndex = Math.min(selectedIndex, Math.max(0, list.length - 1));
    listEl.innerHTML = list.length ? list.map((p, i) => `<li class="quick-switcher-item ${i === selectedIndex ? 'selected' : ''}" data-id="${escapeAttr(p.id)}" data-index="${i}">${escapeHtml(p.title || 'Untitled')}${p.folder ? ' <span class="dim">' + escapeHtml(p.folder) + '</span>' : ''}</li>`).join('') : '<li class="dim">No pastes match</li>';
    listEl.querySelectorAll('.quick-switcher-item[data-id]').forEach((el, i) => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (currentFolder === FOLDER_EVERYONE_PUBLIC) selectPublicPaste(id);
        else selectPaste(id);
        closeModal(modal);
      });
    });
    const sel = listEl.querySelector('.quick-switcher-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function selectCurrent() {
    const list = getPastesForList();
    const p = list[selectedIndex];
    if (p) {
      if (currentFolder === FOLDER_EVERYONE_PUBLIC) selectPublicPaste(p.id);
      else selectPaste(p.id);
      closeModal(modal);
    }
  }
  input.onkeydown = (e) => {
    if (e.key === 'Escape') { closeModal(modal); return; }
    if (e.key === 'Enter') { e.preventDefault(); selectCurrent(); return; }
    const list = getPastesForList();
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, list.length - 1); render(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); render(); return; }
  };
  input.oninput = () => { selectedIndex = 0; render(); };
  render();
  openModal(modal);
  input.focus();
}

// --- Landing page & Init
const LANDING_KEY = 'woxbin_seen_landing';

function shouldShowLanding() {
  if (typeof sessionStorage === 'undefined') return false;
  if (getSession(LANDING_KEY)) return false;
  const params = new URLSearchParams(location.search);
  if (params.has('p')) return false;
  if (location.hash && location.hash.replace(/^#/, '').length > 0) return false;
  return true;
}

function goToApp() {
  setSession(LANDING_KEY, '1');
  const landing = document.getElementById('landing-page');
  const app = document.getElementById('app-container');
  if (landing) landing.classList.add('hidden');
  if (app) app.classList.remove('hidden');
  runAppInit();
}

async function runAppInit() {
  data.pastes.forEach(p => {
    if (p.pinned === undefined) p.pinned = false;
    if (p.favorite === undefined) p.favorite = false;
    if (p.archived === undefined) p.archived = false;
    if (p.template === undefined) p.template = false;
    if (!Array.isArray(p.versions)) p.versions = [];
  });
  const savedTheme = getLocal('woxbin_theme') || 'dark';
  if (themeSelect) {
    themeSelect.value = ['light', 'system', 'highcontrast'].includes(savedTheme) ? savedTheme : 'dark';
    applyThemeFromPreference();
  }
  try {
    await checkSession();
  } catch (_) {}
  renderAuth();
  initFolders();
  renderPasteList();
  await openPasteFromUrl();
  if (!currentPasteId) {
    const first = getFilteredPastes()[0];
    if (!first) showEmpty();
    else selectPaste(first.id);
  }
  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('raw') === '1' && currentPasteId) {
    const p = data.pastes.find(x => x.id === currentPasteId);
    if (p) {
      const rawView = document.getElementById('raw-view');
      const rawContent = document.getElementById('raw-view-content');
      if (rawView && rawContent) {
        rawContent.textContent = p.content || '';
        rawView.classList.remove('hidden');
      }
    }
  }
  setTimeout(applyLineHash, 100);
  setInterval(() => {
    const before = data.pastes.length;
    data.pastes = data.pastes.filter(p => !isPasteExpired(p));
    if (data.pastes.length !== before) {
      saveData(data);
      renderPasteList();
      if (currentPasteId && !data.pastes.find(p => p.id === currentPasteId)) {
        showEmpty();
        currentPasteId = null;
      }
    }
  }, 60000);
  setupExtraFeatures();
}

function setupExtraFeatures() {
  const ind = document.getElementById('autosave-indicator');
  function setAutoSaveIndicator(text) { if (ind) ind.textContent = text; }
  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setAutoSaveIndicator('…');
    autoSaveTimer = setTimeout(async () => {
      await saveCurrent();
      setAutoSaveIndicator('Saved');
      setTimeout(() => setAutoSaveIndicator(''), 2000);
      autoSaveTimer = null;
    }, AUTO_SAVE_DELAY);
  }
  pasteTitle.addEventListener('input', scheduleAutoSave);
  pasteContent.addEventListener('input', scheduleAutoSave);

  const sortSelect = document.getElementById('sort-pastes');
  if (sortSelect) {
    sortOrder = getLocal('woxbin_sort') || 'newest';
    sortSelect.value = sortOrder;
    sortSelect.addEventListener('change', async () => {
      sortOrder = sortSelect.value;
      setLocal('woxbin_sort', sortOrder);
      if (currentFolder === FOLDER_EVERYONE_PUBLIC) await setFolder(FOLDER_EVERYONE_PUBLIC);
      else renderPasteList();
    });
  }
  ['all','favorites','recent','archived'].forEach(f => {
    const btn = document.getElementById('filter-' + f);
    if (btn) btn.addEventListener('click', () => { quickFilter = f; document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f)); renderPasteList(); });
  });
  document.querySelectorAll('.filter-btn').forEach(b => { if (b.dataset.filter === quickFilter) b.classList.add('active'); });

  const findWrap = document.getElementById('find-in-paste-wrap');
  const findInput = document.getElementById('find-in-paste-input');
  const findCount = document.getElementById('find-in-paste-count');
  function updateFindCount() {
    const q = (findInput && findInput.value) || '';
    if (!q) { if (findCount) findCount.textContent = ''; return 0; }
    const content = pasteContent.value;
    const re = new RegExp(escapeRegex(q), 'gi');
    const n = (content.match(re) || []).length;
    if (findCount) findCount.textContent = n ? n + ' match' + (n !== 1 ? 'es' : '') : 'No match';
    return n;
  }
  function findNext(back) {
    const q = findInput && findInput.value;
    if (!q) return;
    const content = pasteContent.value;
    const start = pasteContent.selectionStart;
    const re = new RegExp(escapeRegex(q), 'gi');
    let idx = -1;
    if (back) {
      const before = content.slice(0, start);
      const m = before.match(re);
      idx = m ? before.lastIndexOf(m[m.length - 1]) : -1;
    } else {
      idx = content.toLowerCase().indexOf(q.toLowerCase(), start + 1);
      if (idx < 0) idx = content.toLowerCase().indexOf(q.toLowerCase(), 0);
    }
    if (idx >= 0) { pasteContent.setSelectionRange(idx, idx + q.length); pasteContent.focus(); }
  }
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  document.getElementById('btn-find')?.addEventListener('click', () => { findWrap?.classList.toggle('hidden'); if (!findWrap?.classList.contains('hidden')) findInput?.focus(); updateFindCount(); });
  document.getElementById('find-close')?.addEventListener('click', () => findWrap?.classList.add('hidden'));
  document.getElementById('btn-format')?.addEventListener('click', () => {
    const raw = pasteContent.value.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      pasteContent.value = JSON.stringify(parsed, null, 2);
      updateHighlight();
      showToast('Formatted', 'success');
    } catch (_) {
      showToast('Not valid JSON', 'error');
    }
  });
  findInput?.addEventListener('input', updateFindCount);
  findInput?.addEventListener('keydown', e => { if (e.key === 'Escape') findWrap?.classList.add('hidden'); });
  document.getElementById('find-next')?.addEventListener('click', () => findNext(false));
  document.getElementById('find-prev')?.addEventListener('click', () => findNext(true));

  const replaceWrap = document.getElementById('replace-in-paste-wrap');
  const replaceFindInput = document.getElementById('replace-find-input');
  const replaceWithInput = document.getElementById('replace-with-input');
  function doReplace(all) {
    const q = replaceFindInput?.value;
    if (!q) return;
    const repl = (replaceWithInput?.value) || '';
    const content = pasteContent.value;
    const re = new RegExp(escapeRegex(q), 'gi');
    if (all) {
      const newContent = content.replace(re, repl);
      if (newContent !== content) {
        pasteContent.value = newContent;
        updateHighlight();
        syncScroll();
        showToast('Replaced all', 'success');
      }
    } else {
      const start = pasteContent.selectionStart;
      const end = pasteContent.selectionEnd;
      const sel = content.slice(start, end);
      if (sel.toLowerCase() !== q.toLowerCase()) { findNext(false); return; }
      pasteContent.value = content.slice(0, start) + repl + content.slice(end);
      pasteContent.setSelectionRange(start, start + repl.length);
      pasteContent.focus();
      updateHighlight();
      syncScroll();
      findNext(false);
    }
  }
  document.getElementById('replace-next')?.addEventListener('click', () => doReplace(false));
  document.getElementById('replace-all')?.addEventListener('click', () => doReplace(true));
  document.getElementById('replace-close')?.addEventListener('click', () => replaceWrap?.classList.add('hidden'));
  replaceFindInput?.addEventListener('keydown', e => { if (e.key === 'Escape') replaceWrap?.classList.add('hidden'); });

  const shortcuts = [
    ['Ctrl+N', 'New paste'],
    ['Ctrl+S', 'Save'],
    ['Ctrl+P', 'Quick open (search pastes)'],
    ['Ctrl+F', 'Find in paste'],
    ['Ctrl+H', 'Replace'],
    ['Ctrl+A', 'Select all'],
    ['?', 'This shortcuts panel'],
  ];
  const listEl = document.getElementById('shortcuts-list');
  if (listEl) { listEl.innerHTML = shortcuts.map(([k, d]) => `<li><kbd>${escapeHtml(k)}</kbd> — ${escapeHtml(d)}</li>`).join(''); }
  document.getElementById('btn-shortcuts')?.addEventListener('click', () => openModal(document.getElementById('shortcuts-modal')));
  document.getElementById('shortcuts-close')?.addEventListener('click', () => closeModal(document.getElementById('shortcuts-modal')));
  document.addEventListener('keydown', e => {
    if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      openModal(modal);
    } else {
      closeModal(modal);
    }
  });

  function getShareUrl(readOnly, raw, lineRange) {
    const base = location.origin + location.pathname.replace(/\/$/, '') || location.origin + '/';
    const id = currentPasteId ? encodeURIComponent(currentPasteId) : '';
    if (!id) return base;
    if (raw) return location.origin + '/raw/' + id;
    let q = '?p=' + id;
    if (readOnly) q += '&readonly=1';
    let hash = '';
    if (lineRange && /^(\d+)(-\d+)?$/.test(lineRange.trim())) {
      const m = lineRange.trim().match(/^(\d+)(-\d+)?$/);
      hash = m[2] ? '#L' + m[1] + '-L' + m[2].slice(1) : '#L' + m[1];
    }
    return base + q + hash;
  }
  function refreshShareLink() {
    const readOnly = document.getElementById('share-readonly')?.checked || false;
    const raw = document.getElementById('share-raw')?.checked || false;
    const lineRange = document.getElementById('share-line-range')?.value?.trim() || '';
    const url = getShareUrl(readOnly, raw, lineRange);
    document.getElementById('share-link-input').value = url;
    document.getElementById('share-embed-code').value = '<iframe src="' + url + '" width="100%" height="400" frameborder="0"></iframe>';
    const canvas = document.getElementById('share-qr-canvas');
    if (canvas && canvas.innerHTML) { const img = canvas.querySelector('img'); if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(url); }
  }
  document.getElementById('btn-share')?.addEventListener('click', () => {
    const modal = document.getElementById('share-modal');
    if (!modal || !currentPasteId) return;
    document.getElementById('share-raw').checked = false;
    document.getElementById('share-line-range').value = '';
    refreshShareLink();
    const url = document.getElementById('share-link-input').value;
    document.getElementById('share-embed-code').value = '<iframe src="' + url + '" width="100%" height="400" frameborder="0"></iframe>';
    const canvas = document.getElementById('share-qr-canvas');
    if (canvas) { canvas.innerHTML = ''; const img = document.createElement('img'); img.alt = 'QR'; img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(url); canvas.appendChild(img); }
    openModal(modal);
  });
  document.getElementById('share-readonly')?.addEventListener('change', refreshShareLink);
  document.getElementById('share-raw')?.addEventListener('change', refreshShareLink);
  document.getElementById('share-line-range')?.addEventListener('input', refreshShareLink);
  document.getElementById('share-copy-link')?.addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('share-link-input').value); showToast('Link copied', 'success'); });
  document.getElementById('share-copy-embed')?.addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('share-embed-code').value); showToast('Embed code copied', 'success'); });
  document.getElementById('share-close')?.addEventListener('click', () => closeModal(document.getElementById('share-modal')));

  document.getElementById('btn-version-history')?.addEventListener('click', () => {
    const p = currentPasteId && data.pastes.find(x => x.id === currentPasteId);
    const ul = document.getElementById('version-list');
    const modal = document.getElementById('version-modal');
    if (!ul || !modal) return;
    ul.innerHTML = (p && p.versions && p.versions.length) ? p.versions.map((v, i) => `<li>${escapeHtml(formatDate(v.at))} <span><button type="button" class="btn btn-ghost btn-sm" data-diff-i="${escapeAttr(String(i))}">Diff</button> <button type="button" class="btn btn-ghost btn-sm" data-i="${escapeAttr(String(i))}">Restore</button></span></li>`).join('') : '<li>No previous versions</li>';
    ul.querySelectorAll('button[data-i]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        const v = p.versions[i];
        if (v) { pasteContent.value = v.content; updateHighlight(); updatePasteStats(); closeModal(modal); }
      });
    });
    ul.querySelectorAll('button[data-diff-i]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.diffI, 10);
        const v = p.versions[i];
        if (!v) return;
        const oldText = v.content || '';
        const newText = pasteContent.value || '';
        const diffEl = document.getElementById('diff-content');
        if (diffEl && typeof (window.diff_match_patch) === 'function') {
          const dmp = new window.diff_match_patch();
          dmp.Diff_Timeout = 5;
          const diff = dmp.diff_main(oldText, newText);
          dmp.diff_cleanupSemantic(diff);
          const frag = dmp.diff_prettyHtml(diff);
          diffEl.innerHTML = frag;
        } else {
          diffEl.textContent = 'Older:\n' + oldText + '\n\n---\n\nCurrent:\n' + newText;
        }
        openModal(document.getElementById('diff-modal'));
      });
    });
    openModal(modal);
  });
  document.getElementById('version-close')?.addEventListener('click', () => closeModal(document.getElementById('version-modal')));
  document.getElementById('diff-close')?.addEventListener('click', () => closeModal(document.getElementById('diff-modal')));

  document.getElementById('import-url-btn')?.addEventListener('click', () => { openModal(document.getElementById('import-url-modal')); document.getElementById('import-url-input').value = ''; });
  document.getElementById('import-url-close')?.addEventListener('click', () => closeModal(document.getElementById('import-url-modal')));
  document.getElementById('import-url-fetch')?.addEventListener('click', async () => {
    const url = document.getElementById('import-url-input')?.value?.trim();
    const errEl = document.getElementById('import-url-error');
    const modal = document.getElementById('import-url-modal');
    if (!url) { errEl.textContent = 'Enter a URL'; errEl.classList.remove('hidden'); return; }
    const parsed = /^(https?):\/\//i.exec(url);
    if (!parsed || (parsed[1] !== 'http' && parsed[1] !== 'https')) {
      errEl.textContent = 'Only http and https URLs are allowed';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    try {
      const res = await fetch(url);
      const text = await res.text();
      newPaste();
      pasteContent.value = text;
      pasteTitle.value = (url.split('/').pop() || 'Imported').slice(0, 80);
      closeModal(modal);
      updateHighlight();
      updatePasteStats();
      showToast('Paste imported', 'success');
    } catch (e) { errEl.textContent = 'Could not fetch URL'; errEl.classList.remove('hidden'); }
  });

  document.getElementById('templates-btn')?.addEventListener('click', () => {
    const list = document.getElementById('templates-list');
    const modal = document.getElementById('templates-modal');
    if (!list || !modal) return;
    const userTemplates = data.pastes.filter(p => p.template && !isPasteExpired(p));
    let html = '';
    if (BUILTIN_TEMPLATES.length) {
      html += '<li class="templates-section-label">Built-in</li>';
      html += BUILTIN_TEMPLATES.map(t => `<li><button type="button" class="btn btn-ghost btn-sm use-builtin-template" data-id="${escapeAttr(t.id)}">Use</button> ${escapeHtml(t.title)}</li>`).join('');
    }
    if (userTemplates.length) {
      html += '<li class="templates-section-label">Your templates</li>';
      html += userTemplates.map(p => `<li><button type="button" class="btn btn-ghost btn-sm use-template" data-id="${escapeAttr(p.id)}">Use</button> ${escapeHtml(p.title || 'Untitled')}</li>`).join('');
    }
    if (!html) html = '<li>No templates. Use built-in above or save a paste as template.</li>';
    list.innerHTML = html;
    list.querySelectorAll('.use-builtin-template').forEach(btn => btn.addEventListener('click', () => {
      const t = BUILTIN_TEMPLATES.find(x => x.id === btn.dataset.id);
      if (!t) return;
      newPaste();
      pasteContent.value = t.content || '';
      pasteTitle.value = (t.title || 'Untitled') + ' (from template)';
      pasteLanguage.value = t.language || 'none';
      const cur = data.pastes.find(x => x.id === currentPasteId);
      if (cur) { cur.content = t.content || ''; cur.title = pasteTitle.value; cur.language = t.language || 'none'; }
      updateHighlight();
      updatePasteStats();
      closeModal(modal);
      showToast('Template applied', 'success');
    }));
    list.querySelectorAll('.use-template').forEach(btn => btn.addEventListener('click', () => {
      const src = data.pastes.find(x => x.id === btn.dataset.id);
      if (!src) return;
      newPaste();
      pasteContent.value = src.content || '';
      pasteTitle.value = (src.title || 'Untitled') + ' (from template)';
      pasteLanguage.value = src.language || 'none';
      const cur = data.pastes.find(x => x.id === currentPasteId);
      if (cur) { cur.content = src.content || ''; cur.title = pasteTitle.value; cur.language = src.language || 'none'; }
      updateHighlight();
      updatePasteStats();
      closeModal(modal);
      showToast('Template applied', 'success');
    }));
    openModal(modal);
  });
  document.getElementById('templates-close')?.addEventListener('click', () => closeModal(document.getElementById('templates-modal')));

  // --- Code image (Carbon-style) export
  const codeImageModal = document.getElementById('code-image-modal');
  document.getElementById('btn-code-image')?.addEventListener('click', () => openModal(codeImageModal));
  document.getElementById('code-image-close')?.addEventListener('click', () => closeModal(codeImageModal));
  codeImageModal?.addEventListener('click', (e) => { if (e.target === codeImageModal) closeModal(codeImageModal); });
  codeImageModal?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(codeImageModal); });
  document.getElementById('code-image-download')?.addEventListener('click', async () => {
    if (typeof html2canvas !== 'function') { showToast('Export library not loaded', 'error'); return; }
    const bg = (document.getElementById('code-image-bg') && document.getElementById('code-image-bg').value) || 'dark';
    const padding = (document.getElementById('code-image-padding') && document.getElementById('code-image-padding').value) || 'medium';
    const withWindow = document.getElementById('code-image-window') && document.getElementById('code-image-window').checked;
    const withLines = document.getElementById('code-image-lines') && document.getElementById('code-image-lines').checked;
    const content = pasteContent.value || ' ';
    const lang = pasteLanguage.value;
    let root = document.getElementById('carbon-export-root');
    if (!root) { root = document.createElement('div'); root.id = 'carbon-export-root'; }
    root.innerHTML = '';
    root.className = 'carbon-bg-' + (bg === 'current' ? 'dark' : bg);
    if (bg === 'current') {
      const bgColor = getComputedStyle(document.body).backgroundColor || '#1e1e1e';
      root.style.backgroundColor = bgColor;
    } else if (bg === 'dark') root.style.backgroundColor = '#1e1e1e';
    else if (bg === 'darker') root.style.backgroundColor = '#0d1117';
    else if (bg === 'light') { root.style.backgroundColor = '#f6f8fa'; root.classList.add('carbon-bg-light'); }
    const padPx = padding === 'small' ? 12 : padding === 'large' ? 24 : 16;
    if (withWindow) {
      const bar = document.createElement('div');
      bar.className = 'carbon-title-bar';
      bar.innerHTML = '<span class="carbon-dot red"></span><span class="carbon-dot yellow"></span><span class="carbon-dot green"></span>';
      root.appendChild(bar);
    }
    const codeWrap = document.createElement('div');
    codeWrap.className = 'carbon-code-wrap';
    codeWrap.style.padding = padPx + 'px';
    if (withLines && content) {
      const lines = content.split('\n');
      const table = document.createElement('div');
      table.className = 'carbon-line-numbers';
      const langClass = lang && lang !== 'none' ? 'language-' + lang : '';
      for (let i = 0; i < lines.length; i++) {
        const row = document.createElement('div');
        row.className = 'carbon-line';
        const numCell = document.createElement('span');
        numCell.className = 'carbon-line-num';
        numCell.textContent = i + 1;
        const contentCell = document.createElement('span');
        contentCell.className = 'carbon-line-content';
        if (window.Prism && langClass) {
          const code = document.createElement('code');
          code.textContent = lines[i] || ' ';
          code.className = langClass;
          Prism.highlightElement(code);
          contentCell.appendChild(code);
        } else contentCell.textContent = lines[i] || ' ';
        row.appendChild(numCell);
        row.appendChild(contentCell);
        table.appendChild(row);
      }
      codeWrap.appendChild(table);
    } else {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = content;
      code.className = lang && lang !== 'none' ? 'language-' + lang : '';
      if (window.Prism && lang && lang !== 'none') Prism.highlightElement(code);
      pre.appendChild(code);
      codeWrap.appendChild(pre);
    }
    root.appendChild(codeWrap);
    document.body.appendChild(root);
    try {
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: null, logging: false });
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ((currentPasteId && data.pastes.find(p => p.id === currentPasteId)?.title) || 'code').replace(/[<>:"/\\|?*]/g, '_').slice(0, 60) + '.png';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Image downloaded', 'success');
    } catch (err) {
      showToast('Export failed: ' + (err && err.message ? err.message : 'unknown'), 'error');
    }
    root.remove();
    closeModal(codeImageModal);
  });

  document.getElementById('btn-save-template')?.addEventListener('click', () => {
    const p = currentPasteId && data.pastes.find(x => x.id === currentPasteId);
    if (p) { p.template = true; saveData(data); if (user) saveCurrent(); }
  });

  const lineNumbersCheck = document.getElementById('opt-line-numbers');
  const wordWrapCheck = document.getElementById('opt-word-wrap');
  const container = document.querySelector('.editor-container');
  let lineNumbersEl = null;
  function updateLineNumbers() {
    if (!lineNumbersEl || !container) return;
    const lines = (pasteContent.value || '').split('\n').length;
    lineNumbersEl.textContent = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1).join('\n');
  }
  if (container) {
    lineNumbersEl = document.createElement('div');
    lineNumbersEl.id = 'line-numbers';
    lineNumbersEl.setAttribute('aria-hidden', 'true');
    container.insertBefore(lineNumbersEl, container.firstChild);
    pasteContent?.addEventListener('scroll', () => { if (lineNumbersEl) lineNumbersEl.scrollTop = pasteContent.scrollTop; });
  }
  const savedLineNum = getLocal('woxbin_line_numbers') === '1';
  if (lineNumbersCheck) { lineNumbersCheck.checked = savedLineNum; container?.classList.toggle('with-line-numbers', savedLineNum); }
  lineNumbersCheck?.addEventListener('change', () => {
    const on = lineNumbersCheck.checked;
    container?.classList.toggle('with-line-numbers', on);
    setLocal('woxbin_line_numbers', on ? '1' : '0');
    updateLineNumbers();
  });
  wordWrapCheck?.addEventListener('change', () => container?.classList.toggle('word-wrap', wordWrapCheck.checked));
  pasteContent?.addEventListener('input', () => updateLineNumbers());
  updateLineNumbers();
  const fontSizeSelect = document.getElementById('opt-font-size');
  const savedSize = getLocal('woxbin_font_size') || '14';
  if (fontSizeSelect) { fontSizeSelect.value = savedSize; pasteContent.style.fontSize = savedSize + 'px'; highlightCode.style.fontSize = savedSize + 'px'; }
  const ribbonSize = document.getElementById('ribbon-font-size');
  if (ribbonSize) ribbonSize.value = savedSize;
  fontSizeSelect?.addEventListener('change', () => { const v = fontSizeSelect.value; pasteContent.style.fontSize = v + 'px'; highlightCode.style.fontSize = v + 'px'; setLocal('woxbin_font_size', v); if (ribbonSize) ribbonSize.value = v; });
  const FONT_STACKS = { system: 'var(--font-mono)', cascadia: '"Cascadia Code", "Cascadia Mono", Consolas, monospace', fira: '"Fira Code", "Fira Mono", monospace', jetbrains: '"JetBrains Mono", monospace', source: '"Source Code Pro", monospace', consolas: 'Consolas, "Courier New", monospace', mono: 'monospace' };
  function applyEditorFont() {
    const key = document.getElementById('opt-font-family')?.value || 'system';
    const stack = FONT_STACKS[key] || FONT_STACKS.system;
    if (pasteContent) pasteContent.style.fontFamily = stack;
    if (highlightCode) highlightCode.style.fontFamily = stack;
    if (container) container.style.fontFamily = stack;
    const lineNumbersEl = document.getElementById('line-numbers');
    if (lineNumbersEl) lineNumbersEl.style.fontFamily = stack;
  }
  const fontFamilySelect = document.getElementById('opt-font-family');
  const savedFont = getLocal('woxbin_font_family') || 'system';
  if (fontFamilySelect) { fontFamilySelect.value = savedFont; applyEditorFont(); }
  const ribbonFont = document.getElementById('ribbon-font');
  if (ribbonFont) ribbonFont.value = savedFont;
  fontFamilySelect?.addEventListener('change', () => { applyEditorFont(); setLocal('woxbin_font_family', fontFamilySelect.value); if (ribbonFont) ribbonFont.value = fontFamilySelect.value; });
  const syntaxThemeSelect = document.getElementById('opt-syntax-theme');
  const THEMES = { tomorrow: 'prism-tomorrow.min.css', prism: 'prism.min.css', coy: 'prism-coy.min.css', dark: 'prism-dark.min.css' };
  syntaxThemeSelect?.addEventListener('change', () => { const name = syntaxThemeSelect.value; const link = document.getElementById('prism-theme'); if (link) link.href = PRISM_BASE + (THEMES[name] || THEMES.tomorrow); setLocal('woxbin_syntax_theme', name); updateHighlight(); });
  const savedSyntax = getLocal('woxbin_syntax_theme');
  if (syntaxThemeSelect) {
    const activeSyntax = savedSyntax || 'dark';
    syntaxThemeSelect.value = activeSyntax;
    if (document.getElementById('prism-theme')) {
      document.getElementById('prism-theme').href = PRISM_BASE + (THEMES[activeSyntax] || THEMES.dark);
    }
  }

  document.getElementById('btn-fullscreen')?.addEventListener('click', () => document.querySelector('.editor-panel')?.classList.toggle('fullscreen'));
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
  document.getElementById('bulk-delete')?.addEventListener('click', async () => {
    const ids = getSelectedPasteIds();
    if (!ids.length) return;
    if (!confirm('Delete ' + ids.length + ' selected paste(s)?')) return;
    if (user) { try { await Promise.all(ids.map(id => api('/api/pastes/' + id, { method: 'DELETE' }))); } catch (_) {} }
    ids.forEach(id => { data.pastes = data.pastes.filter(p => p.id !== id); });
    saveData(data);
    if (currentPasteId && ids.includes(currentPasteId)) { showEmpty(); currentPasteId = null; }
    renderPasteList();
    document.getElementById('bulk-bar')?.classList.add('hidden');
    showToast('Deleted ' + ids.length + ' paste(s)', 'success');
  });
  document.getElementById('bulk-move')?.addEventListener('click', async () => {
    const ids = getSelectedPasteIds();
    if (!ids.length) return;
    const sel = document.getElementById('bulk-move-folder');
    const target = sel ? sel.value : '';
    if (!target) return;
    const folderValue = target === '__none__' ? null : target;
    const items = data.pastes.filter(p => ids.includes(p.id));
    items.forEach(p => { p.folder = folderValue; p.updatedAt = Date.now(); });
    if (user) {
      for (const p of items) {
        try {
          await api('/api/pastes/' + encodeURIComponent(p.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(p)) });
        } catch (_) {}
      }
    } else {
      saveData(data);
    }
    if (currentPasteId) {
      const cp = data.pastes.find(x => x.id === currentPasteId);
      if (cp) pasteFolderSelect.value = cp.folder || '';
    }
    renderPasteList();
    showToast('Moved ' + ids.length + ' paste(s)', 'success');
  });
  document.getElementById('bulk-export')?.addEventListener('click', () => {
    const ids = getSelectedPasteIds();
    if (!ids.length) return;
    const selected = data.pastes.filter(p => ids.includes(p.id));
    const payload = { version: 1, exportedAt: new Date().toISOString(), pastes: selected, folders: data.folders };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'woxbin-selected-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); URL.revokeObjectURL(a.href);
    showToast('Exported ' + ids.length + ' paste(s)', 'success');
  });
  document.getElementById('bulk-clear')?.addEventListener('click', () => {
    document.querySelectorAll('.paste-select-cb:checked').forEach(cb => { cb.checked = false; });
    updateBulkBar();
  });
  document.getElementById('new-from-clipboard')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      newPaste();
      pasteContent.value = text;
      pasteTitle.value = 'From clipboard';
      updateHighlight();
      updatePasteStats();
      showToast('New paste from clipboard', 'success');
    } catch (_) { showToast('Could not read clipboard', 'error'); }
  });
  document.getElementById('fav-paste')?.addEventListener('click', () => {
    const p = currentPasteId && data.pastes.find(x => x.id === currentPasteId);
    if (p) { p.favorite = !p.favorite; saveData(data); if (user) saveCurrent(); renderPasteList(); }
  });
  document.getElementById('archive-paste')?.addEventListener('click', () => {
    const p = currentPasteId && data.pastes.find(x => x.id === currentPasteId);
    if (p) { p.archived = !p.archived; saveData(data); if (user) saveCurrent(); renderPasteList(); }
  });

  const dropZone = document.getElementById('editor-drop-zone');
  function handleDrop(e) {
    e.preventDefault();
    dropZone?.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('text/') && !/\.(txt|json|js|md|html|css|py|log)$/i.test(file.name)) return;
    const r = new FileReader();
    r.onload = () => { newPaste(); pasteContent.value = r.result || ''; pasteTitle.value = (file.name || 'Dropped').replace(/\.[^.]+$/, ''); updateHighlight(); updatePasteStats(); };
    r.readAsText(file);
  }
  document.body?.addEventListener('dragover', e => { e.preventDefault(); dropZone?.classList.add('drag-over'); });
  document.body?.addEventListener('dragleave', e => { if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) dropZone?.classList.remove('drag-over'); });
  document.body?.addEventListener('drop', handleDrop);

  const offlineBar = document.getElementById('offline-bar');
  function setOffline(v) { offlineBar?.classList.toggle('hidden', v); }
  setOffline(navigator.onLine);
  window.addEventListener('online', () => setOffline(true));
  window.addEventListener('offline', () => setOffline(false));

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
  });
  document.querySelectorAll('.auth-modal').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
  });

  const appContainer = document.getElementById('app-container');
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => appContainer?.classList.toggle('sidebar-open'));
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => appContainer?.classList.remove('sidebar-open'));

  document.getElementById('raw-view-exit')?.addEventListener('click', () => {
    const params = new URLSearchParams(location.search);
    params.delete('raw');
    const q = params.toString();
    const newUrl = location.pathname + (q ? '?' + q : '') + location.hash;
    history.replaceState(null, '', newUrl);
    document.getElementById('raw-view')?.classList.add('hidden');
  });
  document.getElementById('raw-view-copy')?.addEventListener('click', () => {
    const content = document.getElementById('raw-view-content');
    if (content) navigator.clipboard.writeText(content.textContent || '').then(() => showToast('Copied', 'success'));
  });
}

(function init() {
  if (shouldShowLanding()) {
    document.getElementById('landing-get-started').addEventListener('click', goToApp);
    const cta2 = document.getElementById('landing-get-started-2');
    if (cta2) cta2.addEventListener('click', goToApp);
    return;
  }
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  runAppInit();
})();
