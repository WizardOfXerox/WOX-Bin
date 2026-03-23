import { NextResponse } from "next/server";

import { parseOutboundTarget } from "@/lib/outbound-links";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = parseOutboundTarget(requestUrl.searchParams.get("to"));

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const targetHref = target.toString();
  const hostname = target.hostname;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>Leaving WOX-Bin</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: Segoe UI, Arial, sans-serif;
      background: radial-gradient(circle at top, #1e293b 0%, #0f172a 55%, #020617 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(100%, 720px);
      border: 1px solid rgba(148, 163, 184, 0.24);
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 24px 80px rgba(2, 6, 23, 0.45);
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    h1 {
      margin: 12px 0 0;
      font-size: clamp(28px, 5vw, 40px);
      line-height: 1.05;
    }
    p {
      color: #cbd5e1;
      line-height: 1.7;
    }
    .url {
      margin-top: 18px;
      padding: 14px 16px;
      border-radius: 16px;
      background: rgba(30, 41, 59, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.18);
      font-family: Consolas, ui-monospace, monospace;
      font-size: 13px;
      overflow-wrap: anywhere;
      color: #e2e8f0;
    }
    .actions {
      margin-top: 22px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      border: 1px solid rgba(148, 163, 184, 0.28);
    }
    .primary {
      background: #38bdf8;
      color: #082f49;
      border-color: transparent;
    }
    .secondary {
      color: #e2e8f0;
      background: rgba(15, 23, 42, 0.5);
    }
    .meta {
      margin-top: 18px;
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">Privacy redirect</div>
    <h1>Leaving WOX-Bin</h1>
    <p>WOX-Bin is opening this external link without sending the original paste page as a referrer.</p>
    <p>Destination: <strong>${escapeHtml(hostname)}</strong></p>
    <div class="url">${escapeHtml(targetHref)}</div>
    <div class="actions">
      <a class="button primary" href="${escapeHtml(targetHref)}" rel="noreferrer noopener">Continue</a>
      <a class="button secondary" href="/">Back to WOX-Bin</a>
    </div>
    <p class="meta">Redirecting automatically…</p>
  </main>
  <script>
    window.setTimeout(function () {
      window.location.replace(${JSON.stringify(targetHref)});
    }, 700);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
