# WOX-Bin client scripts (load order matters)

The app is split into 8 script files that must load in order. Each file depends on globals from the previous ones.

| File | Purpose |
|------|--------|
| **01-core.js** | Constants, storage helpers, API, auth (login/register/logout), expiry, loadData/saveData, state vars, language detection, recent views |
| **02-dom-ui.js** | DOM refs, FOLDER_* constants, getFilteredPastes, formatDate, escapeHtml/escapeAttr, openModal/closeModal/showToast, renderPasteList, bulk bar, stats |
| **03-editor.js** | showEmpty/showEditor, selectPaste, selectPublicPaste, loadComments/loadReplies, highlight, bracket match, markdown preview, syncScroll |
| **04-paste-ops.js** | Content/folder event listeners, saveCurrent, deleteCurrent, newPaste, duplicatePaste, download, togglePin, export/import |
| **05-folders-theme.js** | Theme (Prism), setFolder, initFolders, add/delete/rename folder, bulk move, nav (My pastes / Public) |
| **06-account-bulk.js** | Export/import buttons, theme listener, auth buttons, account modal (keys, sessions, webhook, claim anon, delete account), bulk bar handlers, copy to mine, comments, pin |
| **07-features.js** | setupExtraFeatures: autosave, sort/filter, find/replace, share, version history & diff, templates, code image, shortcuts, drop zone, modals, raw view |
| **08-init.js** | Landing check, goToApp, runAppInit, init IIFE |

`index.html` loads these with `<script src="js/01-core.js">` … `08-init.js` in order. The original single-file app is preserved as `app.js` for reference.
