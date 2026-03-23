import { handleVaultAction } from "./vault-service.js";

function isVaultRpcMessage(message) {
  return Boolean(message && typeof message === "object" && message.type === "bookmarkfs-sync-rpc" && typeof message.action === "string");
}

export function installVaultRpcBridge() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isVaultRpcMessage(message)) {
      return false;
    }

    void handleVaultAction(message.action, message.payload || {})
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );

    return true;
  });
}
