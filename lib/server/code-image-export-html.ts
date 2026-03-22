/**
 * Standalone HTML document for headless Chromium (Playwright) code-image export.
 * Mirrors the client preview enough for sharp full-page screenshots without browser canvas limits.
 */

import { CODE_IMAGE_PRESETS } from "@/lib/code-image-design";

const PRISM_THEME_HREF = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css";

export type CodeImageExportHtmlParams = {
  presetId: string;
  language: string;
  /** Full `<pre class="language-...">...</pre>` HTML (already syntax-highlighted). */
  preCodeHtml: string;
  windowWidthPx: number | null;
  canvasPadX: number;
  canvasPadY: number;
  showDots: boolean;
  watermarkText: string | null;
  cornerRadiusPx: number;
  codeAreaPaddingPx: number;
  fitLongestLine: boolean;
};

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildCodeImageExportHtml(p: CodeImageExportHtmlParams): string {
  const preset = CODE_IMAGE_PRESETS.find((x) => x.id === p.presetId) ?? CODE_IMAGE_PRESETS[0]!;

  const windowStyle =
    p.windowWidthPx != null
      ? `width:${p.windowWidthPx}px;max-width:none;min-width:${p.windowWidthPx}px;box-sizing:border-box;`
      : p.fitLongestLine
        ? `width:max-content;max-width:min(1600px,100%);min-width:0;box-sizing:border-box;`
        : `width:100%;max-width:100%;min-width:0;box-sizing:border-box;`;

  const dots =
    p.showDots && preset.dots.length >= 3
      ? `<span style="display:flex;gap:8px;align-items:center;">
          <span style="width:12px;height:12px;border-radius:9999px;background:${preset.dots[0]}"></span>
          <span style="width:12px;height:12px;border-radius:9999px;background:${preset.dots[1]}"></span>
          <span style="width:12px;height:12px;border-radius:9999px;background:${preset.dots[2]}"></span>
        </span>`
      : `<span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.6;color:${preset.titleBarText}">code</span>`;

  const wm =
    p.watermarkText && p.watermarkText.trim().length > 0
      ? `<p style="margin:8px 0 0;text-align:center;font-size:10px;font-weight:500;letter-spacing:0.03em;opacity:0.5;color:${preset.titleBarText}">${escAttr(p.watermarkText.trim())}</p>`
      : "";

  const outerBg =
    typeof preset.outerStyle.background === "string" && preset.outerStyle.background.length > 0
      ? preset.outerStyle.background
      : "#121212";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${PRISM_THEME_HREF}" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      margin: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .outer {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      min-width: min-content;
    }
    .window {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid ${preset.titleBarBorder};
      border-radius: ${p.cornerRadiusPx}px;
      background: ${preset.titleBarBg};
      box-shadow: 0 14px 28px rgba(0,0,0,0.32);
    }
    .titlebar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid ${preset.titleBarBorder};
      background: ${preset.titleBarBg};
    }
    .lang {
      margin-left: auto;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${preset.titleBarText};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .code-area {
      background: ${preset.codeBg};
      padding: ${p.codeAreaPaddingPx}px;
      overflow-x: auto;
    }
    .code-area pre { margin: 0; }
  </style>
</head>
<body style="background:${outerBg};">
  <div class="outer" style="padding:${p.canvasPadY}px ${p.canvasPadX}px;background:${outerBg};">
    <div class="window" style="${windowStyle}">
      <div class="titlebar">
        ${dots}
        <span class="lang">${escAttr(p.language)}</span>
      </div>
      <div class="code-area">${p.preCodeHtml}</div>
    </div>
    ${wm}
  </div>
</body>
</html>`;
}
