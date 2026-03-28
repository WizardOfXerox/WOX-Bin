import { NextResponse } from "next/server";

import { checkEdgeRateLimit } from "@/lib/firewall";
import { createFileDrop, FILE_DROP_MAX_BYTES, PublicDropError } from "@/lib/public-drops";
import { safeDownloadBasename } from "@/lib/paste-download";
import { getAppOrigin, getRequestIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const ip = getRequestIp(request) ?? "anonymous";
  const edgeLimit = await checkEdgeRateLimit("public-drop-upload", request, ip);
  if (edgeLimit.rateLimited) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  const limit = await rateLimit("file-drop-upload", ip);
  if (!limit.success) {
    return jsonError("Rate limit exceeded. Try again later.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data upload.", 400);
  }

  const uploadFile = form.get("file");
  if (!(uploadFile instanceof File) || uploadFile.size <= 0) {
    return jsonError("Choose a file to encrypt and upload.", 400);
  }
  if (uploadFile.size > FILE_DROP_MAX_BYTES) {
    return jsonError(`File exceeds ${FILE_DROP_MAX_BYTES} bytes.`, 413);
  }

  const metadataCiphertext = typeof form.get("metadataCiphertext") === "string" ? String(form.get("metadataCiphertext")) : "";
  const metadataIv = typeof form.get("metadataIv") === "string" ? String(form.get("metadataIv")) : "";
  const payloadIv = typeof form.get("payloadIv") === "string" ? String(form.get("payloadIv")) : "";
  const expires = typeof form.get("expires") === "string" ? String(form.get("expires")).trim() : null;

  try {
    const drop = await createFileDrop({
      filename: safeDownloadBasename(uploadFile.name || "encrypted.bin", "encrypted.bin"),
      mimeType: "application/octet-stream",
      contentBase64: Buffer.from(await uploadFile.arrayBuffer()).toString("base64"),
      sizeBytes: uploadFile.size,
      secret: true,
      encrypted: true,
      payloadIv,
      metadataCiphertext,
      metadataIv,
      expires,
      ip,
      userAgent: request.headers.get("user-agent")
    });

    const origin = getAppOrigin(request);
    return NextResponse.json(
      {
        slug: drop.slug,
        shareUrl: `${origin}/v/${drop.slug}`,
        rawUrl: `${origin}${drop.urlPath}`,
        manageUrl: `${origin}/v/manage/${drop.slug}`,
        manageToken: drop.deleteToken,
        expiresAt: drop.expiresAt
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PublicDropError) {
      return jsonError(error.message, error.status);
    }
    return jsonError(error instanceof Error ? error.message : "Could not create the encrypted file vault.", 500);
  }
}
