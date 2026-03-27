const SAFE_DOWNLOAD_PATH_PREFIXES = ["/raw/", "/x/", "/t/", "/api/convert/jobs/"];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildVirusTotalLookupUrl(targetHref: string) {
  return `https://www.virustotal.com/gui/search/${encodeURIComponent(targetHref)}`;
}

export function parseDownloadHandoffTarget(rawHref: string | null | undefined, requestUrl: string) {
  if (!rawHref) {
    return null;
  }

  try {
    const requestOrigin = new URL(requestUrl).origin;
    const target = new URL(rawHref, requestOrigin);

    if (target.origin !== requestOrigin) {
      return null;
    }

    if (!SAFE_DOWNLOAD_PATH_PREFIXES.some((prefix) => target.pathname.startsWith(prefix))) {
      return null;
    }

    return target;
  } catch {
    return null;
  }
}

type SafetyHandoffDocumentOptions = {
  mode: "redirect" | "download";
  title: string;
  eyebrow: string;
  intro: string;
  targetHref: string;
  targetLabel: string;
  backHref: string;
  actionLabel: string;
  autoDelayMs?: number;
};

export function renderSafetyHandoffDocument({
  mode,
  title,
  eyebrow,
  intro,
  targetHref,
  targetLabel,
  backHref,
  actionLabel,
  autoDelayMs = 4000
}: SafetyHandoffDocumentOptions) {
  const virusTotalUrl = buildVirusTotalLookupUrl(targetHref);
  const autoActionLabel = mode === "download" ? "download" : "continue";
  const autoVerb = mode === "download" ? "download" : "open";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: "Space Grotesk", "Segoe UI", Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 34%),
        radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 32%),
        linear-gradient(180deg, #08111d 0%, #0b1220 52%, #050914 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(100%, 840px);
      border: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(15, 23, 42, 0.86);
      backdrop-filter: blur(18px);
      border-radius: 28px;
      padding: 28px;
      box-shadow: 0 28px 90px rgba(2, 6, 23, 0.5);
    }
    .eyebrow {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    h1 {
      margin: 12px 0 0;
      font-size: clamp(32px, 5vw, 52px);
      line-height: 1.02;
      letter-spacing: -0.04em;
    }
    p {
      color: #cbd5e1;
      line-height: 1.72;
    }
    .stack {
      display: grid;
      gap: 18px;
      margin-top: 22px;
    }
    .field {
      padding: 15px 17px;
      border-radius: 18px;
      background: rgba(30, 41, 59, 0.62);
      border: 1px solid rgba(148, 163, 184, 0.16);
    }
    .field strong {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .field code {
      display: block;
      font-family: "IBM Plex Mono", Consolas, ui-monospace, monospace;
      font-size: 13px;
      line-height: 1.7;
      overflow-wrap: anywhere;
      color: #f8fafc;
    }
    .vt-panel {
      padding: 18px;
      border-radius: 20px;
      border: 1px solid rgba(34, 197, 94, 0.24);
      background: linear-gradient(180deg, rgba(6, 20, 17, 0.96), rgba(11, 30, 24, 0.82));
    }
    .vt-panel h2 {
      margin: 0;
      font-size: 1.1rem;
    }
    .vt-panel p {
      margin: 8px 0 0;
      color: #b8d9cb;
    }
    .actions {
      margin-top: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 18px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 700;
      border: 1px solid rgba(148, 163, 184, 0.28);
      transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
    }
    .button:hover {
      transform: translateY(-1px);
    }
    .primary {
      background: #38bdf8;
      color: #082f49;
      border-color: transparent;
    }
    .secondary {
      color: #e2e8f0;
      background: rgba(15, 23, 42, 0.56);
    }
    .success {
      color: #d1fae5;
      background: rgba(16, 185, 129, 0.16);
      border-color: rgba(16, 185, 129, 0.32);
    }
    .meta {
      margin-top: 18px;
      font-size: 13px;
      color: #94a3b8;
    }
    .meta strong {
      color: #e2e8f0;
    }
    @media (max-width: 640px) {
      body { padding: 14px; }
      .card { padding: 20px; border-radius: 22px; }
      .actions { display: grid; grid-template-columns: 1fr; }
      .button { width: 100%; }
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>

    <div class="stack">
      <div class="field">
        <strong>${mode === "download" ? "Download target" : "Destination"}</strong>
        <code>${escapeHtml(targetLabel)}</code>
      </div>

      <section class="vt-panel">
        <h2>VirusTotal preflight</h2>
        <p>
          WOX-Bin opens a VirusTotal lookup for this ${mode === "download" ? "download" : "destination"} in a new tab when your browser allows it.
          You can still skip the wait and ${autoActionLabel} immediately.
        </p>
      </section>
    </div>

    <div class="actions">
      <a class="button primary" href="${escapeHtml(targetHref)}" id="handoff-now" rel="${mode === "redirect" ? "noreferrer noopener" : "noopener"}">${escapeHtml(actionLabel)}</a>
      <a class="button success" href="${escapeHtml(virusTotalUrl)}" id="handoff-vt" rel="noreferrer noopener" target="_blank">Open VirusTotal</a>
      <a class="button secondary" href="${escapeHtml(backHref)}">Back to WOX-Bin</a>
    </div>

    <p class="meta" id="handoff-status">
      VirusTotal lookup is loading now. Auto-${escapeHtml(autoVerb)} in <strong id="handoff-countdown">${Math.ceil(autoDelayMs / 1000)}</strong>s.
    </p>
  </main>
  <script>
    (function () {
      var targetHref = ${JSON.stringify(targetHref)};
      var virusTotalUrl = ${JSON.stringify(virusTotalUrl)};
      var autoDelayMs = ${JSON.stringify(autoDelayMs)};
      var statusEl = document.getElementById("handoff-status");
      var countdownEl = document.getElementById("handoff-countdown");
      var finished = false;

      function openVirusTotal() {
        try {
          window.open(virusTotalUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
          if (statusEl) {
            statusEl.textContent = "VirusTotal popup was blocked. Use the button above if you want to review it before continuing.";
          }
        }
      }

      function performAction() {
        if (finished) {
          return;
        }
        finished = true;
        if (${JSON.stringify(mode)} === "download") {
          window.location.assign(targetHref);
          return;
        }
        window.location.replace(targetHref);
      }

      openVirusTotal();

      var remaining = Math.ceil(autoDelayMs / 1000);
      var timer = window.setInterval(function () {
        remaining -= 1;
        if (countdownEl) {
          countdownEl.textContent = String(Math.max(remaining, 0));
        }
        if (remaining <= 0) {
          window.clearInterval(timer);
        }
      }, 1000);

      window.setTimeout(performAction, autoDelayMs);

      var nowButton = document.getElementById("handoff-now");
      if (nowButton) {
        nowButton.addEventListener("click", function () {
          openVirusTotal();
        });
      }
    })();
  </script>
</body>
</html>`;
}
