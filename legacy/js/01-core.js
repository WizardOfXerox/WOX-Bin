/**
 * WOX-Bin â€“ Personal paste & notes
 * Constants, storage, API, auth, expiry, data, state, language detection, recent views.
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
function hasRealPassword(val) {
  return val != null && String(val).trim() !== '';
}
function normalizePaste(p) {
  const password = hasRealPassword(p.password) ? String(p.password).trim() : null;
  return {
    ...p,
    password,
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
    password: hasRealPassword(p.password) ? p.password : null,
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
