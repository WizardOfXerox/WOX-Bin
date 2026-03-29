import { NextResponse } from "next/server";

import { checkEdgeRateLimit } from "@/lib/firewall";
import { logError, logInfo } from "@/lib/logging";
import { safeDownloadBasename } from "@/lib/paste-download";
import { createFileDrop, FILE_DROP_MAX_BYTES, PublicDropError } from "@/lib/public-drops";
import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { readResponseBytesCapped, safeFetchPublicUrl, SafeOutboundError } from "@/lib/safe-outbound";

function textError(message: string, status = 400) {
  return new NextResponse(`${message}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function filenameFromUrl(url: URL) {
  const raw = url.pathname.split("/").filter(Boolean).pop();
  return safeDownloadBasename(raw || "remote-file.bin", "remote-file.bin");
}

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "anonymous";
  const edgeLimit = await checkEdgeRateLimit("public-drop-upload", request, ip);
  if (edgeLimit.rateLimited) {
    return textError("Rate limit exceeded. Try again later.", 429);
  }

  const limit = await rateLimit("file-drop-upload", ip);
  if (!limit.success) {
    return textError("Rate limit exceeded. Try again later.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return textError("Expected multipart/form-data upload.", 400);
  }

  const uploadFile = form.get("file");
  const uploadUrl = typeof form.get("url") === "string" ? String(form.get("url")).trim() : "";
  const expires = typeof form.get("expires") === "string" ? String(form.get("expires")).trim() : null;
  const secret = form.has("secret");

  if ((uploadFile instanceof File && uploadFile.size > 0) && uploadUrl) {
    return textError("Use either file or url, not both.", 400);
  }

  try {
    let filename: string;
    let mimeType: string;
    let sizeBytes: number;
    let contentBase64: string;

    if (uploadFile instanceof File && uploadFile.size > 0) {
      if (uploadFile.size > FILE_DROP_MAX_BYTES) {
        return textError(`File exceeds ${FILE_DROP_MAX_BYTES} bytes.`, 413);
      }

      filename = safeDownloadBasename(uploadFile.name || "upload.bin", "upload.bin");
      mimeType = uploadFile.type?.trim() || "application/octet-stream";
      sizeBytes = uploadFile.size;
      contentBase64 = Buffer.from(await uploadFile.arrayBuffer()).toString("base64");
    } else if (uploadUrl) {
      const { response: remoteResponse, finalUrl } = await safeFetchPublicUrl(uploadUrl, {
        label: "Remote upload URL",
        maxRedirects: 3,
        headers: {
          "User-Agent": "WOX-Bin/2.0 remote fetch"
        }
      });

      if (!remoteResponse.ok) {
        return textError(`Remote fetch failed (${remoteResponse.status}).`, 400);
      }

      const bytes = await readResponseBytesCapped(remoteResponse, FILE_DROP_MAX_BYTES, "Remote file");
      if (bytes.byteLength === 0) {
        return textError("Remote file is empty.", 400);
      }

      filename = filenameFromUrl(finalUrl);
      mimeType = remoteResponse.headers.get("content-type")?.trim() || "application/octet-stream";
      sizeBytes = bytes.byteLength;
      contentBase64 = bytes.toString("base64");
    } else {
      return textError("Provide file=@... or url=...", 400);
    }

    const drop = await createFileDrop({
      filename,
      mimeType,
      contentBase64,
      sizeBytes,
      secret,
      expires,
      ip,
      userAgent: request.headers.get("user-agent")
    });
    logInfo("public_drop.file_created", {
      ip,
      slug: drop.slug,
      filename: drop.filename
    });

    const origin = getAppOrigin(request);
    return new NextResponse(`${origin}${drop.urlPath}\n`, {
      status: 201,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Token": drop.deleteToken
      }
    });
  } catch (error) {
    if (error instanceof SafeOutboundError) {
      logInfo("public_drop.file_rejected", {
        ip,
        message: error.message,
        status: error.status
      });
      return textError(error.message, error.status);
    }
    if (error instanceof PublicDropError) {
      logInfo("public_drop.file_rejected", {
        ip,
        message: error.message,
        status: error.status
      });
      return textError(error.message, error.status);
    }
    logError("public_drop.file_failed", error, { ip });
    throw error;
  }
}
