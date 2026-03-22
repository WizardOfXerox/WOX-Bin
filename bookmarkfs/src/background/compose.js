import { setPendingCompose } from "../vault/bridge.js";

const EXT_PAGE = chrome.runtime.getURL("dist/index.html");

function openComposeTab() {
  chrome.tabs.create({ url: `${EXT_PAGE}?tab=cloud&compose=1` });
}

function pendingComposePayload(info, tab) {
  let title = "Untitled";
  let content = "";
  let sourceType = "page";
  let sourceUrl = (tab && tab.url) || "";

  if (info.menuItemId === "wb_compose_selection") {
    title = (tab && tab.title) || "From selection";
    content = info.selectionText || "";
    sourceType = "selection";
  } else if (info.menuItemId === "wb_compose_link") {
    title = (tab && tab.title) || "Link";
    content = info.linkUrl || "";
    sourceType = "link";
    sourceUrl = info.linkUrl || sourceUrl;
  } else if (info.menuItemId === "wb_compose_image") {
    title = "Image URL";
    content = info.srcUrl || "";
    sourceType = "image";
    sourceUrl = info.srcUrl || sourceUrl;
  } else if (info.menuItemId === "wb_compose_page") {
    title = (tab && tab.title) || "Page";
    content = (tab && tab.url) || "";
    sourceType = "page";
  }

  return {
    title: title.slice(0, 500),
    content,
    sourceType,
    sourceUrl,
    sourceTitle: (tab && tab.title) || title,
    mirrorLocal: false,
    ts: Date.now()
  };
}

export function installComposeMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "wb_compose_selection",
      contexts: ["selection"],
      title: "Send selection to WOX-Bin compose"
    });
    chrome.contextMenus.create({
      id: "wb_compose_link",
      contexts: ["link"],
      title: "Send link to WOX-Bin compose"
    });
    chrome.contextMenus.create({
      id: "wb_compose_image",
      contexts: ["image"],
      title: "Send image URL to WOX-Bin compose"
    });
    chrome.contextMenus.create({
      id: "wb_compose_page",
      contexts: ["page"],
      title: "Send page URL to WOX-Bin compose"
    });
  });
}

export function handleComposeMenuClick(info, tab) {
  const payload = pendingComposePayload(info, tab);
  void setPendingCompose(payload).then(openComposeTab);
}
