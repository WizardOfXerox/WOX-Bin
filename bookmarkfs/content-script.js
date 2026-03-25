(function() {
  const PAGE_PREFIXES = ["/bookmarkfs/sync", "/bookmarkfs-sync", "/bookmarkfs/sync.html"];
  const REQUEST_SOURCE = "woxbin-bookmarkfs-page";
  const RESPONSE_SOURCE = "bookmarkfs-extension";
  const AFTERDARK_KEY = "woxbin_afterdark_launcher_enabled";
  const LAUNCHER_ID = "woxbin-afterdark-launcher";
  const OVERLAY_ID = "woxbin-afterdark-overlay";
  const OVERLAY_SOURCE = "bookmarkfs-afterdark";
  const AFTERDARK_OPEN_CLASS = "woxbin-afterdark-open";
  let teardownAfterdark = null;

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

  function getAfterdarkOrigin() {
    const url = chrome.runtime.getURL("");
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  function getAfterdarkUrl(params = {}) {
    const url = new URL(chrome.runtime.getURL("dist/afterdark.html"));
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
    return url.toString();
  }

  function closeAfterdarkTakeover() {
    if (typeof teardownAfterdark === "function") {
      teardownAfterdark();
    }
    teardownAfterdark = null;
  }

  function openDetachedAfterdark() {
    window.open(getAfterdarkUrl({ source: "site", host: window.location.host }), "_blank");
  }

  function openAfterdarkTakeover() {
    if (!document.documentElement || document.getElementById(OVERLAY_ID)) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;

    const bar = document.createElement("div");
    bar.className = "woxbin-afterdark-bar";

    const copy = document.createElement("div");
    copy.className = "woxbin-afterdark-copy";

    const eyebrow = document.createElement("span");
    eyebrow.className = "woxbin-afterdark-eyebrow";
    eyebrow.textContent = "Injected extension mode";

    const title = document.createElement("span");
    title.className = "woxbin-afterdark-title";
    title.textContent = "WOX-Bin Afterdark is replacing the current page shell.";

    copy.append(eyebrow, title);

    const actions = document.createElement("div");
    actions.className = "woxbin-afterdark-actions";

    const detachButton = document.createElement("button");
    detachButton.type = "button";
    detachButton.className = "woxbin-afterdark-button";
    detachButton.id = "afterdark-detach";
    detachButton.textContent = "Open detached";

    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.className = "woxbin-afterdark-button woxbin-afterdark-button--primary";
    exitButton.id = "afterdark-exit";
    exitButton.textContent = "Return to page";

    actions.append(detachButton, exitButton);
    bar.append(copy, actions);

    const frame = document.createElement("iframe");
    frame.className = "woxbin-afterdark-frame";
    frame.id = "afterdark-frame";
    frame.allow = "clipboard-read; clipboard-write";
    frame.src = getAfterdarkUrl({
      embed: "1",
      host: window.location.host,
      page: window.location.href
    });

    overlay.append(bar, frame);
    (document.body || document.documentElement).appendChild(overlay);

    const previousScrollX = window.scrollX;
    const previousScrollY = window.scrollY;
    const escListener = (event) => {
      if (event.key === "Escape") {
        closeAfterdarkTakeover();
      }
    };

    document.documentElement.classList.add(AFTERDARK_OPEN_CLASS);
    document.body?.classList.add(AFTERDARK_OPEN_CLASS);
    window.addEventListener("keydown", escListener, true);

    exitButton.addEventListener("click", closeAfterdarkTakeover);
    detachButton.addEventListener("click", openDetachedAfterdark);

    teardownAfterdark = () => {
      window.removeEventListener("keydown", escListener, true);
      document.documentElement.classList.remove(AFTERDARK_OPEN_CLASS);
      document.body?.classList.remove(AFTERDARK_OPEN_CLASS);
      overlay.remove();
      window.scrollTo(previousScrollX, previousScrollY);
    };
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
      button.addEventListener("click", openAfterdarkTakeover);
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
    } else {
      if (existing) {
        existing.remove();
      }
      closeAfterdarkTakeover();
    }
  });

  chrome.runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return undefined;
    }
    if (message.type === "woxbin-open-afterdark") {
      if (!isLikelyWoxBinPage()) {
        sendResponse?.({
          ok: false,
          reason: "unsupported-page"
        });
        return undefined;
      }
      ensureLauncher();
      openAfterdarkTakeover();
      sendResponse?.({
        ok: true
      });
      return undefined;
    }
    if (message.type === "woxbin-close-afterdark") {
      closeAfterdarkTakeover();
      sendResponse?.({
        ok: true
      });
      return undefined;
    }
    return undefined;
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== getAfterdarkOrigin()) {
      return;
    }
    const data = event.data;
    if (!data || data.source !== OVERLAY_SOURCE) {
      return;
    }
    if (data.type === "woxbin-afterdark-close") {
      closeAfterdarkTakeover();
      return;
    }
    if (data.type === "woxbin-afterdark-detach") {
      openDetachedAfterdark();
      return;
    }
    if (data.type === "woxbin-afterdark-navigate" && typeof data.href === "string") {
      closeAfterdarkTakeover();
      window.location.assign(data.href);
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
