(function() {
  const PAGE_PREFIXES = ["/bookmarkfs/sync", "/bookmarkfs-sync", "/bookmarkfs/sync.html"];
  const REQUEST_SOURCE = "woxbin-bookmarkfs-page";
  const RESPONSE_SOURCE = "bookmarkfs-extension";
  const AFTERDARK_KEY = "woxbin_afterdark_launcher_enabled";
  const LAUNCHER_ID = "woxbin-afterdark-launcher";

  function isLikelyWoxBinPage() {
    const host = (window.location.hostname || "").toLowerCase();
    if (host === "wox-bin.vercel.app" || host === "localhost" || host === "127.0.0.1") {
      return true;
    }
    if (document.documentElement?.dataset?.woxBin === "1") {
      return true;
    }
    return document.title.toLowerCase().includes("wox-bin");
  }

  function isSyncPage() {
    const path = window.location.pathname || "";
    return PAGE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }

  function ensureLauncher() {
    if (!isLikelyWoxBinPage() || document.getElementById(LAUNCHER_ID)) {
      return;
    }

    const mount = () => {
      if (!document.body || document.getElementById(LAUNCHER_ID)) {
        return;
      }
      const button = document.createElement("button");
      button.id = LAUNCHER_ID;
      button.type = "button";
      button.textContent = "Afterdark";
      button.style.position = "fixed";
      button.style.right = "18px";
      button.style.bottom = "18px";
      button.style.zIndex = "2147483646";
      button.style.padding = "10px 14px";
      button.style.borderRadius = "999px";
      button.style.border = "1px solid rgba(94, 234, 212, 0.28)";
      button.style.background = "linear-gradient(180deg, rgba(9, 17, 31, 0.96), rgba(6, 11, 23, 0.94))";
      button.style.color = "#d1fae5";
      button.style.font = "600 12px/1.2 'Space Grotesk', system-ui, sans-serif";
      button.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.35)";
      button.style.cursor = "pointer";
      button.style.backdropFilter = "blur(12px)";
      button.style.letterSpacing = "0.04em";
      button.addEventListener("click", () => {
        window.open(chrome.runtime.getURL(`dist/afterdark.html?source=site&host=${encodeURIComponent(window.location.host)}`), "_blank");
      });
      document.body.appendChild(button);
    };

    if (document.body) {
      mount();
    } else {
      window.addEventListener("DOMContentLoaded", mount, { once: true });
    }
  }

  chrome.storage?.local?.get?.([AFTERDARK_KEY], (data) => {
    if (data && data[AFTERDARK_KEY]) {
      ensureLauncher();
    }
  });

  chrome.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (areaName !== "local" || !changes[AFTERDARK_KEY]) {
      return;
    }
    const enabled = Boolean(changes[AFTERDARK_KEY].newValue);
    const existing = document.getElementById(LAUNCHER_ID);
    if (enabled) {
      ensureLauncher();
    } else if (existing) {
      existing.remove();
    }
  });

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
