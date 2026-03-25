import { unzipSync } from "fflate";
import { createExtractorFromData } from "node-unrar-js";
import { mountWoxBinCompact } from "./woxbin-compact.js";
import { setupExtensionTabs } from "./ui/extension-tabs.js";
import { setPendingCompose } from "./vault/bridge.js";
import { buildBackupDocument, parseBackupDocument } from "./vault/backup.js";
import { ensureIndexedEntries, findCachedFileByHash } from "./vault/file-ops.js";
import {
    clearVaultIndex,
    loadVaultIndex,
    removeVaultIndexEntry,
    renameVaultIndexEntry,
    saveVaultIndex,
    summarizeMetaForIndex,
    upsertVaultIndexEntry
} from "./vault/metadata-cache.js";
import { buildImportPlan } from "./vault/import-export.js";
import { buildRecoveredMeta, collectChunkTreeStats, describeChunkTreeIssues } from "./vault/recovery.js";
import { buildVirtualWindow, getVisibleEntries, summarizeVaultAnalytics } from "./vault/ui.js";

async function handleRar(bytes) {
    const extractor = await createExtractorFromData({
        data: bytes,
        wasmFile: chrome.runtime.getURL("dist/unrar.wasm")
    });
    const list = extractor.getFileList();
    console.log("RAR files:", list.fileHeaders.map(f => f.name));
}

export function handleZip(bytes) {
    const files = unzipSync(bytes);
    console.log("ZIP:", Object.keys(files));
}


