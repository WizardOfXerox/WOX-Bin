/**
 * WOX-Bin - 05-folders-theme.js
 * Theme (Prism), setFolder, initFolders, add/delete/rename folder, bulk move, nav buttons.
 */
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
  if (!(await showConfirm('Delete folder "' + name + '"? Pastes in this folder will be moved to "No folder".', 'Delete folder', { primaryLabel: 'Delete', danger: true }))) return;
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
  const next = await showPrompt('Rename folder to:', name, 'Rename folder');
  if (next == null || next === '') return;
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
  sel.innerHTML = '<option value="">Move to...</option><option value="__none__">No folder</option>' +
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
    showAlert('Could not read clipboard. Try pasting with Ctrl+V.', 'Clipboard');
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
    showAlert('Could not copy to clipboard.', 'Clipboard');
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
    showAlert('Could not copy link.', 'Copy link');
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
