import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPasteAccessCookieName, getPasteCaptchaCookieName } from "@/lib/paste-access";
import { safeDownloadBasename, asciiContentDispositionFilename } from "@/lib/paste-download";
import { getPasteForViewer } from "@/lib/paste-service";
import { publicScrapeRateGate } from "@/lib/public-scrape";
import { viewerFromSession } from "@/lib/session";

type Params = {
  params: Promise<{
    slug: string;
    index: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const gate = await publicScrapeRateGate(request);
  if (!gate.ok) {
    return gate.textResponse;
  }

  const { slug, index } = await params;
  const fileIndex = Number.parseInt(index, 10);
  if (!Number.isInteger(fileIndex) || fileIndex < 0) {
    return new NextResponse("Attachment not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...gate.rateHeaders
      }
    });
  }

  const session = await auth();
  const viewer = viewerFromSession(session);
  const cookieStore = await cookies();
  const accessGrant = cookieStore.get(getPasteAccessCookieName(slug))?.value ?? null;
  const captchaGrant = cookieStore.get(getPasteCaptchaCookieName(slug))?.value ?? null;

  const result = await getPasteForViewer({
    slug,
    viewer,
    accessGrant,
    captchaGrant,
    trackView: true
  });

  if (!result.paste) {
    return new NextResponse("Paste not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...gate.rateHeaders
      }
    });
  }

  if (result.locked) {
    return new NextResponse(
      result.lockReason === "captcha" ? "This paste requires CAPTCHA verification." : "This paste is password-protected.",
      {
        status: 423,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          ...gate.rateHeaders
        }
      }
    );
  }

  const file = result.paste.files[fileIndex];
  if (!file) {
    return new NextResponse("Attachment not found.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...gate.rateHeaders
      }
    });
  }

  const wantDownload = new URL(request.url).searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    ...gate.rateHeaders
  };

  if (file.mediaKind && file.mimeType) {
    headers["Content-Type"] = file.mimeType;
    if (wantDownload) {
      headers["Content-Disposition"] = `attachment; filename="${asciiContentDispositionFilename(
        safeDownloadBasename(file.filename, "attachment")
      )}"`;
    }

    return new NextResponse(Buffer.from(file.content, "base64"), {
      headers
    });
  }

  headers["Content-Type"] = "text/plain; charset=utf-8";
  if (wantDownload) {
    headers["Content-Disposition"] = `attachment; filename="${asciiContentDispositionFilename(
      safeDownloadBasename(file.filename, "attachment.txt")
    )}"`;
  }

  return new NextResponse(file.content, { headers });
}
