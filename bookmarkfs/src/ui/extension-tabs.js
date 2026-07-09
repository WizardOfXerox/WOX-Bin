export function setupExtensionTabs({ mountCloud, onShowLocal }) {
  if (document.getElementById("extension-tab-bar")) {
    return window.__bookmarkfsTabs;
  }

  const existingCenter = document.querySelector("center");
  if (!existingCenter || !existingCenter.parentNode) {
    return null;
  }

  const tabBar = document.createElement("div");
  tabBar.id = "extension-tab-bar";
  tabBar.className = "ext-tabs";
  tabBar.setAttribute("role", "tablist");
  tabBar.setAttribute("aria-label", "Extension mode");

  const track = document.createElement("div");
  track.className = "ext-tabs__track";

  const btnCloud = document.createElement("button");
  btnCloud.type = "button";
  btnCloud.className = "ext-tabs__tab";
  btnCloud.setAttribute("role", "tab");
  btnCloud.id = "ext-tab-cloud";
  btnCloud.textContent = "WOX-Bin cloud";

  const btnFs = document.createElement("button");
  btnFs.type = "button";
  btnFs.className = "ext-tabs__tab";
  btnFs.setAttribute("role", "tab");
  btnFs.id = "ext-tab-bookmarks";
  btnFs.textContent = "Local vault (experimental)";

  const btnHelp = document.createElement("button");
  btnHelp.type = "button";
  btnHelp.className = "ext-tabs__tab";
  btnHelp.setAttribute("role", "tab");
  btnHelp.id = "ext-tab-help";
  btnHelp.textContent = "Setup & Help";

  track.appendChild(btnCloud);
  track.appendChild(btnFs);
  track.appendChild(btnHelp);
  tabBar.appendChild(track);

  const fsPanel = document.createElement("div");
  fsPanel.id = "bookmarkfs-panel";

  const parent = existingCenter.parentNode;
  parent.insertBefore(tabBar, existingCenter);
  parent.insertBefore(fsPanel, existingCenter);
  fsPanel.appendChild(existingCenter);

  const woxRoot = document.createElement("div");
  woxRoot.id = "woxbin-root";
  woxRoot.hidden = true;
  parent.appendChild(woxRoot);

  const helpPanel = document.createElement("div");
  helpPanel.id = "extension-help-panel";
  helpPanel.hidden = true;
  helpPanel.className = "ext-help-panel";
  helpPanel.innerHTML = `
    <div class="help-content">
      <h2>Extension Setup & Configuration Guide</h2>
      
      <div class="help-section">
        <h3>1. Link Your Workspace Profile</h3>
        <p>To enable publishing pastes, syncing folders, and local mirror caching, you must connect the extension to your WOX-Bin account:</p>
        <ol>
          <li>Open the WOX-Bin website in your browser (e.g., <code>https://wox-bin.vercel.app</code> or <code>http://localhost:3000</code>).</li>
          <li>Log in to your account.</li>
          <li>Navigate to the <strong>Local Vault Sync page</strong> (<code>/bookmarkfs/sync</code>).</li>
          <li>Select the <strong>Companion Profiles</strong> tab.</li>
          <li>Click the <strong>Auto-sync current session</strong> button. The website will automatically generate a secure API key and sync it directly to the extension!</li>
        </ol>
        <p class="help-note"><strong>Manual Setup:</strong> You can also copy your API key from your website's Account Settings ➔ API Keys, open the "WOX-Bin cloud" tab in this extension popup, and fill out the Setup form manually.</p>
      </div>

      <div class="help-section">
        <h3>2. Local Vault (BookmarkFS)</h3>
        <p>The <strong>Local Vault</strong> tab allows you to store files locally inside your browser's bookmark directory. It splits files into standard bookmark nodes so they sync across your devices automatically via your browser account.</p>
        <ul>
          <li><strong>Encryption:</strong> Enter a vault passphrase in the sync page or local panel to automatically encrypt files before they are written.</li>
          <li><strong>Importing/Exporting:</strong> You can backup your local vault index as a JSON file or drag-and-drop files directly to import them.</li>
        </ul>
      </div>

      <div class="help-section">
        <h3>3. Afterdark (Takeover Mode)</h3>
        <p>Afterdark is a private extension-owned workspace view. You can enable a floating <strong>Afterdark</strong> launcher button in the settings, which appears on supported WOX-Bin pages and lets you overlay an offline-capable privacy desk.</p>
      </div>
    </div>
  `;
  parent.appendChild(helpPanel);

  let cloudMounted = false;
  let localInitialized = false;

  function styleActive(activeMode) {
    btnCloud.setAttribute("aria-selected", activeMode === "cloud" ? "true" : "false");
    btnFs.setAttribute("aria-selected", activeMode === "fs" ? "true" : "false");
    btnHelp.setAttribute("aria-selected", activeMode === "help" ? "true" : "false");
  }

  function ensureLocalInitialized() {
    if (localInitialized) {
      return;
    }
    localInitialized = true;
    if (typeof onShowLocal === "function") {
      void onShowLocal();
    }
  }

  function showLocal() {
    ensureLocalInitialized();
    fsPanel.hidden = false;
    woxRoot.hidden = true;
    helpPanel.hidden = true;
    styleActive("fs");
  }

  function showCloud() {
    fsPanel.hidden = true;
    woxRoot.hidden = false;
    helpPanel.hidden = true;
    styleActive("cloud");
    if (!cloudMounted) {
      cloudMounted = true;
      void mountCloud(woxRoot);
    }
  }

  function showHelp() {
    fsPanel.hidden = true;
    woxRoot.hidden = true;
    helpPanel.hidden = false;
    styleActive("help");
  }

  btnFs.addEventListener("click", showLocal);
  btnCloud.addEventListener("click", showCloud);
  btnHelp.addEventListener("click", showHelp);
  styleActive("cloud");

  window.__bookmarkfsTabs = {
    ensureLocalInitialized,
    showLocal,
    showCloud,
    showFs: showLocal,
    showWox: showCloud,
    showHelp
  };

  return window.__bookmarkfsTabs;
}