(function() {
    // ---------- Config ----------
    let maxBookmarkSize = 9092; // safe Chrome limit for title characters
    const SETTINGS_KEY = "bookmarkfs_settings";
    const UPLOAD_CHECKPOINT_KEY = "bookmarkfs_upload_checkpoint_v1";
    const APP_SCHEMA_VERSION = 2;
    const CHUNK_PREFIX = "!data:";
    const META_PREFIX = "!meta:";
    let currentPath = "";
    let currentPage = 1;
    let pageSize = 25;
    let cachedSessionPassphrase = "";

    // ---------- Utilities ----------
    const te = new TextEncoder();
    const td = new TextDecoder();
    const hasFflate = typeof window !== "undefined" && window.fflate && typeof window.fflate.gzipSync === "function";

    function b64encodeBytes(u8) {
        let s = "";
        for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
        return btoa(s);
    }

    function b64decodeToBytes(b64) {
        // quick sanity: base64 must be multiple of 4 chars, only legal chars
        const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64Pattern.test(b64) || b64.length % 4 !== 0) {
            // Not valid base64 → treat as raw UTF-8 string
            return new TextEncoder().encode(b64);
        }
        try {
            const s = atob(b64);
            const out = new Uint8Array(s.length);
            for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
            return out;
        } catch (e) {
            console.warn("b64decodeToBytes: fallback to UTF-8, not valid base64", e);
            return new TextEncoder().encode(b64);
        }
    }


    function dataURLToParts(dataUrl) {
        const idx = dataUrl.indexOf(",");
        const meta = dataUrl.slice(0, idx);
        const dataB64 = dataUrl.slice(idx + 1);
        return { meta, dataB64 };
    }

    function dataURLFromParts(meta, bytes) {
        // bytes -> base64
        return meta + "," + b64encodeBytes(bytes);
    }

    function niceBytes(n) {
        if (n == null) return "-";
        const units = ["B", "KB", "MB", "GB"];
        let i = 0;
        let v = n;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        return `${v.toFixed(v < 10 && i > 0 ? 2 : 0)} ${units[i]}`;
    }

    function formatFileDate(iso) {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function makeRowActionButton(symbol, ariaLabel, classExtra) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `button bfs-act-btn${classExtra ? ` ${classExtra}` : ""}`;
        b.textContent = symbol;
        b.setAttribute("aria-label", ariaLabel);
        b.title = ariaLabel;
        return b;
    }

    function normalizeVirtualPath(p) {
        return (p || "")
            .replace(/<[^>]*>/g, "")
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
    }

    function splitVirtualName(name) {
        const cleaned = normalizeVirtualPath(name);
        const parts = cleaned.split("/").filter(Boolean);
        const base = parts.pop() || "";
        return { dir: parts.join("/"), base };
    }

    function joinVirtualName(dir, base) {
        const d = normalizeVirtualPath(dir);
        return d ? `${d}/${base}` : base;
    }

    function incrementVersionedName(name) {
        const dot = name.lastIndexOf(".");
        const hasExt = dot > 0;
        const base = hasExt ? name.slice(0, dot) : name;
        const ext = hasExt ? name.slice(dot) : "";
        const m = base.match(/^(.*) \((\d+)\)$/);
        if (!m) return `${base} (2)${ext}`;
        return `${m[1]} (${Number(m[2]) + 1})${ext}`;
    }

    function splitBySize(raw, size) {
        const out = [];
        for (let i = 0; i < raw.length; i += size) out.push(raw.slice(i, i + size));
        return out;
    }

    function sanitizeFilenamePart(value, fallback = "file") {
        const cleaned = String(value || "")
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
            .replace(/\s+/g, " ")
            .replace(/\.+$/g, "")
            .slice(0, 80);
        return cleaned || fallback;
    }

    function extensionFromLanguage(language) {
        switch ((language || "").toLowerCase()) {
            case "markdown":
                return "md";
            case "javascript":
                return "js";
            case "typescript":
                return "ts";
            case "python":
                return "py";
            case "bash":
                return "sh";
            case "json":
                return "json";
            default:
                return "txt";
        }
    }

    function bytesToBase64(bytes) {
        let s = "";
        for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return btoa(s);
    }

    function textToDataUrl(text, mime = "text/plain;charset=utf-8") {
        return `data:${mime};base64,${bytesToBase64(te.encode(String(text || "")))}`;
    }

    function base64ToDataUrl(base64, mime = "application/octet-stream") {
        return `data:${mime};base64,${String(base64 || "")}`;
    }

    async function sha256HexBytes(bytes) {
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    async function sha256HexString(str) {
        return sha256HexBytes(te.encode(str));
    }

    function normalizedColumns(saved) {
        const LEGACY_ACTIONS = ["download", "clipboard", "cloud", "rename", "delete"];
        const defaults = ["preview", "name", "size", "date", "actions"];
        if (!saved || !Array.isArray(saved) || saved.length === 0) return defaults.slice();
        if (saved.some((c) => LEGACY_ACTIONS.includes(c))) {
            const next = saved.filter((c) => !LEGACY_ACTIONS.includes(c));
            if (!next.includes("actions")) next.push("actions");
            return next.length ? next : defaults.slice();
        }
        return saved;
    }

    function getSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        } catch {
            return {};
        }
    }

    function setSettings(next) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    }

    function placeholderDataUrl(label, bg = "#333") {
        return "data:image/svg+xml;base64," + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect width="100" height="100" fill="${bg}"/>
  <text x="50%" y="50%" fill="white" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`);
    }

    function textPreviewDataUrl(text) {
        const safe = String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const snippet = safe.slice(0, 120) || "(empty)";
        const lines = (snippet.match(/.{1,32}/g) || [snippet]).slice(0, 4);
        const textNodes = lines.map((line, index) => {
            const y = 46 + (index * 15);
            return `<text x="12" y="${y}" fill="#d6deeb" font-size="10" font-family="monospace">${line}</text>`;
        }).join("");
        return "data:image/svg+xml;base64," + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120">
  <rect width="240" height="120" fill="#1f2430"/>
  <text x="12" y="24" fill="#9ecbff" font-size="11" font-family="monospace">TXT</text>
  ${textNodes}
</svg>`);
    }

    // gzip/gunzip adapters (fflate if present)
    function gzipSync(bytes) {
        if (hasFflate) return window.fflate.gzipSync(bytes);
        return bytes;
    }

    function gunzipSync(bytes) {
        if (hasFflate) return window.fflate.gunzipSync(bytes);
        return bytes;
    }

    // ---------- WebCrypto AES-GCM helpers ----------
    async function deriveKey(pass, salt) {
        const km = await crypto.subtle.importKey("raw", te.encode(pass), { name: "PBKDF2" }, false, ["deriveKey"]);
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
            km, { name: "AES-GCM", length: 256 },
            false, ["encrypt", "decrypt"]
        );
    }
    async function encryptBytes(bytes, pass) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(pass, salt);
        const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
        return { ct, salt, iv };
    }
    async function decryptBytes(ct, pass, salt, iv) {
        const key = await deriveKey(pass, salt);
        const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
        return pt;
    }

    // ---------- DOM helpers & UI auto-insert ----------
    function qs(sel) { return document.querySelector(sel); }

    function createSettingsPopup() {
        if (qs("#settings-popup")) return;

        const popup = document.createElement("div");
        popup.id = "settings-popup";
        popup.hidden = true;

        const box = document.createElement("div");
        box.className = "bfs-settings-card";

        box.innerHTML = `
      <h2>Settings</h2>
      <label>Max Bookmark Size: <input type="number" id="setting-maxsize" min="1000"></label><br><br>
      <label>Page Size: <input type="number" id="setting-pagesize" min="5" max="200"></label><br><br>
      <fieldset>
        <legend>Show Columns</legend>
        <label><input type="checkbox" data-col="preview"> Preview</label><br>
        <label><input type="checkbox" data-col="name"> Name</label><br>
        <label><input type="checkbox" data-col="size"> Size</label><br>
        <label><input type="checkbox" data-col="date"> Date</label><br>
        <label><input type="checkbox" data-col="actions"> Row actions (download, copy, cloud, rename, delete)</label><br>
      </fieldset>
      <br>
      <label><input type="checkbox" id="setting-dark"> Enable Light Mode</label><br><br>
      <hr>
        <button id="settings-save" class="button" >Save</button>
        <button id="settings-close" class="button">Close</button>
        <button id="settings-deleteall" class="button">Delete All Files</button>
      <hr>
    `;

        popup.appendChild(box);
        document.body.appendChild(popup);

        // Close logic
        qs("#settings-close").onclick = () => {
            popup.hidden = true;
        };

        // Save logic
        qs("#settings-save").onclick = () => {
            const settings = {
                maxSize: parseInt(qs("#setting-maxsize").value, 10) || 9092,
                pageSize: parseInt(qs("#setting-pagesize").value, 10) || 25,
                columns: normalizedColumns(
                    [...document.querySelectorAll("#settings-popup input[data-col]")]
                        .filter(c => c.checked)
                        .map(c => c.dataset.col)
                ),
                dark: qs("#setting-dark").checked
            };

            setSettings(settings);
            qs("#settings-popup").hidden = true;

            applySettings(); // apply right away
        };

        // wire up Delete All (place after saveBtn / closeBtn wiring in createSettingsPopup)
        const deleteAllBtn = popup.querySelector('#settings-deleteall');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', async() => {
                if (!confirm("⚠️ This will permanently delete ALL stored files. Are you sure?")) return;
                deleteAllBtn.disabled = true;
                try {
                    // 1) remove all file-folders using your existing listFiles()/FileObj.delete()
                    const files = await listFiles();
                    for (const f of files) {
                        try {
                            await f.delete();
                        } catch (err) {
                            console.warn("Failed to delete file folder:", f && f.handle && f.handle.title, err);
                        }
                    }

                    // 2) extra cleanup: remove any stray nodes directly under the bookmarkfs root that look like data/meta
                    try {
                        const root = await fsRoot();
                        for (const node of(root.children || [])) {
                            if (node && node.title && (node.title.startsWith(META_PREFIX) || node.title.startsWith(CHUNK_PREFIX))) {
                                try { await chrome.bookmarks.remove(node.id); } catch (e) { console.warn("Failed to remove stray node", node, e); }
                            }
                        }
                    } catch (e) {
                        console.warn("fsRoot stray cleanup failed:", e);
                    }

                    // 3) Refresh UI
                    await clearVaultIndex();
                    await loadFilesToTable();
                    // reset settings to defaults
                    // const defaultSettings = { maxSize: 9092, columns: DEFAULT_COLUMNS.slice(), dark: false };
                    // saveSettingsToStorage(defaultSettings);
                    // applySettings();
                    alert("All files deleted.");
                } catch (e) {
                    alert("Delete failed: " + (e && e.message ? e.message : String(e)));
                } finally {
                    deleteAllBtn.disabled = false;
                }
            });
        }


    }

    function applySettings() {
        const s = getSettings();

        if (Number.isFinite(s.maxSize) && s.maxSize > 0) maxBookmarkSize = s.maxSize;
        if (Number.isFinite(s.pageSize) && s.pageSize > 0) pageSize = s.pageSize;

        // Apply dark mode
        document.body.classList.toggle("dark-mode", !!s.dark);

        // Apply column visibility
        const cols = normalizedColumns(s.columns);
        const allCols = ["preview", "name", "size", "date", "actions"];
        allCols.forEach((col, idx) => {
            const th = qs(`#table thead th:nth-child(${idx+1})`);
            const cells = document.querySelectorAll(`#table tbody tr td:nth-child(${idx+1})`);
            const show = cols.includes(col);
            if (th) th.hidden = !show;
            cells.forEach(td => {
                td.hidden = !show;
            });
        });
    }

    function loadSettingsIntoPopup() {
        const s = getSettings();

        qs("#setting-maxsize").value = s.maxSize || 9092;
        qs("#setting-pagesize").value = s.pageSize || 25;

        // Reset all checkboxes first
        document.querySelectorAll("#settings-popup input[data-col]").forEach(c => c.checked = false);

        // Check only saved ones
        normalizedColumns(s.columns).forEach(col => {
            const checkbox = document.querySelector(`#settings-popup input[data-col="${col}"]`);
            if (checkbox) checkbox.checked = true;
        });

        qs("#setting-dark").checked = !!s.dark;
    }



    function ensureUI() {
        const center = document.querySelector("center") || document.body;

        // file input: allow multiple
        const input = qs("#file-input");
        if (input) input.multiple = true;

        if (!qs("#bfs-top-head")) {
            const head = document.createElement("header");
            head.id = "bfs-top-head";
            head.className = "bfs-top-head";
            head.innerHTML =
                '<div class="bfs-top-head__title">Local vault <span class="bfs-top-head__badge">BookmarkFS</span></div>' +
                "<p class=\"bfs-top-head__sub\">Stores files inside your synced <strong>bookmarkfs</strong> bookmark folder. This stays local-to-browser sync behavior and is best treated as an experimental vault, not a durable cloud drive.</p>";
            center.insertBefore(head, qs("#table") || center.firstChild);
        }

        if (!qs("#controls-bar")) {
            const bar = document.createElement("div");
            bar.id = "controls-bar";

            //Settings
            const settingsBtn = document.createElement("button");
            settingsBtn.textContent = "Settings";
            settingsBtn.className = "button";
            settingsBtn.setAttribute("aria-label", "Open settings");
            settingsBtn.onclick = () => {
                // create popup if missing
                if (!qs("#settings-popup")) createSettingsPopup();

                qs("#settings-popup").hidden = false;
                loadSettingsIntoPopup();
            };

            // Search
            const search = document.createElement("input");
            search.id = "search-bar";
            search.placeholder = "Search files...";

            const folderInput = document.createElement("input");
            folderInput.id = "folder-input";
            folderInput.placeholder = "Folder path (optional)";

            const pathBar = document.createElement("div");
            pathBar.id = "path-bar";

            const analyticsBar = document.createElement("div");
            analyticsBar.id = "analytics-bar";

            const upBtn = document.createElement("button");
            upBtn.id = "up-path-btn";
            upBtn.className = "button";
            upBtn.textContent = "Up";

            // Export / Import
            const exportBtn = document.createElement("button");
            exportBtn.id = "export-btn";
            exportBtn.className = "button";
            exportBtn.textContent = "Export";

            const verifyBtn = document.createElement("button");
            verifyBtn.id = "vault-verify-btn";
            verifyBtn.className = "button";
            verifyBtn.textContent = "Verify";

            const rebuildBtn = document.createElement("button");
            rebuildBtn.id = "vault-rebuild-btn";
            rebuildBtn.className = "button";
            rebuildBtn.textContent = "Rebuild index";

            const recoverBtn = document.createElement("button");
            recoverBtn.id = "vault-recover-btn";
            recoverBtn.className = "button";
            recoverBtn.textContent = "Recover";

            const importLabel = document.createElement("label");
            importLabel.className = "button";
            importLabel.textContent = "Import";
            importLabel.htmlFor = "import-input";

            const importInput = document.createElement("input");
            importInput.type = "file";
            importInput.id = "import-input";
            importInput.accept = "application/json";
            importInput.hidden = true;

            const uploadLabel = document.createElement("label");
            uploadLabel.className = "button";
            uploadLabel.textContent = "Upload";
            uploadLabel.htmlFor = "file-input";

            const uploadInput = document.createElement("input");
            uploadInput.type = "file";
            uploadInput.id = "file-input";
            uploadInput.hidden = true;
            uploadInput.multiple = true;

            const prevBtn = document.createElement("button");
            prevBtn.id = "prev-page-btn";
            prevBtn.className = "button";
            prevBtn.textContent = "Prev";

            const pageInfo = document.createElement("span");
            pageInfo.id = "page-info";

            const nextBtn = document.createElement("button");
            nextBtn.id = "next-page-btn";
            nextBtn.className = "button";
            nextBtn.textContent = "Next";

            // Progress container
            const prog = document.createElement("progress");
            prog.id = "progress-container";
            prog.max = 100;
            prog.value = 0;
            prog.hidden = true;

            const rowSearch = document.createElement("div");
            rowSearch.className = "bfs-tool-row bfs-tool-row--search";
            rowSearch.appendChild(search);

            const rowPath = document.createElement("div");
            rowPath.className = "bfs-tool-row bfs-tool-row--path";
            rowPath.appendChild(folderInput);
            rowPath.appendChild(pathBar);
            rowPath.appendChild(upBtn);

            const rowActions = document.createElement("div");
            rowActions.className = "bfs-tool-row bfs-tool-row--actions";
            rowActions.appendChild(uploadLabel);
            rowActions.appendChild(uploadInput);
            rowActions.appendChild(exportBtn);
            rowActions.appendChild(verifyBtn);
            rowActions.appendChild(rebuildBtn);
            rowActions.appendChild(recoverBtn);
            rowActions.appendChild(importLabel);
            rowActions.appendChild(importInput);
            rowActions.appendChild(settingsBtn);

            const rowPager = document.createElement("div");
            rowPager.className = "bfs-tool-row bfs-tool-row--pager";
            const pagerGroup = document.createElement("div");
            pagerGroup.className = "bfs-pager-group";
            pagerGroup.appendChild(prevBtn);
            pagerGroup.appendChild(pageInfo);
            pagerGroup.appendChild(nextBtn);
            rowPager.appendChild(pagerGroup);
            rowPager.appendChild(analyticsBar);

            bar.appendChild(rowSearch);
            bar.appendChild(rowPath);
            bar.appendChild(rowActions);
            bar.appendChild(rowPager);
            bar.appendChild(prog);

            // insert before table if present, otherwise append
            center.insertBefore(bar, qs("#table") || null);
        }

        // Table head if missing or legacy column count
        const table = qs("#table");
        if (table) {
            const theadEl = table.querySelector("thead");
            const thCount = theadEl ? theadEl.querySelectorAll("th").length : 0;
            if (!theadEl || thCount !== 5) {
                table.innerHTML = "";
                const thead = document.createElement("thead");
                thead.innerHTML = `
        <tr>
          <th scope="col">Preview</th>
          <th scope="col">Name</th>
          <th scope="col">Size</th>
          <th scope="col">Date</th>
          <th scope="col" class="bfs-th-actions">Actions</th>
        </tr>`;
                const tbody = document.createElement("tbody");
                table.appendChild(thead);
                table.appendChild(tbody);
            }
            table.classList.add("bfs-file-table");
        }
    }

    createSettingsPopup(); // build popup once

    function setProgress(p) {
        const prog = qs("#progress-container");
        if (!prog) return;
        prog.hidden = !(p > 0 && p < 1);
        const pct = Math.max(0, Math.min(1, p || 0)) * 100;
        prog.value = pct;
        if (p >= 1) setTimeout(() => {
            prog.value = 0;
            prog.hidden = true;
        }, 400);
    }

    function updatePathBar() {
        const node = qs("#path-bar");
        if (!node) return;
        node.textContent = currentPath ? `Path: /${currentPath}` : "Path: /";
        const folder = qs("#folder-input");
        if (folder && folder.value !== currentPath) folder.value = currentPath;
    }

    function updateAnalytics(summary) {
        const node = qs("#analytics-bar");
        if (!node) return;
        node.textContent = `Items: ${summary.itemCount} | Indexed: ${summary.indexedCount} | Stored: ${niceBytes(summary.storedBytes)}`;
    }

    function applyDarkFromStorage() {
        const on = localStorage.getItem("bookmarkfs_dark") === "1";
        document.body.classList.toggle("dark-mode", on);
    }

    function toggleDark() {
        const now = !document.body.classList.contains("dark-mode");
        document.body.classList.toggle("dark-mode", now);
        localStorage.setItem("bookmarkfs_dark", now ? "1" : "0");
    }

    async function ensureVaultIndexEntries(files, focusNames = null) {
        const { entries, mutated } = await ensureIndexedEntries({
            currentIndex: await loadVaultIndex(),
            files,
            focusNames,
            readMeta(file) {
                return file.readMeta();
            },
            summarizeMeta: summarizeMetaForIndex
        });
        if (mutated) {
            await saveVaultIndex(entries);
        }
        return entries;
    }

    async function verifyVaultIndex() {
        const files = await listFiles();
        const nextIndex = [];
        const issues = [];
        let repairable = 0;

        for (const file of files) {
            const meta = await file.readMeta();
            const stats = collectChunkTreeStats(await file.getChildrenFresh(), META_PREFIX);
            const fileIssues = describeChunkTreeIssues(meta, stats.dataNodeCount, stats.metaNodeCount);
            if (fileIssues.length) {
                repairable += 1;
            }
            for (const issue of fileIssues) {
                issues.push(`${file.handle.title}: ${issue}`);
            }
            const summary = summarizeMetaForIndex(file.handle.title, meta);
            if (summary) {
                nextIndex.push(summary);
            }
        }

        await saveVaultIndex(nextIndex);
        return {
            files: files.length,
            indexed: nextIndex.length,
            repairable,
            issues
        };
    }

    async function recoverVaultFiles() {
        const files = await listFiles();
        const results = {
            scanned: files.length,
            clean: 0,
            normalized: 0,
            recovered: 0,
            failed: 0,
            skipped: 0,
            issues: []
        };

        for (const file of files) {
            const children = await file.getChildrenFresh();
            const stats = collectChunkTreeStats(children, META_PREFIX);
            const meta = await file.readMeta();
            const fileIssues = describeChunkTreeIssues(meta, stats.dataNodeCount, stats.metaNodeCount);

            if (!fileIssues.length) {
                results.clean += 1;
                continue;
            }

            const raw = stats.dataNodes.map((node) => node.title || "").join("");
            if (!raw) {
                results.failed += 1;
                results.issues.push(`${file.handle.title}: no stored chunk nodes to recover`);
                continue;
            }

            try {
                let reconstructed;
                let recovered = false;

                try {
                    reconstructed = await reconstructBytesFromSerialized(raw, meta);
                } catch {
                    reconstructed = await reconstructBytesLooselyFromSerialized(raw, meta);
                    recovered = true;
                }

                const repairedMeta = buildRecoveredMeta(meta, {
                    chunkHashes: await computeChunkHashes(raw, maxBookmarkSize),
                    chunkSize: maxBookmarkSize,
                    sizeOriginal: reconstructed.bytes.length,
                    sizeStored: te.encode(raw).length,
                    contentHash: await sha256HexBytes(reconstructed.bytes),
                    mimeType: reconstructed.mime
                });

                await file.write(raw, null, { chunkSize: maxBookmarkSize, startChunk: 0 });
                await file.writeMeta(repairedMeta);

                if (recovered) {
                    results.recovered += 1;
                } else {
                    results.normalized += 1;
                }
            } catch (error) {
                results.failed += 1;
                results.issues.push(`${file.handle.title}: ${error && error.message ? error.message : String(error)}`);
            }
        }

        await verifyVaultIndex();
        return results;
    }

    async function promptForVaultPassphrase(actionLabel) {
        let pass = cachedSessionPassphrase;
        if (pass) {
            return pass;
        }
        pass = prompt(`Optional passphrase (AES-GCM) for ${actionLabel}. Leave blank for none:`) || "";
        if (pass && confirm("Cache this passphrase for this session?")) {
            cachedSessionPassphrase = pass;
        }
        return pass;
    }

    // ---------- Bookmark FS primitives (based on your original) ----------
    async function fsRoot() {
        const tree = await chrome.bookmarks.getTree();
        // usually tree[0].children[1] is bookmarks bar
        const bar = tree[0].children[1] || tree[0].children[0];
        let handle = (bar.children || []).find(b => b.title === "bookmarkfs");
        if (!handle) {
            handle = await chrome.bookmarks.create({ parentId: bar.id, title: "bookmarkfs" });
        }
        return handle;
    }

    function FileObj(handle) {
        handle.children = handle.children || [];
        return {
            handle,
            async getChildrenFresh() {
                try {
                    return (await chrome.bookmarks.getChildren(this.handle.id)) || [];
                } catch {
                    return this.handle.children || [];
                }
            },
            async readRaw() {
                // concatenate all child titles but skip meta node(s)
                let data = "";
                const children = await this.getChildrenFresh();
                for (const c of(children || [])) {
                    if (c.title && c.title.startsWith(META_PREFIX)) continue;
                    data += c.title || "";
                }
                return data;
            },
            async read() {
                return this.readRaw();
            },
            async write(rawString, onProgress, options) {
                // chunk into maxBookmarkSize pieces
                const CHUNK = (options && options.chunkSize) ? options.chunkSize : maxBookmarkSize;
                const startChunk = (options && Number.isFinite(options.startChunk)) ? options.startChunk : 0;
                const pieces = [];
                for (let i = 0; i < rawString.length; i += CHUNK) {
                    pieces.push(rawString.substring(i, i + CHUNK));
                }
                // get current children (fresh)
                const existing = (await this.getChildrenFresh()).slice(); // copy snapshot
                const dataNodes = existing.filter(n => n.title && !n.title.startsWith(META_PREFIX));
                // delete extra trailing children if any
                if (startChunk === 0 && pieces.length < dataNodes.length) {
                    // remove the trailing nodes (delete from end to avoid reindex issues)
                    for (let i = dataNodes.length - 1; i >= pieces.length; i--) {
                        try { await chrome.bookmarks.remove(dataNodes[i].id); } catch (e) { /* ignore */ }
                    }
                }
                // re-fetch current data nodes from the bookmark children to get an up-to-date list
                let currentChildren = [];
                try {
                    // try to use getChildren to get fresh children
                    currentChildren = (await chrome.bookmarks.getChildren(this.handle.id)) || [];
                } catch (e) {
                    // fallback to whatever we have locally
                    currentChildren = (this.handle.children || []);
                }
                const currentDataNodes = currentChildren.filter(n => n.title && !n.title.startsWith(META_PREFIX));

                for (let i = startChunk; i < pieces.length; i++) {
                    const title = pieces[i];
                    const node = currentDataNodes[i];
                    if (!node) {
                        await chrome.bookmarks.create({ parentId: this.handle.id, title: title });
                    } else {
                        await chrome.bookmarks.update(node.id, { title: title });
                    }
                    if (options && typeof options.onChunk === "function") {
                        await options.onChunk(i + 1, pieces.length);
                    }
                    if (onProgress) onProgress((i + 1) / pieces.length);
                }
            },
            async writeMeta(metaObj) {
                // store meta as META_PREFIX + base64(JSON)
                const b = btoa(JSON.stringify(metaObj));
                const payload = META_PREFIX + b;
                // find existing meta node
                const children = await this.getChildrenFresh();
                const metaNode = (children || []).find(c => c.title && c.title.startsWith(META_PREFIX));
                if (!metaNode) {
                    await chrome.bookmarks.create({ parentId: this.handle.id, title: payload });
                } else {
                    await chrome.bookmarks.update(metaNode.id, { title: payload });
                }
                const summary = summarizeMetaForIndex(this.handle.title, metaObj);
                if (summary) {
                    await upsertVaultIndexEntry(summary);
                }
            },
            async readMeta() {
                const children = await this.getChildrenFresh();
                const metaNode = (children || []).find(c => c.title && c.title.startsWith(META_PREFIX));
                if (!metaNode) return null;
                try {
                    const str = metaNode.title.slice(META_PREFIX.length);
                    // Try base64-decoded JSON first
                    try {
                        const decoded = atob(str);
                        return migrateMeta(JSON.parse(decoded));
                    } catch (e) {
                        // If not valid base64, maybe it's raw JSON already
                        try {
                            return migrateMeta(JSON.parse(str));
                        } catch (err) {
                            console.warn("readMeta: unknown meta encoding", err);
                            return null;
                        }
                    }
                } catch (e) {
                    return null;
                }
            },

            async rename(newName) {
                const previousName = this.handle.title;
                await chrome.bookmarks.update(this.handle.id, { title: newName });
                this.handle.title = newName;
                await renameVaultIndexEntry(previousName, newName);
            },
            async delete() {
                const previousName = this.handle.title;
                // remove children then folder
                const children = await this.getChildrenFresh();
                for (const node of(children || [])) {
                    try { await chrome.bookmarks.remove(node.id); } catch (e) { /* ignore */ }
                }
                try { await chrome.bookmarks.remove(this.handle.id); } catch (e) { /* ignore */ }
                await removeVaultIndexEntry(previousName);
            }
        };
    }

    async function listFiles() {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        // only folders (no url)
        return children.filter(c => !c.url).map(c => FileObj(c));
    }

    async function getFileByName(name) {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        const h = children.find(b => b.title === name);
        return h ? FileObj(h) : null;
    }

    async function createNewFile(name) {
        const root = await fsRoot();
        const children = await chrome.bookmarks.getChildren(root.id);
        const exists = children.some(b => b.title === name);
        if (exists) throw new Error("file exists");
        const handle = await chrome.bookmarks.create({ parentId: root.id, title: name });
        return FileObj(handle);
    }

    async function findFileByHash(contentHash) {
        if (!contentHash) return null;
        const cachedHit = findCachedFileByHash(await loadVaultIndex(), contentHash);
        if (cachedHit) {
            const existing = await getFileByName(cachedHit.fullName);
            if (existing) {
                return existing;
            }
        }
        const files = await listFiles();
        for (const f of files) {
            const meta = await f.readMeta();
            if (meta && meta.contentHash === contentHash) return f;
        }
        return null;
    }

    async function setUploadCheckpoint(checkpoint) {
        await chrome.storage.local.set({ [UPLOAD_CHECKPOINT_KEY]: checkpoint });
    }

    async function getUploadCheckpoint() {
        const got = await chrome.storage.local.get(UPLOAD_CHECKPOINT_KEY);
        return got[UPLOAD_CHECKPOINT_KEY] || null;
    }

    async function clearUploadCheckpoint() {
        await chrome.storage.local.remove(UPLOAD_CHECKPOINT_KEY);
    }

    function migrateMeta(meta) {
        if (!meta || typeof meta !== "object") return null;
        const m = { ...meta };
        if (!m.schemaVersion) m.schemaVersion = 1;
        if (m.schemaVersion < 2) {
            m.schemaVersion = 2;
            m.chunkSize = m.chunkSize || maxBookmarkSize;
            m.chunkHashes = Array.isArray(m.chunkHashes) ? m.chunkHashes : [];
        }
        return m;
    }

    // ---------- Serialization helpers ----------
    async function prepareSerializedFromDataURL(dataUrl, options) {
        const { meta, dataB64 } = dataURLToParts(dataUrl);
        const originalBytes = b64decodeToBytes(dataB64);

        let processed = gzipSync(originalBytes);
        let compressed = hasFflate && processed.length < originalBytes.length;
        if (!compressed) processed = originalBytes;

        let encrypted = false;
        let encInfo = null;
        if (options && options.passphrase && options.passphrase.length > 0) {
            const { ct, salt, iv } = await encryptBytes(processed, options.passphrase);
            processed = ct;
            encrypted = true;
            encInfo = { salt: b64encodeBytes(salt), iv: b64encodeBytes(iv) };
        }

        const tag = compressed ? "c" : "r";
        const serialized = tag + b64encodeBytes(processed);
        const pieces = splitBySize(serialized, maxBookmarkSize);
        const chunkHashes = [];
        for (const part of pieces) {
            chunkHashes.push(await sha256HexString(part));
        }

        const metaObj = {
            schemaVersion: APP_SCHEMA_VERSION,
            name: "",
            type: (meta.match(/^data:([^;]+)/) || [, "application/octet-stream"])[1],
            sizeOriginal: originalBytes.length,
            sizeStored: te.encode(serialized).length,
            ratio: (te.encode(serialized).length / Math.max(1, originalBytes.length)),
            dateISO: new Date().toISOString(),
            compressed,
            encrypted,
            enc: encInfo,
            chunkSize: maxBookmarkSize,
            chunkHashes,
            contentHash: await sha256HexBytes(originalBytes)
        };

        return { serialized, metaObj, metaHeader: meta };
    }

    async function verifySerializedIntegrity(serialized, metaObj) {
        const meta = migrateMeta(metaObj);
        if (!meta || !Array.isArray(meta.chunkHashes) || !meta.chunkHashes.length) return;
        const size = Number(meta.chunkSize || maxBookmarkSize);
        const pieces = splitBySize(serialized, size);
        if (pieces.length !== meta.chunkHashes.length) throw new Error("Integrity check failed: chunk count mismatch");
        for (let i = 0; i < pieces.length; i++) {
            const h = await sha256HexString(pieces[i]);
            if (h !== meta.chunkHashes[i]) throw new Error(`Integrity check failed at chunk ${i + 1}`);
        }
    }

    async function computeChunkHashes(serialized, chunkSize) {
        const pieces = splitBySize(serialized, chunkSize);
        const hashes = [];
        for (const part of pieces) {
            hashes.push(await sha256HexString(part));
        }
        return hashes;
    }

    function sniffMimeFromBytes(bytes) {
        if (!bytes || !bytes.length) return "";
        const b = bytes;
        if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
        if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
        if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
        if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
        if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
        if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4B && b[2] === 0x03 && b[3] === 0x04) return "application/zip";
        if (b.length >= 4 && b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return "application/vnd.rar";
        const sample = b.slice(0, Math.min(512, b.length));
        let printable = 0;
        for (let i = 0; i < sample.length; i++) {
            const c = sample[i];
            if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) printable++;
        }
        if (sample.length && printable / sample.length > 0.9) return "text/plain";
        return "";
    }

    async function reconstructBytesFromSerialized(serialized, metaObj) {
        const meta = migrateMeta(metaObj) || {};
        if (!serialized || serialized.length < 2) throw new Error("Invalid serialized data");
        await verifySerializedIntegrity(serialized, meta);

        const tag = serialized[0];
        const payloadB64 = serialized.slice(1);
        let bytes = b64decodeToBytes(payloadB64);

        if (meta.encrypted) {
            let pass = cachedSessionPassphrase || "";
            if (!pass) {
                pass = prompt("Enter passphrase to decrypt:");
                if (!pass) throw new Error("Passphrase required");
                if (confirm("Cache this passphrase for this session?")) cachedSessionPassphrase = pass;
            }
            const saltB64 = meta.enc && (meta.enc.saltB64 || meta.enc.salt || meta.enc.salt64);
            const ivB64 = meta.enc && (meta.enc.ivB64 || meta.enc.iv || meta.enc.iv64);
            if (!saltB64 || !ivB64) throw new Error("Missing encryption metadata");
            bytes = await decryptBytes(bytes, pass, b64decodeToBytes(saltB64), b64decodeToBytes(ivB64));
        }

        if (tag === "c") bytes = gunzipSync(bytes);

        if (meta.contentHash) {
            const hash = await sha256HexBytes(bytes);
            if (hash !== meta.contentHash) throw new Error("Integrity check failed: content hash mismatch");
        }

        const mime = meta.type && meta.type !== "application/octet-stream" ? meta.type : (sniffMimeFromBytes(bytes) || meta.type || "application/octet-stream");
        return { bytes, mime, meta };
    }

    async function reconstructBytesLooselyFromSerialized(serialized, metaObj) {
        const meta = migrateMeta(metaObj) || {};
        if (!serialized || serialized.length < 2) throw new Error("Invalid serialized data");

        const tag = serialized[0];
        const payloadB64 = serialized.slice(1);
        let bytes = b64decodeToBytes(payloadB64);

        if (meta.encrypted) {
            let pass = cachedSessionPassphrase || "";
            if (!pass) {
                pass = prompt("Enter passphrase to decrypt:");
                if (!pass) throw new Error("Passphrase required");
                if (confirm("Cache this passphrase for this session?")) cachedSessionPassphrase = pass;
            }
            const saltB64 = meta.enc && (meta.enc.saltB64 || meta.enc.salt || meta.enc.salt64);
            const ivB64 = meta.enc && (meta.enc.ivB64 || meta.enc.iv || meta.enc.iv64);
            if (!saltB64 || !ivB64) throw new Error("Missing encryption metadata");
            bytes = await decryptBytes(bytes, pass, b64decodeToBytes(saltB64), b64decodeToBytes(ivB64));
        }

        if (tag === "c") bytes = gunzipSync(bytes);

        const mime = meta.type && meta.type !== "application/octet-stream" ? meta.type : (sniffMimeFromBytes(bytes) || meta.type || "application/octet-stream");
        return { bytes, mime, meta };
    }

    async function reconstructDataURLFromSerialized(serialized, metaObj) {
        const { bytes, mime } = await reconstructBytesFromSerialized(serialized, metaObj);
        const header = `data:${mime || "application/octet-stream"};base64`;
        return dataURLFromParts(header, bytes);
    }

    function getMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        switch (ext) {
            // Images
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "bmp":
                return "image/bmp";
            case "svg":
                return "image/svg+xml";
            case "ico":
                return "image/x-icon";

                // Video
            case "mp4":
                return "video/mp4";
            case "webm":
                return "video/webm";
            case "ogg":
                return "video/ogg";
            case "mov":
                return "video/quicktime";
            case "avi":
                return "video/x-msvideo";
            case "mkv":
                return "video/x-matroska";

                // Audio
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "flac":
                return "audio/flac";
            case "m4a":
                return "audio/mp4";

                // Text / Code
            case "txt":
                return "text/plain";
            case "md":
                return "text/markdown";
            case "html":
                return "text/html";
            case "css":
                return "text/css";
            case "js":
                return "application/javascript";
            case "json":
                return "application/json";
            case "xml":
                return "application/xml";

                // Documents
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls":
                return "application/vnd.ms-excel";
            case "xlsx":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "ppt":
                return "application/vnd.ms-powerpoint";
            case "pptx":
                return "application/vnd.openxmlformats-officedocument.presentationml.presentation";

                // Archives
            case "zip":
                return "application/zip";
            case "rar":
                return "application/vnd.rar";
            case "7z":
                return "application/x-7z-compressed";
            case "gz":
                return "application/gzip";
            case "tar":
                return "application/x-tar";

                // Default fallback
            default:
                return "application/octet-stream";
        }
    }


    // ---------- UI Rendering ----------
    async function loadFilesToTable() {
        const tbody = qs("#table tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        updatePathBar();
        const q = (qs("#search-bar") && qs("#search-bar").value) ? qs("#search-bar").value : "";
        const files = await listFiles();
        const existingIndex = await loadVaultIndex();
        const entries = getVisibleEntries(files, currentPath, q);
        const view = buildVirtualWindow(entries, currentPage, pageSize, 1);
        currentPage = view.currentPage;
        const pageInfo = qs("#page-info");
        if (pageInfo) pageInfo.textContent = `Page ${view.currentPage}/${view.totalPages}`;

        const focusedNames = view.renderEntries.filter((entry) => !entry.folder).map((entry) => entry.fullName);
        const cachedEntries = await ensureVaultIndexEntries(files, focusedNames);
        const metaByName = new Map(cachedEntries.map((entry) => [entry.fullName, entry]));
        updateAnalytics(summarizeVaultAnalytics(files.length, cachedEntries.length ? cachedEntries : existingIndex));

        const pageEntries = view.pageEntries;
        for (const entry of pageEntries) {
            const tr = document.createElement("tr");
            tr.classList.add("bfs-row");

            if (entry.folder) {
                tr.classList.add("bfs-row--folder");
                const tdPreview = document.createElement("td");
                const icon = document.createElement("img");
                icon.src = placeholderDataUrl("DIR", "#2b4d2b");
                icon.alt = "Folder";
                tdPreview.appendChild(icon);
                const tdName = document.createElement("td");
                const btn = document.createElement("button");
                btn.className = "button bfs-folder-btn";
                btn.type = "button";
                btn.textContent = entry.name;
                btn.onclick = async() => {
                    currentPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                    currentPage = 1;
                    await loadFilesToTable();
                };
                tdName.appendChild(btn);
                tr.appendChild(tdPreview);
                tr.appendChild(tdName);
                for (let i = 0; i < 3; i++) {
                    const td = document.createElement("td");
                    td.className = "bfs-cell--muted";
                    td.textContent = "—";
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
                continue;
            }

            const file = entry.file;
            let meta = metaByName.get(entry.fullName) || null;
            if (!meta) {
                const liveMeta = await file.readMeta();
                meta = liveMeta || null;
                const summary = summarizeMetaForIndex(entry.fullName, liveMeta);
                if (summary) {
                    metaByName.set(entry.fullName, summary);
                    await upsertVaultIndexEntry(summary);
                }
            }
            const name = entry.displayName;

            const tdPreview = document.createElement("td");
            const img = document.createElement("img");
            img.className = "bfs-thumb bfs-thumb--interactive";
            img.alt = name;
            const thumbFallback = () => {
                const ext = (name.split(".").pop() || "FILE").toUpperCase().slice(0, 6);
                img.src = placeholderDataUrl(ext || "FILE");
                img.onerror = null;
            };
            img.onerror = thumbFallback;
            tdPreview.appendChild(img);

            try {
                const raw = await file.read();
                if (!raw || raw.length < 2) {
                    img.src = placeholderDataUrl("FILE");
                } else {
                    const localMeta = await file.readMeta();
                    let bytes;
                    let mime = "";
                    try {
                        const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                        bytes = reconstructed.bytes;
                        mime = reconstructed.mime;
                    } catch {
                        const tag = raw[0];
                        const payload = raw.slice(1);
                        bytes = b64decodeToBytes(payload);
                        if (tag === "c") bytes = gunzipSync(bytes);
                        mime = (localMeta && localMeta.type) || (meta && meta.type) || "";
                    }
                    if (!mime || mime === "application/octet-stream") {
                        mime = getMimeType(name);
                        if (!mime || mime === "application/octet-stream") mime = sniffMimeFromBytes(bytes) || "application/octet-stream";
                    }
                    if (mime.startsWith("image/")) {
                        img.src = dataURLFromParts(`data:${mime};base64`, bytes);
                    } else if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml") {
                        let previewText = "";
                        try {
                            previewText = td.decode(bytes);
                        } catch {
                            previewText = "";
                        }
                        img.src = textPreviewDataUrl(previewText);
                    } else if (mime.startsWith("video/")) {
                        img.src = placeholderDataUrl("VIDEO", "#3b2a49");
                    } else if (mime.startsWith("audio/")) {
                        img.src = placeholderDataUrl("AUDIO", "#214a3a");
                    } else {
                        const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 8);
                        const label = ext || (mime.split("/")[1] || "FILE").toUpperCase().slice(0, 8);
                        img.src = placeholderDataUrl(label);
                    }
                }
            } catch {
                img.src = placeholderDataUrl("FILE");
            }

            img.onclick = async() => {
                try {
                    const raw = await file.read();
                    const localMeta = await file.readMeta();
                    const m = localMeta || meta || {};
                    const reconstructed = await reconstructBytesFromSerialized(raw, m);
                    const bytes = reconstructed.bytes;
                    const type = reconstructed.mime || m.type || getMimeType(name) || "application/octet-stream";
                    let objectUrl = "";

                    const popup = document.createElement("div");
                    popup.className = "bfs-preview-overlay";

                    const inner = document.createElement("div");
                    inner.className = "bfs-preview-inner";
                    inner.onclick = (ev) => ev.stopPropagation();

                    let content;
                    if (type.startsWith("image/")) {
                        content = document.createElement("img");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        content.src = objectUrl;
                    } else if (type.startsWith("video/")) {
                        content = document.createElement("video");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        content.src = objectUrl;
                        content.controls = true;
                        content.autoplay = true;
                    } else if (type.startsWith("audio/")) {
                        content = document.createElement("audio");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        content.src = objectUrl;
                        content.controls = true;
                        content.autoplay = true;
                    } else if (type.startsWith("text/") || type === "application/json") {
                        content = document.createElement("pre");
                        content.textContent = td.decode(bytes);
                    } else {
                        content = document.createElement("a");
                        objectUrl = URL.createObjectURL(new Blob([bytes], { type }));
                        content.href = objectUrl;
                        content.target = "_blank";
                        content.textContent = "Open file preview";
                    }
                    popup.onclick = () => {
                        popup.remove();
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                    };
                    inner.appendChild(content);
                    popup.appendChild(inner);
                    document.body.appendChild(popup);
                } catch (e) {
                    alert("Preview failed: " + e.message);
                }
            };
            const tdName = document.createElement("td");
            tdName.className = "bfs-cell-name";
            tdName.textContent = name;
            const tdSize = document.createElement("td");
            tdSize.className = "bfs-cell-meta";
            tdSize.textContent = meta ? `${niceBytes(meta.sizeOriginal)} → ${niceBytes(meta.sizeStored)}` : "—";
            const tdDate = document.createElement("td");
            tdDate.className = "bfs-cell-meta";
            tdDate.textContent = meta && meta.dateISO ? formatFileDate(meta.dateISO) : "—";

            const tdActions = document.createElement("td");
            tdActions.className = "bfs-cell-actions";
            const actWrap = document.createElement("div");
            actWrap.className = "bfs-actions-cell";

            const btnDl = makeRowActionButton("↓", "Download file");
            btnDl.onclick = async() => {
                const raw = await file.read();
                const localMeta = await file.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                const url = URL.createObjectURL(new Blob([reconstructed.bytes], { type: reconstructed.mime || "application/octet-stream" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            };

            const btnClip = makeRowActionButton("⧉", "Copy to clipboard");
            btnClip.onclick = async() => {
                const raw = await file.read();
                const localMeta = await file.readMeta();
                const reconstructed = await reconstructBytesFromSerialized(raw, localMeta || meta);
                const blob = new Blob([reconstructed.bytes], { type: reconstructed.mime || "application/octet-stream" });
                try {
                    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                } catch {
                    const url = await reconstructDataURLFromSerialized(raw, localMeta || meta);
                    await navigator.clipboard.writeText(url);
                }
            };

            const btnCloud = makeRowActionButton("☁", "Send file to WOX-Bin compose");
            btnCloud.onclick = async() => {
                try {
                    const raw = await file.read();
                    const localMeta = await file.readMeta();
                    const m = localMeta || meta || {};
                    const reconstructed = await reconstructBytesFromSerialized(raw, m);
                    const bytes = reconstructed.bytes;
                    const type = (reconstructed.mime || m.type || getMimeType(name) || "").split(";")[0].trim();
                    const textual =
                        type.startsWith("text/") ||
                        type === "application/json" ||
                        type === "application/xml" ||
                        type === "application/javascript";
                    const mediaKind = type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : "";
                    if (!textual && !mediaKind) {
                        alert("Only text, image, and video files can move directly into the WOX-Bin composer.");
                        return;
                    }
                    const payload = textual
                        ? {
                            title: name.slice(0, 500),
                            content: td.decode(bytes),
                            sourceType: "vault-file",
                            sourceTitle: entry.fullName,
                            ts: Date.now()
                        }
                        : {
                            title: name.slice(0, 500),
                            content: "",
                            sourceType: "vault-file",
                            sourceTitle: entry.fullName,
                            attachments: [{
                                filename: name,
                                content: bytesToBase64(bytes),
                                language: "none",
                                mediaKind,
                                mimeType: type
                            }],
                            ts: Date.now()
                        };
                    await setPendingCompose(payload);
                    if (window.__bookmarkfsTabs && typeof window.__bookmarkfsTabs.showCloud === "function") {
                        window.__bookmarkfsTabs.showCloud();
                    }
                } catch (e) {
                    alert("Cloud: " + (e && e.message ? e.message : String(e)));
                }
            };

            const btnRen = makeRowActionButton("✎", "Rename file");
            btnRen.onclick = async() => {
                const next = prompt("Rename to:", entry.fullName);
                if (!next || next === entry.fullName) return;
                await file.rename(normalizeVirtualPath(next));
                await loadFilesToTable();
            };

            const btnDel = makeRowActionButton("✕", "Delete file", "bfs-act-btn--danger");
            btnDel.onclick = async() => {
                if (!confirm(`Delete \"${entry.fullName}\"?`)) return;
                await file.delete();
                await loadFilesToTable();
            };

            actWrap.append(btnDl, btnClip, btnCloud, btnRen, btnDel);
            tdActions.appendChild(actWrap);

            tr.appendChild(tdPreview);
            tr.appendChild(tdName);
            tr.appendChild(tdSize);
            tr.appendChild(tdDate);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        }
    }

    // ---------- Upload handling ----------
    async function handleFileList(fileList) {
        const pass = await promptForVaultPassphrase("uploaded files");

        for (const f of fileList) {
            await processAndStoreFile(f, pass || "");
        }
        await loadFilesToTable();
    }

    async function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async function processDataUrlToVirtualFile(dataUrl, virtualName, passphrase, options = {}) {
        const normalizedName = normalizeVirtualPath(virtualName);
        if (!normalizedName) {
            throw new Error("Virtual filename is required.");
        }

        const { serialized, metaObj, metaHeader } = await prepareSerializedFromDataURL(dataUrl, { passphrase });
        metaObj.name = normalizedName.split("/").pop() || normalizedName;
        metaObj.metaHeader = metaHeader;

        const duplicate = await findFileByHash(metaObj.contentHash);
        if (duplicate) {
            if (options.onDuplicate) {
                options.onDuplicate(duplicate.handle.title);
            }
            return { duplicateOf: duplicate.handle.title };
        }

        let targetName = normalizedName;
        let existing = await getFileByName(targetName);
        if (existing) {
            const action =
                typeof options.onConflict === "function"
                    ? await options.onConflict(targetName)
                    : (prompt(`File ${targetName} exists. Type replace / keep / cancel`, "replace") || "cancel").toLowerCase();
            if (action === "cancel") return;
            if (action === "replace") {
                await existing.delete();
            } else {
                targetName = incrementVersionedName(targetName);
                while (await getFileByName(targetName)) targetName = incrementVersionedName(targetName);
            }
        }

        const fobj = await createNewFile(targetName);
        await fobj.writeMeta(metaObj);

        const fingerprint = `${targetName}|${metaObj.sizeOriginal}|${metaObj.contentHash}`;
        const checkpoint = await getUploadCheckpoint();
        let startChunk = 0;
        if (checkpoint && checkpoint.fingerprint === fingerprint && !passphrase && Number.isFinite(checkpoint.nextChunk)) {
            if (confirm(`Resume upload for ${targetName} from chunk ${checkpoint.nextChunk + 1}?`)) {
                startChunk = checkpoint.nextChunk;
            }
        }

        await fobj.write(serialized, setProgress, {
            startChunk,
            onChunk: async(chunkDone) => {
                await setUploadCheckpoint({ fingerprint, nextChunk: chunkDone, updatedAt: Date.now() });
            }
        });

        await clearUploadCheckpoint();
        setProgress(1);
        return { name: targetName };
    }

    async function processAndStoreFile(file, passphrase, folderOverride = "") {
        const dataUrl = await readFileAsDataUrl(file);
        const folderValue = normalizeVirtualPath(folderOverride || ((qs("#folder-input") && qs("#folder-input").value) || ""));
        const targetName = folderValue ? `${folderValue}/${file.name}` : file.name;
        const result = await processDataUrlToVirtualFile(dataUrl, targetName, passphrase, {
            onDuplicate(existingName) {
                alert(`Duplicate skipped: same content already exists as ${existingName}`);
            }
        });
        return result;
    }

    async function importCloudPasteToVault(paste, options = {}) {
        const slugBase = sanitizeFilenamePart(paste.slug || paste.title || "paste", "paste");
        const titleBase = sanitizeFilenamePart(paste.title || paste.slug || "paste", slugBase);
        const targetDir = normalizeVirtualPath(options.targetDir || `woxbin-imports/${slugBase}`);
        const passphrase =
            options.passphrase !== undefined ? options.passphrase : await promptForVaultPassphrase("WOX-Bin import");
        const stored = [];

        const primaryExt = extensionFromLanguage(paste.language || "none");
        const primaryName = `${titleBase}.${primaryExt}`;
        const primaryDataUrl = textToDataUrl(
            paste.content || "",
            paste.language === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8"
        );
        const primaryResult = await processDataUrlToVirtualFile(
            primaryDataUrl,
            joinVirtualName(targetDir, primaryName),
            passphrase || "",
            {
                onConflict: () => "keep"
            }
        );
        if (primaryResult?.name) {
            stored.push(primaryResult.name);
        }

        for (const file of paste.files || []) {
            const filename = sanitizeFilenamePart(file.filename || "attachment", "attachment");
            const dataUrl =
                file.mediaKind === "image" || file.mediaKind === "video"
                    ? base64ToDataUrl(file.content || "", file.mimeType || "application/octet-stream")
                    : textToDataUrl(file.content || "", "text/plain;charset=utf-8");
            const result = await processDataUrlToVirtualFile(
                dataUrl,
                joinVirtualName(targetDir, filename),
                passphrase || "",
                {
                    onConflict: () => "keep"
                }
            );
            if (result?.name) {
                stored.push(result.name);
            }
        }

        await loadFilesToTable();
        return stored;
    }

    function inferExtFromMime(mime) {
        const m = (mime || "").toLowerCase();
        if (m === "image/jpeg") return "jpg";
        if (m === "image/png") return "png";
        if (m === "image/gif") return "gif";
        if (m === "image/webp") return "webp";
        if (m === "image/svg+xml") return "svg";
        if (m === "video/mp4") return "mp4";
        if (m === "video/webm") return "webm";
        if (m === "audio/mpeg") return "mp3";
        if (m === "audio/wav") return "wav";
        if (m === "application/pdf") return "pdf";
        if (m === "application/zip") return "zip";
        if (m === "application/vnd.rar") return "rar";
        if (m === "application/json") return "json";
        if (m.startsWith("text/")) return "txt";
        return "";
    }

    function filenameFromUrl(url, contentType) {
        let name = "";
        try {
            const u = new URL(url);
            name = decodeURIComponent((u.pathname.split("/").pop() || "").trim());
        } catch {
            name = "";
        }
        if (!name || name === "/") name = "dropped-file";
        if (!name.includes(".")) {
            const ext = inferExtFromMime((contentType || "").split(";")[0].trim());
            if (ext) name = `${name}.${ext}`;
        }
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    }

    function extractUrlsFromDroppedHtml(html) {
        if (!html) return [];
        const urls = [];
        try {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const selectors = ["img[src]", "video[src]", "video source[src]", "audio[src]", "audio source[src]", "a[href]"];
            for (const sel of selectors) {
                const nodes = doc.querySelectorAll(sel);
                for (const n of nodes) {
                    const v = n.getAttribute("src") || n.getAttribute("href") || "";
                    if (/^https?:\/\//i.test(v)) urls.push(v);
                }
            }
        } catch {
            return [];
        }
        return urls;
    }

    function extractDroppedUrls(dataTransfer) {
        const urls = new Set();
        if (!dataTransfer) return [];

        const uriList = dataTransfer.getData("text/uri-list") || "";
        for (const line of uriList.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && /^https?:\/\//i.test(trimmed)) urls.add(trimmed);
        }

        const downloadUrl = dataTransfer.getData("DownloadURL") || "";
        if (downloadUrl) {
            const match = downloadUrl.match(/^[^:]+:[^:]+:(.+)$/);
            if (match && /^https?:\/\//i.test(match[1])) urls.add(match[1]);
        }

        const html = dataTransfer.getData("text/html") || "";
        for (const u of extractUrlsFromDroppedHtml(html)) urls.add(u);

        const plain = (dataTransfer.getData("text/plain") || "").trim();
        if (/^https?:\/\//i.test(plain)) urls.add(plain);

        return [...urls];
    }

    async function fetchUrlAsFile(url, fallbackIndex) {
        let normalized;
        try {
            normalized = new URL(url).toString();
        } catch {
            throw new Error("Invalid URL");
        }
        if (!/^https?:/i.test(normalized) && !/^data:/i.test(normalized)) {
            throw new Error("Unsupported URL scheme");
        }

        let res;
        try {
            res = await fetch(normalized);
        } catch {
            throw new Error("Network blocked or cross-origin denied");
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const type = blob.type || (res.headers.get("content-type") || "application/octet-stream");
        const disposition = res.headers.get("content-disposition") || "";
        let name = "";
        const m = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
        if (m && m[1]) {
            try {
                name = decodeURIComponent(m[1].replace(/"/g, "").trim());
            } catch {
                name = m[1].replace(/"/g, "").trim();
            }
        }
        if (!name) name = filenameFromUrl(res.url || normalized, type);
        if (!name) name = `dropped-file-${fallbackIndex}`;
        return new File([blob], name, { type: (type || "").split(";")[0].trim(), lastModified: Date.now() });
    }

    async function handleDroppedUrls(urls) {
        if (!urls.length) return;
        const pass = await promptForVaultPassphrase("drag-and-drop imports");
        let success = 0;
        const failed = [];
        try {
            for (let i = 0; i < urls.length; i++) {
                try {
                    const file = await fetchUrlAsFile(urls[i], i + 1);
                    await processAndStoreFile(file, pass || "");
                    success++;
                } catch (e) {
                    failed.push(`${urls[i]} (${e.message})`);
                }
            }
            await loadFilesToTable();
        } catch (e) {
            failed.push(`Internal error (${e.message})`);
        }
        if (failed.length) {
            alert(`Dropped URL upload complete. Success: ${success}, Failed: ${failed.length}\n\n${failed.slice(0, 5).join("\n")}`);
        }
    }
    // ---------- Export / Import ----------

    function showImportPreviewModal(plan) {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "bfs-preview-overlay";

            const close = (confirmed) => {
                overlay.remove();
                resolve(Boolean(confirmed));
            };

            overlay.onclick = () => close(false);

            const inner = document.createElement("div");
            inner.className = "bfs-preview-inner bfs-import-preview";
            inner.onclick = (ev) => ev.stopPropagation();

            const heading = document.createElement("h2");
            heading.textContent = "Import backup preview";

            const summary = document.createElement("p");
            summary.className = "bfs-import-preview__summary";
            summary.textContent = `${plan.total} item(s) ready to import. ${plan.renamed} will be renamed to avoid conflicts.`;

            const list = document.createElement("div");
            list.className = "bfs-import-preview__list";
            for (const item of plan.items.slice(0, 50)) {
                const row = document.createElement("div");
                row.className = "bfs-import-preview__row";
                row.innerHTML = `
                    <strong>${item.finalName}</strong>
                    <span>${item.renamed ? `from ${item.originalName}` : "new file"}</span>
                `;
                list.appendChild(row);
            }
            if (plan.items.length > 50) {
                const more = document.createElement("p");
                more.className = "bfs-import-preview__summary";
                more.textContent = `${plan.items.length - 50} more item(s) not shown.`;
                list.appendChild(more);
            }

            const actions = document.createElement("div");
            actions.className = "bfs-import-preview__actions";

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "button";
            cancelBtn.textContent = "Cancel";
            cancelBtn.onclick = () => close(false);

            const importBtn = document.createElement("button");
            importBtn.type = "button";
            importBtn.className = "button";
            importBtn.textContent = "Import backup";
            importBtn.onclick = () => close(true);

            actions.append(cancelBtn, importBtn);
            inner.append(heading, summary, list, actions);
            overlay.appendChild(inner);
            document.body.appendChild(overlay);
        });
    }

    async function exportAll() {
        const files = await listFiles();
        const out = [];
        for (const f of files) {
            const meta = await f.readMeta();
            const serialized = await f.read();
            out.push({ name: f.handle.title, meta, serialized });
        }
        const blob = new Blob([JSON.stringify(buildBackupDocument(out, APP_SCHEMA_VERSION), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookmarkfs-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function importAllFromFile(file) {
        try {
            const text = await file.text();
            const backup = parseBackupDocument(text);
            const existingNames = new Set((await listFiles()).map((entry) => entry.handle.title));
            const plan = buildImportPlan(backup.items, existingNames);
            if (!plan.items.length) throw new Error("Backup does not contain importable files");
            const confirmed = await showImportPreviewModal(plan);
            if (!confirmed) return;
            for (const item of plan.items) {
                const fobj = await createNewFile(item.finalName);
                if (item.meta) await fobj.writeMeta(migrateMeta(item.meta));
                await fobj.write(item.serialized, (p) => setProgress(p), { chunkSize: (item.meta && item.meta.chunkSize) ? item.meta.chunkSize : maxBookmarkSize });
            }
            await loadFilesToTable();
        } catch (e) {
            alert("Import failed: " + e.message);
        } finally {
            setProgress(0);
        }
    }

    // ---------- Drag & drop ----------
    function setupDragDrop() {
        const body = document.body;
        ["dragenter", "dragover"].forEach(ev => {
            body.addEventListener(ev, (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            }, false);
        });
        body.addEventListener("drop", async(e) => {
            e.preventDefault();
            try {
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length) {
                    await handleFileList(files);
                    return;
                }
                const urls = extractDroppedUrls(e.dataTransfer);
                if (urls.length) await handleDroppedUrls(urls);
            } catch (err) {
                alert("Drop upload failed: " + err.message);
            }
        }, false);
    }

    // ---------- Wire up events on load ----------
    window.addEventListener("load", async() => {
        document.body.classList.add("ext-app");
        let localUiInitialized = false;

        async function initializeLocalVaultSurface() {
            if (localUiInitialized) return;
            localUiInitialized = true;

            ensureUI();

            const input = qs("#file-input");
            if (input) {
                input.addEventListener("change", async function() {
                    const files = Array.from(this.files || []);
                    if (!files.length) return;
                    await handleFileList(files);
                    this.value = "";
                });
            }

            const search = qs("#search-bar");
            if (search) search.addEventListener("input", async() => {
                currentPage = 1;
                await loadFilesToTable();
            });

            const prevBtn = qs("#prev-page-btn");
            if (prevBtn) prevBtn.addEventListener("click", async() => {
                currentPage = Math.max(1, currentPage - 1);
                await loadFilesToTable();
            });
            const nextBtn = qs("#next-page-btn");
            if (nextBtn) nextBtn.addEventListener("click", async() => {
                currentPage += 1;
                await loadFilesToTable();
            });

            const upBtn = qs("#up-path-btn");
            if (upBtn) upBtn.addEventListener("click", async() => {
                if (!currentPath) return;
                const parts = currentPath.split("/").filter(Boolean);
                parts.pop();
                currentPath = parts.join("/");
                currentPage = 1;
                await loadFilesToTable();
            });

            const folderInput = qs("#folder-input");
            if (folderInput) folderInput.addEventListener("change", () => {
                currentPath = normalizeVirtualPath(folderInput.value || "");
                currentPage = 1;
                updatePathBar();
            });

            const exportBtn = qs("#export-btn");
            if (exportBtn) exportBtn.addEventListener("click", exportAll);
            const importInput = qs("#import-input");
            if (importInput) importInput.addEventListener("change", async function() {
                const f = this.files && this.files[0];
                if (f) await importAllFromFile(f);
                this.value = "";
            });

            const verifyBtn = qs("#vault-verify-btn");
            if (verifyBtn) verifyBtn.addEventListener("click", async() => {
                verifyBtn.disabled = true;
                try {
                    const result = await verifyVaultIndex();
                    const sample = result.issues.slice(0, 6);
                    alert(
                        result.issues.length
                            ? `Verified ${result.files} entries.\nIndexed: ${result.indexed}\nRepairable: ${result.repairable}\nIssues: ${result.issues.length}\n\n${sample.join("\n")}`
                            : `Verified ${result.files} entries.\nIndexed: ${result.indexed}\nNo metadata issues were found.`
                    );
                    await loadFilesToTable();
                } catch (err) {
                    alert(`Verify failed: ${err && err.message ? err.message : String(err)}`);
                } finally {
                    verifyBtn.disabled = false;
                }
            });

            const rebuildBtn = qs("#vault-rebuild-btn");
            if (rebuildBtn) rebuildBtn.addEventListener("click", async() => {
                if (!confirm("Rebuild the local vault index cache from bookmarks metadata?")) return;
                rebuildBtn.disabled = true;
                try {
                    await clearVaultIndex();
                    const result = await verifyVaultIndex();
                    alert(`Rebuilt index.\nFiles scanned: ${result.files}\nIndexed: ${result.indexed}`);
                    await loadFilesToTable();
                } catch (err) {
                    alert(`Rebuild failed: ${err && err.message ? err.message : String(err)}`);
                } finally {
                    rebuildBtn.disabled = false;
                }
            });

            const recoverBtn = qs("#vault-recover-btn");
            if (recoverBtn) recoverBtn.addEventListener("click", async() => {
                if (!confirm("Attempt recovery on files with broken chunk trees or missing metadata?")) return;
                recoverBtn.disabled = true;
                try {
                    const result = await recoverVaultFiles();
                    const notes = result.issues.slice(0, 8);
                    alert(
                        `Recovery finished.\nScanned: ${result.scanned}\nClean: ${result.clean}\nNormalized: ${result.normalized}\nRecovered: ${result.recovered}\nFailed: ${result.failed}${
                            notes.length ? `\n\n${notes.join("\n")}` : ""
                        }`
                    );
                    await loadFilesToTable();
                } catch (err) {
                    alert(`Recovery failed: ${err && err.message ? err.message : String(err)}`);
                } finally {
                    recoverBtn.disabled = false;
                    setProgress(0);
                }
            });

            setupDragDrop();
            await loadFilesToTable();
            applySettings();
        }

        setupExtensionTabs({ mountCloud: mountWoxBinCompact, onShowLocal: initializeLocalVaultSurface });
        window.__bookmarkfsVaultBridge = {
            async queueCompose(payload) {
                await setPendingCompose(payload);
                if (window.__bookmarkfsTabs && typeof window.__bookmarkfsTabs.showCloud === "function") {
                    window.__bookmarkfsTabs.showCloud();
                }
            },
            async importPaste(paste, options) {
                return importCloudPasteToVault(paste, options);
            }
        };

        try {
            const params = new URLSearchParams(window.location.search || "");
            const requestedTab = String(params.get("tab") || "").toLowerCase();
            if (requestedTab === "local" || requestedTab === "vault" || requestedTab === "bookmarkfs") {
                await initializeLocalVaultSurface();
                if (window.__bookmarkfsTabs && typeof window.__bookmarkfsTabs.showLocal === "function") {
                    window.__bookmarkfsTabs.showLocal();
                }
            } else if (window.__bookmarkfsTabs && typeof window.__bookmarkfsTabs.showCloud === "function") {
                window.__bookmarkfsTabs.showCloud();
            }
        } catch {
            if (window.__bookmarkfsTabs && typeof window.__bookmarkfsTabs.showCloud === "function") {
                window.__bookmarkfsTabs.showCloud();
            }
        }
    });

})();
