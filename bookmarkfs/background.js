const EXT_PAGE = chrome.runtime.getURL("dist/index.html");

function openComposeTab() {
  chrome.tabs.create({ url: `${EXT_PAGE}?tab=cloud&compose=1` });
}

function installContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "wb_compose_selection",
      contexts: ["selection"],
      title: "Create Wox-Bin paste from selection"
    });
    chrome.contextMenus.create({
      id: "wb_compose_link",
      contexts: ["link"],
      title: "Create Wox-Bin paste from link"
    });
    chrome.contextMenus.create({
      id: "wb_compose_image",
      contexts: ["image"],
      title: "Create Wox-Bin paste from image URL"
    });
    chrome.contextMenus.create({
      id: "wb_compose_page",
      contexts: ["page"],
      title: "Create Wox-Bin paste from page URL"
    });
  });
}

chrome.runtime.onInstalled.addListener(installContextMenus);
chrome.runtime.onStartup.addListener(installContextMenus);
installContextMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let title = "Untitled";
  let content = "";
  if (info.menuItemId === "wb_compose_selection") {
    title = (tab && tab.title) || "From selection";
    content = info.selectionText || "";
  } else if (info.menuItemId === "wb_compose_link") {
    title = (tab && tab.title) || "Link";
    content = info.linkUrl || "";
  } else if (info.menuItemId === "wb_compose_image") {
    title = "Image URL";
    content = info.srcUrl || "";
  } else if (info.menuItemId === "wb_compose_page") {
    title = (tab && tab.title) || "Page";
    content = (tab && tab.url) || "";
  }

  chrome.storage.local.set(
    {
      woxbin_pending_compose: {
        title: title.slice(0, 500),
        content,
        ts: Date.now()
      }
    },
    openComposeTab
  );
});
