import { handleComposeMenuClick, installComposeMenus } from "./src/background/compose.js";

chrome.runtime.onInstalled.addListener(installComposeMenus);
chrome.runtime.onStartup.addListener(installComposeMenus);
installComposeMenus();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleComposeMenuClick(info, tab);
});
