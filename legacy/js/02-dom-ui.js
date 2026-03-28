/**
 * WOX-Bin – 02-dom-ui.js
 * DOM refs, filter constants, getFilteredPastes, formatDate, escape, modals, toast, renderPasteList, bulk bar, stats.
 */
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

// --- Filter: folder or special "Public" list
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
  if (ts == null || ts === '') return '';
  let ms = Number(ts);
  if (Number.isNaN(ms)) return '';
  if (ms < 1e12) ms *= 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

/** In-app card dialog (replaces alert/confirm/prompt). Returns a Promise. */
function showAppDialog(opts) {
  const dialog = document.getElementById('app-dialog');
  const titleEl = document.getElementById('app-dialog-title');
  const messageEl = document.getElementById('app-dialog-message');
  const inputWrap = document.getElementById('app-dialog-input-wrap');
  const inputEl = document.getElementById('app-dialog-input');
  const actionsEl = document.getElementById('app-dialog-actions');
  if (!dialog || !titleEl || !messageEl || !actionsEl) return Promise.resolve(false);
  const title = opts.title != null ? opts.title : 'Confirm';
  const message = opts.message != null ? opts.message : '';
  const primaryLabel = opts.primaryLabel || 'OK';
  const primaryDanger = !!opts.primaryDanger;
  const cancelLabel = opts.cancelLabel != null ? opts.cancelLabel : 'Cancel';
  const withInput = !!opts.input;
  const defaultValue = opts.defaultValue != null ? String(opts.defaultValue) : '';
  titleEl.textContent = title;
  messageEl.textContent = message;
  if (withInput && inputWrap && inputEl) {
    inputWrap.classList.remove('hidden');
    inputEl.value = defaultValue;
    inputEl.style.display = '';
  } else if (inputWrap) {
    inputWrap.classList.add('hidden');
  }
  actionsEl.innerHTML = '';
  let resolveDialog;
  const promise = new Promise(function (resolve) { resolveDialog = resolve; });
  function finish(value) {
    closeModal(dialog);
    if (resolveDialog) resolveDialog(value);
  }
  if (cancelLabel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener('click', () => finish(withInput ? null : false));
    actionsEl.appendChild(cancelBtn);
  }
  const primaryBtn = document.createElement('button');
  primaryBtn.type = 'button';
  primaryBtn.className = 'btn' + (primaryDanger ? ' btn-danger' : '');
  primaryBtn.textContent = primaryLabel;
  primaryBtn.addEventListener('click', () => {
    if (withInput && inputEl) finish(inputEl.value.trim());
    else finish(true);
  });
  actionsEl.appendChild(primaryBtn);
  openModal(dialog);
  if (withInput && inputEl) {
    inputEl.focus();
    inputEl.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Enter') { primaryBtn.click(); inputEl.removeEventListener('keydown', onKey); }
      if (e.key === 'Escape') { finish(null); inputEl.removeEventListener('keydown', onKey); }
    });
  }
  dialog.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { finish(withInput ? null : false); }
  }, { once: true });
  dialog.addEventListener('click', function overlayClick(e) {
    if (e.target === dialog) finish(withInput ? null : false);
  }, { once: true });
  return promise;
}

/** Card-style alert: message + OK. Returns Promise that resolves when dismissed. */
function showAlert(message, title) {
  return showAppDialog({ title: title || 'Message', message: message, primaryLabel: 'OK', cancelLabel: null });
}

/** Card-style confirm: message + Cancel / OK (or custom primary). Returns Promise<boolean>. */
function showConfirm(message, title, options) {
  return showAppDialog({
    title: title != null ? title : 'Confirm',
    message: message,
    primaryLabel: (options && options.primaryLabel) || 'OK',
    primaryDanger: !!(options && options.danger),
    cancelLabel: 'Cancel'
  });
}

/** Card-style prompt: message + input + Cancel / OK. Returns Promise<string|null>. */
function showPrompt(message, defaultValue, title) {
  return showAppDialog({
    title: title != null ? title : 'Input',
    message: message,
    input: true,
    defaultValue: defaultValue != null ? defaultValue : '',
    primaryLabel: 'OK',
    cancelLabel: 'Cancel'
  });
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
        const preview = (p.content || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const previewHtml = preview ? ('<div class="paste-item-preview">' + escapeHtml(preview) + (preview.length >= 80 ? '\u2026' : '') + '</div>') : '';
        return `
        <div class="paste-item ${p.id === activeId ? 'active' : ''}" data-id="${escapeAttr(p.id)}">
          <label class="paste-item-check"><input type="checkbox" class="paste-select-cb" data-id="${escapeAttr(p.id)}" /></label>
          <div class="paste-item-body">
            <div class="paste-item-title">${escapeHtml(p.title || 'Untitled')}${fav}${pin}${arch}${exp}</div>
            ${previewHtml}
            <div class="paste-item-meta">${p.folder ? escapeHtml(p.folder) + ' \u00b7 ' : ''}${views} view${views !== 1 ? 's' : ''} \u00b7 ${escapeHtml(formatDate(p.updatedAt || p.createdAt))}</div>
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
  pasteList.onchange = (e) => {
    if (e.target && e.target.classList.contains('paste-select-cb')) updateBulkBar();
  };
  updateStats();
  updateTagsDatalist();
  updateBulkBar();
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
