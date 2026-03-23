import { NextResponse } from "next/server";

import { safeDownloadBasename } from "@/lib/paste-download";
import { createFileDrop, assertSafeRemoteSource, FILE_DROP_MAX_BYTES, PublicDropError } from "@/lib/public-drops";
import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

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
      const remoteUrl = await assertSafeRemoteSource(uploadUrl);
      const remoteResponse = await fetch(remoteUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "WOX-Bin/2.0 remote fetch"
        }
      });

      if (!remoteResponse.ok) {
        return textError(`Remote fetch failed (${remoteResponse.status}).`, 400);
      }

      const lengthHeader = remoteResponse.headers.get("content-length");
      const parsedLength = lengthHeader ? Number(lengthHeader) : NaN;
      if (!Number.isFinite(parsedLength) || parsedLength <= 0) {
        return textError("Remote URL must provide Content-Length.", 400);
      }
      if (parsedLength > FILE_DROP_MAX_BYTES) {
        return textError(`Remote file exceeds ${FILE_DROP_MAX_BYTES} bytes.`, 413);
      }

      filename = filenameFromUrl(remoteUrl);
      mimeType = remoteResponse.headers.get("content-type")?.trim() || "application/octet-stream";
      sizeBytes = parsedLength;
      contentBase64 = Buffer.from(await remoteResponse.arrayBuffer()).toString("base64");
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

    const origin = getAppOrigin(request);
    return new NextResponse(`${origin}${drop.urlPath}\n`, {
      status: 201,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Token": drop.deleteToken
      }
    });
  } catch (error) {
    if (error instanceof PublicDropError) {
      return textError(error.message, error.status);
    }
    throw error;
  }
}
