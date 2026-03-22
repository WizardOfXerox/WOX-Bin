# Server-side code image export (Playwright)

Canva-style tools usually render exports **on a server** with **headless Chromium**. That avoids browser **canvas size limits** (the cause of paper-thin / blurry PNGs for very long snippets in pure client-side `html-to-image` / `html2canvas`).

Wox Bin can optionally use the same idea: **Playwright** launches Chromium, loads a small HTML document built from your paste (Prism + frame chrome), then takes a **`fullPage` screenshot**. Height is effectively unlimited compared to a single `<canvas>` cap.

## When to use it

- **Self-hosted** Node (Docker, VPS, Railway, Fly.io, etc.) where you can install Chromium.
- **Not** a great fit for **Vercel serverless** (no Chromium in the runtime bundle; use an external browser service or a separate worker container instead).

## Enable

1. **Install Playwright** (already listed in `package.json` when using this feature):

   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Environment variables**

   | Variable | Where | Purpose |
   |----------|--------|---------|
   | `CODE_IMAGE_PLAYWRIGHT_EXPORT=1` | **Server** | Turns on `POST /api/workspace/code-image-export`. |
   | `NEXT_PUBLIC_CODE_IMAGE_PLAYWRIGHT_EXPORT=1` | **Client** (build-time) | Shows the “Server render (Playwright)” option in the export dialog. |

3. Add to `.env.local` (example):

   ```env
   CODE_IMAGE_PLAYWRIGHT_EXPORT=1
   NEXT_PUBLIC_CODE_IMAGE_PLAYWRIGHT_EXPORT=1
   ```

4. Restart `next dev` / redeploy so both env vars apply.

## API

- **`POST /api/workspace/code-image-export`**
- **Auth:** signed-in session (same cookie as the app).
- **Rate limit:** 20 requests / hour / user (when Upstash Redis is configured).
- **Body:** JSON — see `bodySchema` in `app/api/workspace/code-image-export/route.ts`.

## Operations notes

- First Chromium launch can take a few seconds; long pastes may take **tens of seconds**.
- In **Docker**, use Microsoft’s Playwright image or install deps (`libnss3`, fonts, etc.) — see [Playwright Docker](https://playwright.dev/docs/docker).
- **Sandbox:** the launcher passes `--no-sandbox` for compatibility in containers; tighten for your threat model if needed.

## Alternatives (no Playwright on Vercel)

- **Browserless**, **ScrapingBee**, or similar **hosted headless browser APIs** (HTTP screenshot endpoint).
- A **small sidecar** service (Fly/Railway) that only runs Playwright; the Next app calls it with a signed JWT.

Those match how many products approximate “Canva-quality” raster exports without running Chromium inside Vercel’s function bundle.
