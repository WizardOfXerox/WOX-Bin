/**
 * WOX-Bin - 03-editor.js
 * Editor UI: showEmpty/showEditor, selectPaste, selectPublicPaste, loadComments, highlight, bracket match, markdown preview, syncScroll.
 */
function showEmpty() {
  editorEmpty.classList.remove('hidden');
  editorWrap.classList.add('hidden');
  passwordPrompt.classList.add('hidden');
  hidePublicPastePasswordPrompt();
  document.getElementById('public-comments')?.classList.add('hidden');
  currentPasteId = null;
}

function showEditor() {
  editorEmpty.classList.add('hidden');
  editorWrap.classList.remove('hidden');
  passwordPrompt.classList.add('hidden');
  hidePublicPastePasswordPrompt();
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
  if (!skipPasswordCheck && hasRealPassword(p.password)) {
    if (user) {
      selectPaste(id, true);
      return;
    }
    currentPasteId = id;
    showPasswordPrompt();
    passwordSubmit.onclick = () => {
      if (passwordInput.value === p.password) {
        selectPaste(id, true);
      } else {
        showAlert('Wrong password.', 'Wrong password');
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

function applyPublicPasteData(p, id) {
  id = id || p.id;
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
}

function hidePublicPastePasswordPrompt() {
  passwordPrompt.classList.remove('public-paste-mode');
  const hint = passwordPrompt.querySelector('.password-prompt-hint');
  const removeBtn = passwordPrompt.querySelector('#password-remove-protection');
  if (hint) hint.style.display = '';
  if (removeBtn) removeBtn.style.display = '';
  const msg = passwordPrompt.querySelector('.password-box p');
  if (msg) msg.textContent = 'This paste is protected.';
}

function showPublicPastePasswordPrompt(pasteId) {
  passwordPrompt.classList.add('public-paste-mode');
  const hint = passwordPrompt.querySelector('.password-prompt-hint');
  const removeBtn = passwordPrompt.querySelector('#password-remove-protection');
  if (hint) hint.style.display = 'none';
  if (removeBtn) removeBtn.style.display = 'none';
  const msg = passwordPrompt.querySelector('.password-box p');
  if (msg) msg.textContent = 'This paste is password-protected. Enter the password to view.';
  editorEmpty.classList.add('hidden');
  editorWrap.classList.add('hidden');
  passwordPrompt.classList.remove('hidden');
  passwordInput.value = '';
  passwordInput.focus();
  passwordSubmit.onclick = async () => {
    const pw = passwordInput.value;
    try {
      const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(pasteId) + '?password=' + encodeURIComponent(pw), { credentials: 'include' });
      if (res.status === 403) {
        showAlert('Wrong password.', 'Wrong password');
        return;
      }
      if (!res.ok) { showToast('Could not load paste', 'error'); return; }
      const p = await res.json();
      hidePublicPastePasswordPrompt();
      passwordPrompt.classList.add('hidden');
      applyPublicPasteData(p, pasteId);
    } catch (e) {
      showToast('Failed to load paste', 'error');
    }
  };
  passwordInput.onkeydown = (e) => { if (e.key === 'Enter') passwordSubmit.click(); };
}

async function selectPublicPaste(id) {
  try {
    const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(id), { credentials: 'include' });
    if (res.status === 403) {
      const b = await res.json().catch(() => ({}));
      if (b.requiresPassword) {
        showPublicPastePasswordPrompt(id);
        return;
      }
    }
    if (!res.ok) { showToast('Could not load paste', 'error'); return; }
    const p = await res.json();
    applyPublicPasteData(p, id);
  } catch (e) {
    showToast('Failed to load paste', 'error');
  }
}

function buildCommentTree(comments) {
  const byId = new Map();
  const roots = [];
  (comments || []).forEach(c => { byId.set(c.id, { ...c, children: [] }); });
  (comments || []).forEach(c => {
    const node = byId.get(c.id);
    if (c.parentId) {
      const parent = byId.get(c.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else roots.push(node);
  });
  roots.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return roots;
}

function renderCommentNode(node, pasteId, parentNode) {
  const meta = '@' + (node.username || 'user') + ' · ' + formatDate(node.createdAt);
  const parentMeta = parentNode
    ? '<div class="comment-reply-context">Replying to @' + escapeHtml(parentNode.username || 'user') + ': "' + escapeHtml(((parentNode.content || '').trim().slice(0, 80)) + (((parentNode.content || '').trim().length > 80) ? '...' : '')) + '"</div>'
    : '';
  let html = '<li class="comment-item" data-comment-id="' + escapeAttr(String(node.id)) + '">' +
    parentMeta +
    '<div class="meta">' + escapeHtml(meta) + '</div>' +
    '<div class="comment-body">' + escapeHtml(node.content || '') + '</div>' +
    '<button type="button" class="btn btn-ghost btn-sm comment-reply-btn" data-comment-id="' + escapeAttr(String(node.id)) + '" data-username="' + escapeAttr(node.username || '') + '">Reply</button>' +
    '<div class="comment-reply-form hidden" id="comment-reply-form-' + node.id + '">' +
      '<textarea class="comment-reply-input" rows="2" placeholder="Write a reply..." data-parent-id="' + escapeAttr(String(node.id)) + '"></textarea>' +
      '<div class="comment-reply-actions"><button type="button" class="btn btn-primary btn-sm comment-reply-send">Post</button> <button type="button" class="btn btn-ghost btn-sm comment-reply-cancel">Cancel</button></div>' +
    '</div>';
  if (node.children && node.children.length) {
    node.children.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    html += '<ul class="comment-children">' + node.children.map(child => renderCommentNode(child, pasteId, node)).join('') + '</ul>';
  }
  html += '</li>';
  return html;
}

async function loadComments(pasteId) {
  if (!pasteId) return;
  commentPasteId = pasteId;
  const listEl = document.getElementById('public-comments-list');
  if (!listEl) return;
  try {
    const res = await fetch(location.origin + '/api/pastes/' + encodeURIComponent(pasteId) + '/comments', { credentials: 'include' });
    if (!res.ok) { listEl.innerHTML = '<li class="comment-item">No comments yet.</li>'; return; }
    const json = await res.json();
    const arr = json.comments || [];
    const tree = buildCommentTree(arr);
    listEl.innerHTML = tree.length
      ? tree.map(node => renderCommentNode(node, pasteId)).join('')
      : '<li class="comment-item">No comments yet.</li>';
    listEl.querySelectorAll('.comment-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = document.getElementById('comment-reply-form-' + btn.dataset.commentId);
        if (form) {
          form.classList.remove('hidden');
          const textarea = form.querySelector('.comment-reply-input');
          if (textarea) textarea.focus();
        }
      });
    });
    listEl.querySelectorAll('.comment-reply-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('.comment-reply-form');
        if (form) {
          form.classList.add('hidden');
          const textarea = form.querySelector('.comment-reply-input');
          if (textarea) textarea.value = '';
        }
      });
    });
    listEl.querySelectorAll('.comment-reply-send').forEach(btn => {
      btn.addEventListener('click', async () => {
        const form = btn.closest('.comment-reply-form');
        if (!form) return;
        const textarea = form.querySelector('.comment-reply-input');
        const parentId = textarea && textarea.dataset.parentId;
        const content = (textarea && textarea.value ? textarea.value.trim() : '');
        if (!pasteId || !content) return;
        try {
          await api('/api/pastes/' + encodeURIComponent(pasteId) + '/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, parentId: parentId ? parseInt(parentId, 10) : null })
          });
          if (textarea) textarea.value = '';
          form.classList.add('hidden');
          await loadComments(pasteId);
          showToast('Reply posted', 'success');
        } catch (e) {
          showToast((e.body && e.body.error) || 'Could not post reply', 'error');
        }
      });
    });
  } catch (_) {
    listEl.innerHTML = '<li class="comment-item">Could not load comments.</li>';
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

