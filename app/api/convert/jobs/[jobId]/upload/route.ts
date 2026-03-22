import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CONVERT_JOB_MAX_INPUT_BYTES, isConvertStorageConfigured } from "@/lib/convert/convert-s3-env";
import { db, ensureDatabaseUrl } from "@/lib/db";
import { conversionJobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getConvertS3Client, inputObjectKey } from "@/lib/storage/convert-s3";
import { toolsDisabledResponse } from "@/lib/tools/disabled-response";
import { TOOLS_ENABLED } from "@/lib/tools/availability";

export const runtime = "nodejs";

/** Large proxy uploads: raise on Vercel Pro. On Hobby, use CONVERT_UPLOAD_VIA=presign (default on Vercel builds). */
export const maxDuration = 300;

type RouteCtx = { params: Promise<{ jobId: string }> };

/**
 * Multipart: `token` (job public token), `file` (binary).
 * Uploads input to object storage and marks the job ready for the worker (no browser→MinIO CORS).
 */
export async function POST(req: Request, ctx: RouteCtx) {
  if (!TOOLS_ENABLED) {
    return toolsDisabledResponse();
  }

  if (!isConvertStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured", code: "STORAGE_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  try {
    ensureDatabaseUrl();
  } catch {
    return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  }

  const { jobId } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const tokenRaw = String(form.get("token") ?? "");
  const tokenParsed = z.string().min(16).max(200).safeParse(tokenRaw);
  if (!tokenParsed.success) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing or empty file" }, { status: 400 });
  }

  if (file.size > CONVERT_JOB_MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(CONVERT_JOB_MAX_INPUT_BYTES / (1024 * 1024))} MB)` },
      { status: 413 }
    );
  }

  const [job] = await db
    .select()
    .from(conversionJobs)
    .where(and(eq(conversionJobs.id, jobId), eq(conversionJobs.publicToken, tokenParsed.data)))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (job.handler !== "ffmpeg" || job.status !== "pending") {
    return NextResponse.json({ error: "Job cannot accept upload" }, { status: 400 });
  }
  if (job.inputReady) {
    return NextResponse.json({ error: "Upload already completed" }, { status: 400 });
  }

  const pair = getConvertS3Client();
  if (!pair) {
    return NextResponse.json({ error: "S3 client unavailable" }, { status: 503 });
  }

  const key = inputObjectKey(jobId);
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await pair.client.send(
      new PutObjectCommand({
        Bucket: pair.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: file.type?.trim() || "application/octet-stream"
      })
    );
  } catch (e) {
    console.error("[convert/jobs/upload] PutObject failed", e);
    return NextResponse.json({ error: "Could not store file" }, { status: 502 });
  }

  await db
    .update(conversionJobs)
    .set({
      inputStorageKey: key,
      inputReady: true,
      originalFilename: file.name?.slice(0, 500) || job.originalFilename,
      sourceMime: file.type?.slice(0, 200) || job.sourceMime,
      updatedAt: new Date()
    })
    .where(eq(conversionJobs.id, jobId));

  return NextResponse.json({ ok: true, inputBytes: body.length });
}
