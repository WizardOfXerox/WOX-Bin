(function() {
  const PAGE_PREFIXES = ["/bookmarkfs/sync", "/bookmarkfs-sync", "/bookmarkfs/sync.html"];
  const REQUEST_SOURCE = "woxbin-bookmarkfs-page";
  const RESPONSE_SOURCE = "bookmarkfs-extension";

  function isSyncPage() {
    const path = window.location.pathname || "";
    return PAGE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
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
    if (!data || data.source !== REQUEST_SOURCE || data.target !== RESPONSE_SOURCE) {
      return;
    }

    if (data.type === "bookmarkfs-handshake") {
      post({
        type: "bookmarkfs-ready"
      });
      return;
    }

    if (data.type !== "bookmarkfs-request") {
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
