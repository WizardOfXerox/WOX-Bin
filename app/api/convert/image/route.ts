import { NextResponse } from "next/server";
import { z } from "zod";

import { CONVERT_IMAGE_MAX_BYTES, convertImageWithSharp } from "@/lib/convert/sharp-convert";
import { normalizeSharpEncodeSlug } from "@/lib/convert/sharp-formats";
import { toolsDisabledResponse } from "@/lib/tools/disabled-response";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.string().min(1).max(16)
});

/**
 * POST multipart/form-data: `file` (binary), `to` (png|jpeg|webp|avif|tiff|gif|heif)
 * Returns converted image bytes. Files stay in memory only for this request.
 */
export async function POST(req: Request) {
  if (!TOOLS_ENABLED) {
    return toolsDisabledResponse();
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const toRaw = String(form.get("to") ?? "");
  const parsed = bodySchema.safeParse({ to: toRaw });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid `to` format" }, { status: 400 });
  }

  const to = normalizeSharpEncodeSlug(parsed.data.to);
  if (!to) {
    return NextResponse.json({ error: "Unsupported output format" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing or empty file" }, { status: 400 });
  }

  if (file.size > CONVERT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(CONVERT_IMAGE_MAX_BYTES / (1024 * 1024))} MB)` },
      { status: 413 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const { buffer, mime, ext } = await convertImageWithSharp(buf, to);
    const safeName = (file.name || "image").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const base = safeName.replace(/\.[^.]+$/, "") || "image";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${base}.${ext}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Conversion failed";
    return NextResponse.json(
      { error: "Sharp could not convert this file", detail: msg },
      { status: 422 }
    );
  }
}
