import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { buildCodeImageExportHtml } from "@/lib/server/code-image-export-html";
import { screenshotHtmlWithPlaywright } from "@/lib/server/playwright-code-image";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  format: z.enum(["png", "jpeg"]).default("png"),
  jpegQuality: z.number().min(0.5).max(1).default(0.92),
  deviceScaleFactor: z.number().min(1).max(3).default(2),
  viewportWidth: z.number().int().min(200).max(4000),
  presetId: z.string().max(64),
  language: z.string().max(120),
  /** Full `<pre class="language-…">…</pre>` HTML (syntax-highlighted), same as client preview. */
  preCodeHtml: z.string().max(800_000),
  windowWidthPx: z.number().int().min(0).max(2400).nullable().optional(),
  canvasPadX: z.number().min(0).max(240).default(24),
  canvasPadY: z.number().min(0).max(240).default(24),
  showDots: z.boolean().default(true),
  watermarkText: z.string().max(200).optional().nullable(),
  cornerRadiusPx: z.number().min(0).max(48).default(16),
  codePaddingPx: z.number().min(0).max(96).default(24),
  fitLongestLine: z.boolean().default(true)
});

function playwrightExportEnabled(): boolean {
  const v = process.env.CODE_IMAGE_PLAYWRIGHT_EXPORT?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function POST(request: Request) {
  if (!playwrightExportEnabled()) {
    return jsonError(
      "Server-side code image export is disabled. Set CODE_IMAGE_PLAYWRIGHT_EXPORT=1 and install Chromium — see docs/CODE_IMAGE_SERVER.md.",
      503
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const limit = await rateLimit("code-image-export", session.user.id);
  if (!limit.success) {
    return jsonError("Too many server exports. Try again later.", 429);
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body.");
  }

  const b = parsed.data;
  const windowWidthPx =
    b.windowWidthPx != null && b.windowWidthPx > 0 ? b.windowWidthPx : null;

  try {
    const html = buildCodeImageExportHtml({
      presetId: b.presetId,
      language: b.language,
      preCodeHtml: b.preCodeHtml,
      windowWidthPx,
      canvasPadX: b.canvasPadX,
      canvasPadY: b.canvasPadY,
      showDots: b.showDots,
      watermarkText: b.watermarkText ?? null,
      cornerRadiusPx: b.cornerRadiusPx,
      codeAreaPaddingPx: b.codePaddingPx,
      fitLongestLine: b.fitLongestLine
    });

    const buffer = await screenshotHtmlWithPlaywright({
      html,
      viewportWidth: b.viewportWidth,
      deviceScaleFactor: b.deviceScaleFactor,
      format: b.format,
      jpegQuality: b.jpegQuality
    });

    const mime = b.format === "jpeg" ? "image/jpeg" : "image/png";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[code-image-export]", e);
    return jsonError(
      msg.length < 220 ? msg : "Server export failed. Check server logs and Playwright/Chromium setup.",
      500
    );
  }
}
