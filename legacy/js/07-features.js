/**
 * WOX-Bin - 07-features.js
 * setupExtraFeatures: autosave, sort/filter, find/replace, share, version/diff, templates, code image, shortcuts, drop zone, modals, raw view.
 */
function setupExtraFeatures() {
  const ind = document.getElementById('autosave-indicator');
  function setAutoSaveIndicator(text) { if (ind) ind.textContent = text; }
  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setAutoSaveIndicator('...');
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

  function renderTemplatesList(list, modal) {
    const userTemplates = data.pastes.filter(p => p.template && !isPasteExpired(p));
    let html = '';
    if (BUILTIN_TEMPLATES.length) {
      html += '<li class="templates-section-label">Built-in</li>';
      html += BUILTIN_TEMPLATES.map(t => `<li><button type="button" class="btn btn-ghost btn-sm use-builtin-template" data-id="${escapeAttr(t.id)}">Use</button> ${escapeHtml(t.title)}</li>`).join('');
    }
    if (userTemplates.length) {
      html += '<li class="templates-section-label">Your templates</li>';
      html += userTemplates.map(p => `<li><button type="button" class="btn btn-ghost btn-sm use-template" data-id="${escapeAttr(p.id)}">Use</button> <button type="button" class="btn btn-ghost btn-sm delete-template" data-id="${escapeAttr(p.id)}" title="Remove from templates">Delete</button> ${escapeHtml(p.title || 'Untitled')}</li>`).join('');
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
    list.querySelectorAll('.delete-template').forEach(btn => btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const p = data.pastes.find(x => x.id === id);
      if (!p || !(await showConfirm('Remove "' + (p.title || 'Untitled') + '" from templates? The paste will stay in your list.', 'Remove from templates', { primaryLabel: 'Remove' }))) return;
      p.template = false;
      if (user) {
        try {
          await api('/api/pastes/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pasteToApi(p)) });
        } catch (_) {}
      } else saveData(data);
      showToast('Removed from templates', 'success');
      renderTemplatesList(list, modal);
    }));
  }
  document.getElementById('templates-btn')?.addEventListener('click', () => {
    const list = document.getElementById('templates-list');
    const modal = document.getElementById('templates-modal');
    if (!list || !modal) return;
    renderTemplatesList(list, modal);
    openModal(modal);
  });
  document.getElementById('templates-close')?.addEventListener('click', () => closeModal(document.getElementById('templates-modal')));

  // --- Code image (Carbon-style) export: options, build, preview, download
  const codeImageModal = document.getElementById('code-image-modal');
  const codeImagePreview = document.getElementById('code-image-preview');
  function getCodeImageOptions() {
    const bgEl = document.getElementById('code-image-bg');
    const padEl = document.getElementById('code-image-padding');
    const fontEl = document.getElementById('code-image-font-size');
    const radiusEl = document.getElementById('code-image-radius');
    const shadowEl = document.getElementById('code-image-shadow');
    return {
      bg: (bgEl && bgEl.value) || 'dark',
      padding: (padEl && padEl.value) || 'medium',
      fontSize: (fontEl && fontEl.value) || '14',
      radius: (radiusEl && radiusEl.value) || '10',
      shadow: (shadowEl && shadowEl.value) || 'md',
      withWindow: document.getElementById('code-image-window') && document.getElementById('code-image-window').checked,
      withLangLabel: document.getElementById('code-image-lang-label') && document.getElementById('code-image-lang-label').checked,
      withLines: document.getElementById('code-image-lines') && document.getElementById('code-image-lines').checked
    };
  }
  function buildCarbonRoot(container, opts) {
    if (!container) return;
    const content = (pasteContent && pasteContent.value) || ' ';
    const lang = pasteLanguage ? pasteLanguage.value : 'none';
    container.innerHTML = '';
    container.className = 'carbon-export-root carbon-bg-' + (opts.bg === 'current' ? 'dark' : opts.bg);
    const radius = parseInt(opts.radius, 10) || 0;
    const shadowMap = { none: 'none', sm: '0 2px 8px rgba(0,0,0,0.25)', md: '0 4px 20px rgba(0,0,0,0.35)', lg: '0 8px 32px rgba(0,0,0,0.45)' };
    container.style.borderRadius = radius + 'px';
    container.style.boxShadow = shadowMap[opts.shadow] || shadowMap.md;
    if (opts.bg === 'current') {
      container.style.backgroundColor = getComputedStyle(document.body).backgroundColor || '#1e1e1e';
    } else if (opts.bg === 'dark') container.style.backgroundColor = '#1e1e1e';
    else if (opts.bg === 'darker') container.style.backgroundColor = '#0d1117';
    else if (opts.bg === 'light') { container.style.backgroundColor = '#f6f8fa'; container.classList.add('carbon-bg-light'); }
    const padPx = opts.padding === 'small' ? 12 : opts.padding === 'large' ? 24 : 16;
    const fontSize = opts.fontSize || '14';
    if (opts.withWindow) {
      const bar = document.createElement('div');
      bar.className = 'carbon-title-bar';
      const dots = '<span class="carbon-dot red"></span><span class="carbon-dot yellow"></span><span class="carbon-dot green"></span>';
      const langLabel = opts.withLangLabel && lang && lang !== 'none' ? '<span class="carbon-title-label">' + escapeHtml(lang) + '</span>' : '';
      bar.innerHTML = dots + langLabel;
      container.appendChild(bar);
    }
    const codeWrap = document.createElement('div');
    codeWrap.className = 'carbon-code-wrap';
    codeWrap.style.padding = padPx + 'px';
    codeWrap.style.fontSize = fontSize + 'px';
    const langClass = lang && lang !== 'none' ? 'language-' + lang : '';
    if (opts.withLines && content) {
      const lines = content.split('\n');
      const table = document.createElement('div');
      table.className = 'carbon-line-numbers';
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
          code.style.fontSize = fontSize + 'px';
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
      code.className = langClass;
      code.style.fontSize = fontSize + 'px';
      if (window.Prism && lang && lang !== 'none') Prism.highlightElement(code);
      pre.appendChild(code);
      codeWrap.appendChild(pre);
    }
    container.appendChild(codeWrap);
  }
  function refreshCodeImagePreview() {
    if (codeImagePreview) buildCarbonRoot(codeImagePreview, getCodeImageOptions());
  }
  document.getElementById('btn-code-image')?.addEventListener('click', () => {
    openModal(codeImageModal);
    refreshCodeImagePreview();
  });
  document.getElementById('code-image-close')?.addEventListener('click', () => closeModal(codeImageModal));
  codeImageModal?.addEventListener('click', (e) => { if (e.target === codeImageModal) closeModal(codeImageModal); });
  codeImageModal?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(codeImageModal); });
  ['code-image-bg', 'code-image-padding', 'code-image-font-size', 'code-image-radius', 'code-image-shadow', 'code-image-window', 'code-image-lang-label', 'code-image-lines'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', refreshCodeImagePreview);
    if (el && el.type === 'checkbox') el.addEventListener('input', refreshCodeImagePreview);
  });
  document.getElementById('code-image-download')?.addEventListener('click', async () => {
    if (typeof html2canvas !== 'function') { showToast('Export library not loaded', 'error'); return; }
    const opts = getCodeImageOptions();
    const content = (pasteContent && pasteContent.value) || ' ';
    const root = document.createElement('div');
    root.id = 'carbon-export-root';
    root.style.position = 'fixed';
    root.style.left = '-99999px';
    root.style.top = '0';
    root.style.zIndex = '-1';
    buildCarbonRoot(root, opts);
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
  const indentGuidesCheck = document.getElementById('opt-indent-guides');
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
  const savedIndentGuides = getLocal('woxbin_indent_guides') === '1';
  if (indentGuidesCheck) {
    indentGuidesCheck.checked = savedIndentGuides;
    container?.classList.toggle('with-indent-guides', savedIndentGuides);
    indentGuidesCheck.addEventListener('change', () => {
      const on = indentGuidesCheck.checked;
      container?.classList.toggle('with-indent-guides', on);
      setLocal('woxbin_indent_guides', on ? '1' : '0');
    });
  }
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
    if (!(await showConfirm('Delete ' + ids.length + ' selected paste(s)?', 'Delete pastes', { primaryLabel: 'Delete', danger: true }))) return;
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

  (function setupCollapsibleUI() {
    const UI_KEYS = { header: 'woxbin_ui_header_collapsed', sidebar: 'woxbin_ui_sidebar_collapsed', comments: 'woxbin_ui_comments_collapsed' };
    function getStored(key) { try { return localStorage.getItem(key) === '1'; } catch (_) { return false; } }
    function setStored(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) {} }

    const headerEl = document.getElementById('app-header');
    const headerBtn = document.getElementById('header-collapse-btn');
    if (headerEl && headerBtn) {
      if (getStored(UI_KEYS.header)) headerEl.classList.add('header-collapsed');
      function updateHeaderBtnLabel() {
        const collapsed = headerEl.classList.contains('header-collapsed');
        headerBtn.setAttribute('aria-label', collapsed ? 'Expand header' : 'Minimize header');
        headerBtn.setAttribute('title', collapsed ? 'Expand header' : 'Minimize header');
      }
      updateHeaderBtnLabel();
      headerBtn.addEventListener('click', () => {
        headerEl.classList.toggle('header-collapsed');
        setStored(UI_KEYS.header, headerEl.classList.contains('header-collapsed'));
        updateHeaderBtnLabel();
      });
    }

    const sidebarEl = document.getElementById('sidebar');
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    const sidebarExpandBtn = document.getElementById('sidebar-expand-btn');
    if (sidebarEl && sidebarCollapseBtn && sidebarExpandBtn) {
      if (getStored(UI_KEYS.sidebar)) sidebarEl.classList.add('sidebar-collapsed');
      sidebarCollapseBtn.addEventListener('click', () => {
        sidebarEl.classList.add('sidebar-collapsed');
        setStored(UI_KEYS.sidebar, true);
      });
      sidebarExpandBtn.addEventListener('click', () => {
        sidebarEl.classList.remove('sidebar-collapsed');
        setStored(UI_KEYS.sidebar, false);
      });
    }

    const commentsEl = document.getElementById('public-comments');
    const commentsToggle = document.getElementById('public-comments-toggle');
    if (commentsEl && commentsToggle) {
      if (getStored(UI_KEYS.comments)) commentsEl.classList.add('comments-collapsed');
      commentsToggle.setAttribute('aria-expanded', commentsEl.classList.contains('comments-collapsed') ? 'false' : 'true');
      commentsToggle.addEventListener('click', () => {
        commentsEl.classList.toggle('comments-collapsed');
        const expanded = !commentsEl.classList.contains('comments-collapsed');
        setStored(UI_KEYS.comments, !expanded);
        commentsToggle.setAttribute('aria-expanded', String(expanded));
      });
    }
  })();

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

  document.getElementById('password-remove-protection')?.addEventListener('click', async () => {
    const id = currentPasteId;
    if (!id) return;
    const p = data.pastes.find(x => x.id === id);
    if (!p) return;
    const confirmed = await showConfirm(
      'Remove password protection from this paste? You\'ll be able to open it without a password. (Only works if you\'re the owner.)',
      'Remove protection',
      { primaryLabel: 'Remove protection' }
    );
    if (!confirmed) return;
    if (user) {
      try {
        const payload = pasteToApi({ ...p, password: null });
        await api('/api/pastes/' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        p.password = null;
        saveData(data);
        selectPaste(id, true);
        showToast('Protection removed', 'success');
      } catch (e) {
        showAlert((e.body && e.body.error) || 'Only the paste owner can remove the password.', 'Cannot remove');
      }
    } else {
      p.password = null;
      saveData(data);
      selectPaste(id, true);
      showToast('Protection removed', 'success');
    }
  });
}
