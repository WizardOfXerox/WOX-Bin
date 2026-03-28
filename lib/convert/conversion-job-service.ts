import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { CONVERT_JOB_MAX_INPUT_BYTES } from "@/lib/convert/convert-s3-env";
import type { FfmpegWorkerPlan } from "@/lib/convert/ffmpeg-plan";
import { db } from "@/lib/db";
import { conversionJobs } from "@/lib/db/schema";
import {
  ensureConvertObjectBucket,
  headInputObject,
  inputObjectKey,
  presignGetOutput,
  presignPutInput
} from "@/lib/storage/convert-s3";

const CONVERT_JOB_TTL_HOURS = Math.min(Math.max(Number(process.env.CONVERT_JOB_TTL_HOURS) || 72, 1), 24 * 30);

export function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

function getJobExpiresAt() {
  return new Date(Date.now() + CONVERT_JOB_TTL_HOURS * 60 * 60 * 1000);
}

function isExpired(expiresAt: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export type CreateFfmpegJobInput = {
  pairPath: string;
  plan: FfmpegWorkerPlan;
  userId?: string | null;
  originalFilename?: string | null;
  sourceMime?: string | null;
  declaredInputBytes?: number | null;
};

export async function createFfmpegConversionJob(input: CreateFfmpegJobInput) {
  const bytes = input.declaredInputBytes;
  if (bytes != null && (bytes <= 0 || bytes > CONVERT_JOB_MAX_INPUT_BYTES)) {
    throw new Error("INVALID_SIZE");
  }

  await ensureConvertObjectBucket();

  const publicToken = newPublicToken();
  const [row] = await db
    .insert(conversionJobs)
    .values({
      userId: input.userId ?? null,
      tier: "worker",
      pairPath: input.pairPath,
      handler: "ffmpeg",
      publicToken,
      inputReady: false,
      sourceMime: input.sourceMime ?? null,
      targetFormat: input.plan.to,
      originalFilename: input.originalFilename ?? null,
      outputMime: input.plan.outputMime,
      inputStorageKey: null,
      outputStorageKey: null,
      status: "pending",
      expiresAt: getJobExpiresAt()
    })
    .returning();

  if (!row) {
    throw new Error("INSERT_FAILED");
  }

  const jobId = row.id;
  const inputKey = inputObjectKey(jobId);
  await db.update(conversionJobs).set({ inputStorageKey: inputKey, updatedAt: new Date() }).where(eq(conversionJobs.id, jobId));

  const contentType = input.sourceMime?.trim() || "application/octet-stream";
  const uploadUrl = await presignPutInput(jobId, contentType);
  if (!uploadUrl) {
    throw new Error("PRESIGN_FAILED");
  }

  return {
    jobId,
    publicToken,
    uploadUrl,
    inputKey,
    maxInputBytes: CONVERT_JOB_MAX_INPUT_BYTES,
    outputMime: input.plan.outputMime,
    outputExt: input.plan.outputExt
  };
}

export async function commitFfmpegJobUpload(jobId: string, publicToken: string) {
  const [job] = await db
    .select()
    .from(conversionJobs)
    .where(and(eq(conversionJobs.id, jobId), eq(conversionJobs.publicToken, publicToken)))
    .limit(1);

  if (!job) {
    return { ok: false as const, error: "NOT_FOUND" };
  }
  if (isExpired(job.expiresAt ?? null)) {
    return { ok: false as const, error: "NOT_FOUND" };
  }
  if (job.handler !== "ffmpeg") {
    return { ok: false as const, error: "BAD_HANDLER" };
  }

  const head = await headInputObject(jobId);
  if (!head || head.contentLength <= 0) {
    return { ok: false as const, error: "INPUT_MISSING" };
  }
  if (head.contentLength > CONVERT_JOB_MAX_INPUT_BYTES) {
    return { ok: false as const, error: "INPUT_TOO_LARGE" };
  }

  await db
    .update(conversionJobs)
    .set({ inputReady: true, updatedAt: new Date() })
    .where(eq(conversionJobs.id, jobId));

  return { ok: true as const, inputBytes: head.contentLength };
}

export async function getFfmpegJobForClient(jobId: string, publicToken: string) {
  const [job] = await db
    .select()
    .from(conversionJobs)
    .where(and(eq(conversionJobs.id, jobId), eq(conversionJobs.publicToken, publicToken)))
    .limit(1);

  if (!job) {
    return null;
  }
  if (isExpired(job.expiresAt ?? null)) {
    return null;
  }

  let downloadUrl: string | null = null;
  if (job.status === "done" && job.outputStorageKey) {
    downloadUrl = await presignGetOutput(jobId, job.outputStorageKey);
  }

  return {
    id: job.id,
    status: job.status,
    pairPath: job.pairPath,
    targetFormat: job.targetFormat,
    outputMime: job.outputMime,
    errorMessage: job.errorMessage,
    downloadUrl,
    inputReady: job.inputReady,
    createdAt: job.createdAt
  };
}

export async function markJobFailed(jobId: string, message: string) {
  await db
    .update(conversionJobs)
    .set({
      status: "failed",
      errorMessage: message.slice(0, 4000),
      updatedAt: new Date()
    })
    .where(eq(conversionJobs.id, jobId));
}

export async function markJobDone(jobId: string, outputKey: string) {
  await db
    .update(conversionJobs)
    .set({
      status: "done",
      outputStorageKey: outputKey,
      updatedAt: new Date()
    })
    .where(eq(conversionJobs.id, jobId));
}

/** Presigned GET for a completed job, or null if token/status/key invalid. */
export async function getPresignedDownloadUrl(jobId: string, publicToken: string): Promise<string | null> {
  const [job] = await db
    .select()
    .from(conversionJobs)
    .where(and(eq(conversionJobs.id, jobId), eq(conversionJobs.publicToken, publicToken)))
    .limit(1);

  if (!job || job.status !== "done" || !job.outputStorageKey) {
    return null;
  }
  if (isExpired(job.expiresAt ?? null)) {
    return null;
  }

  return presignGetOutput(jobId, job.outputStorageKey);
}
