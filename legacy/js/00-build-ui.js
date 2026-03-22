/**
 * WOX-Bin UI builder — injects the full app shell into #app-mount so index.html stays minimal.
 * Runs before 01-core.js … 08-init.js. Preserves all IDs and structure expected by the app.
 */
(function () {
  'use strict';

  var C = typeof WOXBIN_CONFIG !== 'undefined' ? WOXBIN_CONFIG : {};
  var opt = function (arr) { return C.optionHtml ? C.optionHtml(arr) : ''; };

  var appShell =
    '<div class="raw-view hidden" id="raw-view">' +
      '<div class="raw-view-header">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="raw-view-exit">← Exit raw view</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="raw-view-copy">Copy</button>' +
      '</div>' +
      '<pre id="raw-view-content" class="raw-view-content"></pre>' +
    '</div>' +
    '<header class="app-header" id="app-header">' +
      '<div class="app-header-inner">' +
        '<div class="app-header-left">' +
          '<h1 class="app-logo">WOX-Bin</h1>' +
          '<nav class="header-nav" id="header-nav">' +
            '<button type="button" class="header-nav-btn active" id="nav-my-pastes">My pastes</button>' +
            '<button type="button" class="header-nav-btn header-nav-public" id="nav-public-pastes">Public pastes</button>' +
          '</nav>' +
          '<button type="button" class="btn btn-primary" id="new-paste" title="New paste (Ctrl+N)">+ New</button>' +
          '<button type="button" class="btn btn-ghost btn-sm header-optional" id="new-from-clipboard" title="New paste from clipboard">📋 New from clipboard</button>' +
        '</div>' +
        '<div class="app-header-right">' +
          '<label class="theme-toggle header-optional" title="Theme">Theme: <select id="theme-select" aria-label="Theme">' + opt(C.THEMES || []) + '</select></label>' +
          '<div class="auth-section" id="auth-section">' +
            '<div class="auth-guest" id="auth-guest">' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-login">Sign in</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-register">Create account</button>' +
            '</div>' +
            '<div class="auth-user hidden" id="auth-user">' +
              '<span class="auth-username" id="auth-username"></span>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-account" title="Account settings">Account</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="btn-logout">Log out</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-ghost btn-sm header-collapse-btn" id="header-collapse-btn" aria-label="Minimize header" title="Minimize header">−</button>' +
        '</div>' +
      '</div>' +
    '</header>' +
    '<div class="auth-modal hidden" id="auth-modal">' +
      '<div class="auth-modal-box">' +
        '<h2 id="auth-modal-title">Sign in</h2>' +
        '<form id="auth-form">' +
          '<input type="text" id="auth-username-input" placeholder="Username" autocomplete="username" />' +
          '<input type="password" id="auth-password-input" placeholder="Password" autocomplete="current-password" />' +
          '<p class="auth-error hidden" id="auth-error"></p>' +
          '<button type="submit" class="btn" id="auth-submit">Sign in</button>' +
        '</form>' +
        '<button type="button" class="btn btn-ghost btn-sm auth-modal-close" id="auth-modal-close">Cancel</button>' +
      '</div>' +
    '</div>' +
    '<div class="modal-overlay hidden" id="account-settings-modal">' +
      '<div class="modal-box account-settings-box">' +
        '<h2>Account settings</h2>' +
        '<section class="account-section"><h3>Profile</h3><p class="account-username"><strong>Username:</strong> <span id="account-username"></span></p><p class="account-display-name"><label>Display name (for public pastes): <input type="text" id="account-display-name" placeholder="Optional" maxlength="64" /></label></p><button type="button" class="btn btn-ghost btn-sm" id="account-save-display-name">Save display name</button></section>' +
        '<section class="account-section"><h3>Change password</h3>' +
          '<form id="account-password-form">' +
            '<input type="password" id="account-current-password" placeholder="Current password" autocomplete="current-password" />' +
            '<input type="password" id="account-new-password" placeholder="New password" autocomplete="new-password" />' +
            '<input type="password" id="account-confirm-password" placeholder="Confirm new password" autocomplete="new-password" />' +
            '<p class="auth-error hidden" id="account-password-error"></p>' +
            '<button type="submit" class="btn">Change password</button>' +
          '</form>' +
        '</section>' +
        '<section class="account-section"><h3>API keys</h3>' +
          '<p class="modal-hint">Use API keys to create pastes from the command line or scripts. Keep them secret.</p>' +
          '<ul id="account-keys-list" class="account-keys-list"></ul>' +
          '<div class="account-keys-actions">' +
            '<input type="text" id="account-key-label" placeholder="Key label (e.g. CI)" maxlength="64" />' +
            '<button type="button" class="btn btn-ghost btn-sm" id="account-create-key">Create key</button>' +
          '</div>' +
          '<div class="account-key-result hidden" id="account-key-result"><p>Copy your new key now — it won\'t be shown again:</p><code id="account-key-token"></code></div>' +
        '</section>' +
        '<section class="account-section"><h3>Sessions</h3>' +
          '<p class="modal-hint">Signed-in devices and browsers. Revoke any session you do not recognize.</p>' +
          '<ul id="account-sessions-list" class="account-keys-list"></ul>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="account-revoke-others">Log out other sessions</button>' +
        '</section>' +
        '<section class="account-section"><h3>Webhook (new paste)</h3>' +
          '<p class="modal-hint">Optional URL to POST when you create a paste. Payload: <code>{"event":"paste.created","paste":{...}}</code></p>' +
          '<input type="url" id="account-webhook-url" placeholder="https://..." style="width:100%;max-width:400px" />' +
          '<button type="button" class="btn btn-ghost btn-sm" id="account-save-webhook">Save webhook</button>' +
        '</section>' +
        '<section class="account-section"><h3>Anonymous pastes</h3>' +
          '<p class="modal-hint">Claim anonymous pastes saved in this browser so you can edit/delete them from your account.</p>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="account-claim-anon">Claim my anonymous pastes</button>' +
        '</section>' +
        '<section class="account-section account-danger"><h3>Danger zone</h3>' +
          '<p class="modal-hint">Delete your account and all its pastes permanently.</p>' +
          '<input type="password" id="account-delete-password" placeholder="Confirm password" autocomplete="current-password" />' +
          '<button type="button" class="btn btn-danger" id="account-delete-btn">Delete account</button>' +
        '</section>' +
        '<button type="button" class="btn btn-ghost" id="account-settings-close">Close</button>' +
      '</div>' +
    '</div>' +
    '<div class="app-body">' +
      '<aside class="sidebar" id="sidebar">' +
        '<div class="sidebar-collapse-row">' +
          '<button type="button" class="btn btn-ghost btn-sm sidebar-expand-btn" id="sidebar-expand-btn" aria-label="Expand sidebar" title="Expand sidebar">☰</button>' +
        '</div>' +
        '<div class="sidebar-content">' +
        '<div class="sidebar-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="export-all" title="Export all pastes (backup)">Export</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="import-btn" title="Import from file">Import file</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="import-url-btn" title="Import from URL">Import URL</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="templates-btn" title="Templates">Templates</button>' +
          '<input type="file" id="import-file" accept=".json" hidden />' +
        '</div>' +
        '<div class="search-wrap"><input type="search" id="search" placeholder="Search pastes..." autocomplete="off" /></div>' +
        '<div class="sort-wrap"><label class="sort-label">Sort:</label><select id="sort-pastes" title="Sort pastes">' + opt(C.SORT_OPTIONS || []) + '</select></div>' +
        '<div class="filter-quick">' +
          '<button type="button" class="btn btn-ghost btn-sm filter-btn" data-filter="all" id="filter-all">All</button>' +
          '<button type="button" class="btn btn-ghost btn-sm filter-btn" data-filter="favorites" id="filter-favorites">★ Favorites</button>' +
          '<button type="button" class="btn btn-ghost btn-sm filter-btn" data-filter="recent" id="filter-recent">Recent</button>' +
          '<button type="button" class="btn btn-ghost btn-sm filter-btn" data-filter="archived" id="filter-archived">Archive</button>' +
        '</div>' +
        '<div class="stats-bar" id="stats-bar"><span id="stats-text">0 pastes</span></div>' +
        '<div class="bulk-bar hidden" id="bulk-bar">' +
          '<span id="bulk-count">0 selected</span>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="bulk-delete">Delete</button>' +
          '<select id="bulk-move-folder" title="Move selected to folder"><option value="">Move to…</option></select>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="bulk-move">Move</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="bulk-export">Export</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="bulk-clear">Clear</button>' +
        '</div>' +
        '<div class="folders">' +
          '<div class="folder-buttons" id="folder-buttons"></div>' +
          '<div class="folder-actions">' +
            '<input type="text" id="new-folder-name" placeholder="New folder..." maxlength="32" />' +
            '<button type="button" class="btn btn-ghost" id="add-folder">Add</button>' +
            '<button type="button" class="btn btn-ghost" id="rename-folder">Rename selected</button>' +
          '</div>' +
        '</div>' +
        '<nav class="paste-list" id="paste-list" aria-label="Your pastes"></nav>' +
        '</div>' +
      '</aside>' +
      '<button type="button" class="btn btn-ghost btn-sm sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Minimize sidebar" title="Minimize sidebar">◀</button>' +
      '<main class="editor-panel">' +
        '<button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-label="Open menu" title="Menu">☰</button>' +
        '<div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>' +
        '<div class="offline-bar hidden" id="offline-bar">You\'re offline. Changes will sync when back online.</div>' +
        '<div class="editor-empty" id="editor-empty">' +
          '<p>No paste selected</p><p>Create a new paste, pick one from the list, or drop a file here.</p>' +
        '</div>' +
        '<div class="editor-wrap hidden" id="editor-wrap">' +
          '<div class="editor-toolbar">' +
            '<div class="toolbar-row-primary">' +
              '<input type="text" id="paste-title" placeholder="Paste name / title" class="toolbar-title-input" />' +
              '<input type="text" id="paste-custom-id" placeholder="Custom link id (slug)" title="Optional: letters, numbers, _ and -" maxlength="64" class="toolbar-slug-input" />' +
              '<select id="paste-folder" title="Folder"><option value="">No folder</option></select>' +
              '<select id="paste-category" title="Category">' + opt(C.CATEGORIES || []) + '</select>' +
              '<select id="paste-language" title="Syntax">' + opt(C.LANGUAGES || []) + '</select>' +
              '<select id="paste-expiration" title="Expiration">' + opt(C.EXPIRATION || []) + '</select>' +
              '<select id="paste-exposure" title="Exposure">' + opt(C.EXPOSURE || []) + '</select>' +
              '<button type="button" class="btn" id="save-paste" style="margin-left:auto">Save</button>' +
            '</div>' +
            '<details class="editor-toolbar-more"><summary>More options</summary><div class="editor-toolbar-more-inner">' +
            '<div class="toolbar-row"><label class="toolbar-label">Password:</label><input type="password" id="paste-password" placeholder="Optional" autocomplete="new-password" /></div>' +
            '<div class="toolbar-row toolbar-row-check"><input type="checkbox" id="paste-burn" /><label for="paste-burn">Burn after read</label></div>' +
            '<div class="toolbar-row"><label class="toolbar-label">Burn after views:</label><select id="paste-burn-views" title="Delete paste after this many views">' + opt(C.BURN_VIEWS || []) + '</select></div>' +
            '<div class="toolbar-row"><label class="toolbar-label">Tags:</label><input type="text" id="paste-tags" placeholder="tag1, tag2" list="paste-tags-datalist" autocomplete="off" /><datalist id="paste-tags-datalist"></datalist></div>' +
            '<div class="editor-ribbon">' +
              '<div class="ribbon-group"><span class="ribbon-label">Clipboard</span><div class="ribbon-buttons">' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-cut" title="Cut (Ctrl+X)">Cut</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-copy" title="Copy (Ctrl+C)">Copy</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-paste" title="Paste (Ctrl+V)">Paste</button>' +
              '</div></div>' +
              '<div class="ribbon-group"><span class="ribbon-label">Font</span><div class="ribbon-buttons">' +
                '<select id="ribbon-font" class="ribbon-select" title="Font">' + opt(C.FONTS || []) + '</select>' +
                '<select id="ribbon-font-size" class="ribbon-select ribbon-select-narrow" title="Size">' + opt(C.FONT_SIZES || []) + '</select>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-font-decrease" title="Decrease size">A−</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-font-increase" title="Increase size">A+</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-clear-format" title="Reset font & size">Clear</button>' +
              '</div></div>' +
              '<div class="ribbon-group"><span class="ribbon-label">Paragraph</span><div class="ribbon-buttons">' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-indent" title="Indent selection">Indent</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-outdent" title="Outdent selection">Outdent</button>' +
              '</div></div>' +
              '<div class="ribbon-group"><span class="ribbon-label">Editing</span><div class="ribbon-buttons">' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-find" title="Find (Ctrl+F)">Find</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-replace" title="Replace">Replace</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="ribbon-select-all" title="Select all (Ctrl+A)">Select all</button>' +
              '</div></div>' +
            '</div>' +
            '<div class="find-in-paste-wrap hidden" id="find-in-paste-wrap">' +
              '<input type="text" id="find-in-paste-input" placeholder="Find in paste..." />' +
              '<span id="find-in-paste-count"></span>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="find-prev">↑</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="find-next">↓</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="find-close">×</button>' +
            '</div>' +
            '<div class="replace-in-paste-wrap hidden" id="replace-in-paste-wrap">' +
              '<input type="text" id="replace-find-input" placeholder="Find..." />' +
              '<input type="text" id="replace-with-input" placeholder="Replace with..." />' +
              '<button type="button" class="btn btn-ghost btn-sm" id="replace-next">Replace</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="replace-all">Replace all</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" id="replace-close">×</button>' +
            '</div>' +
            '<div class="toolbar-actions">' +
              '<button type="button" class="btn btn-ghost" id="btn-find" title="Find in paste (Ctrl+F)">🔍 Find</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-format" title="Format (JSON)">Format</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-shortcuts" title="Keyboard shortcuts">?</button>' +
              '<button type="button" class="btn btn-ghost" id="duplicate-paste" title="Duplicate this paste">Duplicate</button>' +
              '<button type="button" class="btn btn-ghost" id="fork-paste" title="Fork (copy with link to original)">Fork</button>' +
              '<button type="button" class="btn btn-ghost" id="download-paste" title="Download as .txt">Download</button>' +
              '<select id="download-format" title="Download format" class="download-format-select">' + opt(C.DOWNLOAD_FORMATS || []) + '</select>' +
              '<button type="button" class="btn btn-ghost" id="btn-code-image" title="Export as image (Carbon-style)">🖼 Code image</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-save-template" title="Save as template">Save as template</button>' +
              '<button type="button" class="btn btn-ghost" id="paste-clipboard" title="Paste from clipboard">📋 Paste</button>' +
              '<button type="button" class="btn btn-ghost" id="copy-clipboard" title="Copy to clipboard">Copy</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-share" title="Share (link, QR, embed)">Share</button>' +
              '<button type="button" class="btn btn-ghost" id="copy-link" title="Copy share link">Copy link</button>' +
              '<button type="button" class="btn btn-ghost" id="pin-paste" title="Pin to top">☆ Pin</button>' +
              '<button type="button" class="btn btn-ghost" id="fav-paste" title="Toggle favorite">★ Fav</button>' +
              '<button type="button" class="btn btn-ghost" id="archive-paste" title="Toggle archive">📦 Archive</button>' +
              '<button type="button" class="btn btn-danger btn-ghost" id="delete-paste" title="Delete">Delete</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-fullscreen" title="Fullscreen editor">⛶</button>' +
              '<button type="button" class="btn btn-ghost" id="btn-print" title="Print">Print</button>' +
              '<span class="autosave-indicator" id="autosave-indicator"></span>' +
            '</div></div></details>' +
          '</div>' +
          '<div class="public-paste-banner hidden" id="public-paste-banner">' +
            '<span>Viewing public paste by <strong id="public-paste-username"></strong></span>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="public-paste-star">☆ Star (<span id="public-paste-stars">0</span>)</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="copy-public-to-mine">Copy to my pastes</button>' +
          '</div>' +
          '<div class="editor-options">' +
            '<label class="opt-check markdown-preview-opt hidden" id="markdown-preview-opt"><input type="checkbox" id="opt-markdown-preview" /> Markdown preview</label>' +
            '<label class="opt-check"><input type="checkbox" id="opt-line-numbers" /> Line numbers</label>' +
            '<label class="opt-check"><input type="checkbox" id="opt-word-wrap" /> Word wrap</label>' +
            '<label class="opt-check"><input type="checkbox" id="opt-indent-guides" /> Indent guides</label>' +
            '<label class="opt-check">Font size: <select id="opt-font-size">' + opt(C.FONT_SIZES || []) + '</select></label>' +
            '<label class="opt-check">Font: <select id="opt-font-family" title="Editor font">' + opt(C.FONTS || []) + '</select></label>' +
            '<label class="opt-check" title="Color scheme for syntax highlighting (keywords, strings, comments)">Code colors: <select id="opt-syntax-theme">' + opt(C.SYNTAX_THEMES || []) + '</select></label>' +
          '</div>' +
          '<div class="paste-files-tabs hidden" id="paste-files-tabs"><button type="button" class="paste-file-tab active" data-index="0">Main</button></div>' +
          '<div class="editor-meta" id="editor-meta">' +
            '<span id="paste-views">0 views</span>' +
            '<span id="paste-created">Created: —</span>' +
            '<span id="paste-forked" class="paste-forked hidden"></span>' +
            '<span id="paste-stats">0 chars · 0 words</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="btn-version-history" title="Version history">History</button>' +
          '</div>' +
          '<div class="editor-container">' +
            '<textarea id="paste-content" placeholder="Paste or type your content here..." spellcheck="false"></textarea>' +
            '<pre class="highlight-wrap" id="highlight-wrap" aria-hidden="true"><code id="highlight-code"></code></pre>' +
            '<div class="markdown-preview hidden" id="markdown-preview" aria-label="Rendered Markdown preview"></div>' +
          '</div>' +
          '<div class="raw-toggle-wrap"><label><input type="checkbox" id="raw-toggle" /> Raw (plain text)</label></div>' +
          '<div class="editor-drop-zone" id="editor-drop-zone">Drop a file to create a new paste</div>' +
          '<div class="public-comments hidden" id="public-comments">' +
            '<div class="public-comments-header">' +
              '<button type="button" class="public-comments-toggle" id="public-comments-toggle" aria-expanded="true">' +
                '<span class="public-comments-toggle-icon">▼</span><h3 class="public-comments-title">Comments</h3>' +
              '</button>' +
            '</div>' +
            '<div class="public-comments-body">' +
              '<ul id="public-comments-list"></ul>' +
              '<div class="public-comments-form">' +
                '<textarea id="public-comment-input" rows="2" placeholder="Write a comment..."></textarea>' +
                '<button type="button" class="btn btn-ghost btn-sm" id="public-comment-send">Post</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="quick-switcher-modal">' +
          '<div class="modal-box quick-switcher-box">' +
            '<h2>Quick open</h2>' +
            '<p class="modal-hint">Type to search pastes. Enter to open, Esc to close.</p>' +
            '<input type="text" id="quick-switcher-input" placeholder="Search paste title..." autocomplete="off" />' +
            '<ul id="quick-switcher-list" class="quick-switcher-list"></ul>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="shortcuts-modal">' +
          '<div class="modal-box"><h2>Keyboard shortcuts</h2><ul class="shortcuts-list" id="shortcuts-list"></ul><button type="button" class="btn btn-ghost" id="shortcuts-close">Close</button></div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="share-modal">' +
          '<div class="modal-box">' +
            '<h2>Share</h2>' +
            '<p><label>Link: <input type="text" id="share-link-input" readonly /></label> <button type="button" class="btn btn-ghost btn-sm" id="share-copy-link">Copy</button></p>' +
            '<p><label><input type="checkbox" id="share-readonly" /> Read-only link</label></p>' +
            '<p><label><input type="checkbox" id="share-raw" /> Raw link (plain text)</label></p>' +
            '<p><label>Line permalink: <input type="text" id="share-line-range" placeholder="e.g. 5 or 5-10" maxlength="20" /></label></p>' +
            '<p><label for="share-embed-code">Embed:</label> <textarea id="share-embed-code" readonly rows="2" aria-label="Embed code"></textarea> <button type="button" class="btn btn-ghost btn-sm" id="share-copy-embed">Copy</button></p>' +
            '<p>QR code: <canvas id="share-qr-canvas"></canvas></p>' +
            '<button type="button" class="btn btn-ghost" id="share-close">Close</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="version-modal">' +
          '<div class="modal-box"><h2>Version history</h2><ul id="version-list"></ul><button type="button" class="btn btn-ghost" id="version-close">Close</button></div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="diff-modal">' +
          '<div class="modal-box diff-box">' +
            '<h2>Version diff</h2><p class="modal-hint diff-hint">Older (red) vs current (green).</p>' +
            '<div class="diff-content-wrap"><pre id="diff-content" class="diff-content"></pre></div>' +
            '<button type="button" class="btn btn-ghost" id="diff-close">Close</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="import-url-modal">' +
          '<div class="modal-box">' +
            '<h2>Import from URL</h2>' +
            '<input type="url" id="import-url-input" placeholder="https://..." />' +
            '<p class="modal-error hidden" id="import-url-error"></p>' +
            '<button type="button" class="btn" id="import-url-fetch">Fetch & create paste</button>' +
            '<button type="button" class="btn btn-ghost" id="import-url-close">Cancel</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="templates-modal">' +
          '<div class="modal-box"><h2>Templates</h2>' +
            '<p class="modal-hint">Create a paste, then use "Save as template" to add it here. Use "New from template" to start from a template.</p>' +
            '<ul id="templates-list"></ul>' +
            '<button type="button" class="btn btn-ghost" id="templates-close">Close</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden" id="code-image-modal">' +
          '<div class="modal-box code-image-box">' +
            '<h2>Export as image</h2>' +
            '<p class="modal-hint">Create a shareable image of your code (like <a href="https://carbon.now.sh/" target="_blank" rel="noopener">Carbon</a>). Preview below, then download.</p>' +
            '<div class="code-image-options">' +
              '<label class="opt-check">Background: <select id="code-image-bg">' + opt(C.CODE_IMAGE_BG || []) + '</select></label>' +
              '<label class="opt-check">Padding: <select id="code-image-padding">' + opt(C.CODE_IMAGE_PADDING || []) + '</select></label>' +
              '<label class="opt-check">Font size: <select id="code-image-font-size">' + opt(C.CODE_IMAGE_FONT_SIZE || []) + '</select></label>' +
              '<label class="opt-check">Corner radius: <select id="code-image-radius">' + opt(C.CODE_IMAGE_RADIUS || []) + '</select></label>' +
              '<label class="opt-check">Shadow: <select id="code-image-shadow">' + opt(C.CODE_IMAGE_SHADOW || []) + '</select></label>' +
              '<label class="opt-check"><input type="checkbox" id="code-image-window" checked /> Window frame (title bar)</label>' +
              '<label class="opt-check"><input type="checkbox" id="code-image-lang-label" /> Show language in title bar</label>' +
              '<label class="opt-check"><input type="checkbox" id="code-image-lines" /> Line numbers in image</label>' +
            '</div>' +
            '<div class="code-image-preview-wrap"><p class="code-image-preview-label">Preview</p><div id="code-image-preview" class="code-image-preview"></div></div>' +
            '<div class="modal-actions">' +
              '<button type="button" class="btn" id="code-image-download">Download PNG</button>' +
              '<button type="button" class="btn btn-ghost" id="code-image-close">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="password-prompt hidden" id="password-prompt">' +
          '<div class="password-box">' +
            '<p>This paste is protected.</p>' +
            '<input type="password" id="password-input" placeholder="Enter password" />' +
            '<button type="button" class="btn" id="password-submit">View paste</button>' +
            '<p class="password-prompt-hint">Don\'t know the password? If this is your paste, you can remove protection.</p>' +
            '<button type="button" class="btn btn-ghost btn-sm" id="password-remove-protection">Remove protection</button>' +
          '</div>' +
        '</div>' +
        '<div class="modal-overlay hidden app-dialog-overlay" id="app-dialog" aria-modal="true" role="dialog" aria-labelledby="app-dialog-title">' +
          '<div class="modal-box app-dialog-card">' +
            '<h2 id="app-dialog-title" class="app-dialog-title"></h2>' +
            '<p id="app-dialog-message" class="app-dialog-message"></p>' +
            '<div class="app-dialog-input-wrap hidden" id="app-dialog-input-wrap">' +
              '<input type="text" id="app-dialog-input" placeholder="" />' +
            '</div>' +
            '<div class="app-dialog-actions" id="app-dialog-actions"></div>' +
          '</div>' +
        '</div>' +
      '</main>' +
    '</div>';

  var mount = document.getElementById('app-mount');
  if (mount) {
    mount.innerHTML = appShell;
  }
})();
