(function() {
  const PAGE_PREFIX = "/bookmarkfs/sync";
  const REQUEST_SOURCE = "woxbin-bookmarkfs-page";
  const RESPONSE_SOURCE = "bookmarkfs-extension";

  function isSyncPage() {
    return window.location.pathname === PAGE_PREFIX || window.location.pathname.startsWith(`${PAGE_PREFIX}/`);
  }

  if (!isSyncPage()) {
    return;
  }

  function post(message) {
    window.postMessage(
      {
        source: RESPONSE_SOURCE,
        target: REQUEST_SOURCE,
        ...message
      },
      window.location.origin
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== REQUEST_SOURCE || data.target !== RESPONSE_SOURCE || data.type !== "bookmarkfs-request") {
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "bookmarkfs-sync-rpc",
        action: data.action,
        payload: data.payload || {}
      },
      (response) => {
        if (chrome.runtime.lastError) {
          post({
            type: "bookmarkfs-response",
            id: data.id,
            ok: false,
            error: chrome.runtime.lastError.message || "Extension bridge is unavailable."
          });
          return;
        }

        post({
          type: "bookmarkfs-response",
          id: data.id,
          ok: Boolean(response && response.ok),
          data: response ? response.data : null,
          error: response && !response.ok ? response.error : null
        });
      }
    );
  });

  post({
    type: "bookmarkfs-ready"
  });
})();
