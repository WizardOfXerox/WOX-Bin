/**
 * WOX-Bin – 04-paste-ops.js
 * Content/folder listeners, saveCurrent, deleteCurrent, newPaste, duplicatePaste, download, togglePin, export/import.
 */
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
  if (duplicate && !(await showConfirm('Another paste has the same content: "' + (duplicate.title || 'Untitled') + '". Save anyway?', 'Save anyway?'))) return;
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
      showAlert('Failed to save: ' + (e.body && e.body.error || e.status), 'Save failed');
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
  const id = currentPasteId;
  const protectedExampleIds = new Set(['example-welcome', 'example-prism-js', 'example-prism-python', 'example-prism-html', 'example-shortcuts']);
  if (String(id).startsWith('example-seed-') || protectedExampleIds.has(String(id))) {
    showToast('Default example pastes cannot be deleted.', 'error');
    return;
  }
  if (!(await showConfirm('Delete this paste?', 'Delete paste', { primaryLabel: 'Delete', danger: true }))) return;
  if (user) {
    try {
      await api('/api/pastes/' + id, { method: 'DELETE' });
    } catch (e) {
      showAlert('Failed to delete', 'Delete failed');
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
      showAlert('Failed to create: ' + (e.body && e.body.error || e.status), 'Create failed');
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
  pasteFolderSelect.value = defaultFolder || '';
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
      showToast('Imported ' + (payload.pastes || []).length + ' paste(s).', 'success');
    } catch (e) {
      showAlert('Invalid backup file.', 'Import failed');
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
