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

  track.appendChild(btnCloud);
  track.appendChild(btnFs);
  tabBar.appendChild(track);

  const fsPanel = document.createElement("div");
  fsPanel.id = "bookmarkfs-panel";

  const parent = existingCenter.parentNode;
  parent.insertBefore(tabBar, existingCenter);
  parent.insertBefore(fsPanel, existingCenter);
  fsPanel.appendChild(existingCenter);

  const woxRoot = document.createElement("div");
  woxRoot.id = "woxbin-root";
  woxRoot.style.display = "none";
  parent.appendChild(woxRoot);

  let cloudMounted = false;
  let localInitialized = false;

  function styleActive(showCloud) {
    btnCloud.setAttribute("aria-selected", showCloud ? "true" : "false");
    btnFs.setAttribute("aria-selected", showCloud ? "false" : "true");
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
    fsPanel.style.display = "";
    woxRoot.style.display = "none";
    styleActive(false);
  }

  function showCloud() {
    fsPanel.style.display = "none";
    woxRoot.style.display = "block";
    styleActive(true);
    if (!cloudMounted) {
      cloudMounted = true;
      void mountCloud(woxRoot);
    }
  }

  btnFs.addEventListener("click", showLocal);
  btnCloud.addEventListener("click", showCloud);
  styleActive(true);

  window.__bookmarkfsTabs = {
    ensureLocalInitialized,
    showLocal,
    showCloud,
    showFs: showLocal,
    showWox: showCloud
  };

  return window.__bookmarkfsTabs;
}
