/**
 * WOX-Bin - 06-account-bulk.js
 * Export/import, theme listener, auth buttons, account modal, keys, sessions, claim anon, delete account, bulk bar, copy to mine, comments, pin, etc.
 */
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
      if (!id || !(await showConfirm('Revoke this API key? It will stop working immediately.', 'Revoke key', { primaryLabel: 'Revoke', danger: true }))) return;
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
      if (!sid || !(await showConfirm('Revoke this session?', 'Revoke session', { primaryLabel: 'Revoke', danger: true }))) return;
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
  const displayNameEl = document.getElementById('account-display-name');
  if (displayNameEl) displayNameEl.value = user.displayName ?? '';
  const pwForm = document.getElementById('account-password-form');
  if (pwForm) { pwForm.reset(); document.getElementById('account-password-error')?.classList.add('hidden'); }
  const keyResult = document.getElementById('account-key-result');
  if (keyResult) { keyResult.classList.add('hidden'); keyResult.querySelector('#account-key-token').textContent = ''; }
  const delPw = document.getElementById('account-delete-password');
  if (delPw) delPw.value = '';
  const keysList = document.getElementById('account-keys-list');
  const sessionsList = document.getElementById('account-sessions-list');
  if (keysList) {
    keysList.innerHTML = '<li class="dim">Loading...</li>';
  }
  if (sessionsList) {
    sessionsList.innerHTML = '<li class="dim">Loading...</li>';
  }
  try {
    const [meRes, keysRes, sessRes] = await Promise.all([api('/api/me'), api('/api/keys'), api('/api/me/sessions')]);
    if (meRes.user) {
      if (usernameEl) usernameEl.textContent = meRes.user.username || '';
      if (displayNameEl) displayNameEl.value = meRes.user.displayName ?? '';
      user = { ...user, ...meRes.user };
    }
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
document.getElementById('account-save-display-name')?.addEventListener('click', async () => {
  const input = document.getElementById('account-display-name');
  const displayName = input ? input.value.trim().slice(0, 64) : '';
  try {
    await api('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: displayName || null }) });
    if (user) user.displayName = displayName || null;
    showToast('Display name saved', 'success');
  } catch (e) {
    showToast((e.body && e.body.error) || 'Failed to save display name', 'error');
  }
});
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
  if (!(await showConfirm('Log out all other sessions?', 'Log out other sessions', { primaryLabel: 'Log out others', danger: true }))) return;
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
  if (!(await showConfirm('Delete your account permanently? This cannot be undone.', 'Delete account', { primaryLabel: 'Delete account', danger: true }))) return;
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

async function seedLocalExamplePastesIfMissing() {
  // Anonymous mode stores pastes only in localStorage, so we seed locally.
  // We only do this if the user appears to have no example pastes yet.
  if (!Array.isArray(data.pastes)) return;
  const requiredExampleIds = ['example-welcome', 'example-prism-js', 'example-prism-python', 'example-prism-html', 'example-shortcuts'];
  if (requiredExampleIds.every(id => data.pastes.some(p => p && p.id === id))) return;

  try {
    const res = await fetch(location.origin + '/samples/example-pastes.json', { credentials: 'include' });
    if (!res.ok) return;
    const json = await res.json();
    const templates = Array.isArray(json.pastes) ? json.pastes : [];
    if (!templates.length) return;

    if (Array.isArray(json.folders) && json.folders.length) {
      data.folders = Array.isArray(data.folders) ? data.folders : [...DEFAULT_FOLDERS];
      for (const f of json.folders) {
        if (typeof f === 'string' && f && !data.folders.includes(f)) data.folders.push(f);
      }
    }

    let changed = false;
    for (const tpl of templates) {
      if (!tpl || typeof tpl.id !== 'string') continue;
      const id = tpl.id;
      const existing = data.pastes.find(p => p && p.id === id);
      const seeded = normalizePaste({ ...tpl });
      seeded.pinned = !!tpl.pinned;
      seeded.favorite = !!tpl.favorite;
      seeded.archived = !!tpl.archived;
      seeded.template = !!tpl.template;

      if (!existing) {
        data.pastes.unshift(seeded);
        changed = true;
      } else {
        Object.assign(existing, seeded);
        changed = true;
      }
    }

    if (changed) saveData(data);
  } catch (_) {
    // Ignore seeding errors; app should still work without defaults.
  }
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

  // If the visitor is anonymous and there are no example pastes yet,
  // seed them so everyone starts with the same defaults.
  if (!user) await seedLocalExamplePastesIfMissing();

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
