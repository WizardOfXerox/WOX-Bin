import { handleComposeMenuClick, installComposeMenus } from "./src/background/compose.js";
import { installVaultRpcBridge } from "./src/background/vault-rpc.js";

chrome.runtime.onInstalled.addListener(installComposeMenus);
chrome.runtime.onStartup.addListener(installComposeMenus);
installComposeMenus();
installVaultRpcBridge();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleComposeMenuClick(info, tab);
});
