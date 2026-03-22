/**
 * Headless Chromium screenshot — avoids per-tile client canvas limits (similar idea to server-side tools like Canva).
 * Requires the `playwright` package and `npx playwright install chromium` on the host.
 */

export type PlaywrightScreenshotOpts = {
  html: string;
  /** Initial viewport width; fullPage still captures full document height. */
  viewportWidth: number;
  deviceScaleFactor: number;
  format: "png" | "jpeg";
  jpegQuality?: number;
};

export async function screenshotHtmlWithPlaywright(opts: PlaywrightScreenshotOpts): Promise<Buffer> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "Playwright is not installed. Run: npm install playwright && npx playwright install chromium"
    );
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"]
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: Math.min(4096, Math.max(200, opts.viewportWidth)),
        height: 720
      },
      deviceScaleFactor: opts.deviceScaleFactor
    });
    const page = await context.newPage();

    await page.setContent(opts.html, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(async () => {
      await (document.fonts?.ready ?? Promise.resolve());
    });
    await new Promise((r) => setTimeout(r, 150));

    const buf = await page.screenshot({
      type: opts.format === "jpeg" ? "jpeg" : "png",
      quality: opts.format === "jpeg" ? Math.round((opts.jpegQuality ?? 0.92) * 100) : undefined,
      fullPage: true,
      omitBackground: opts.format === "png"
    });

    return buf as Buffer;
  } finally {
    await browser.close();
  }
}

