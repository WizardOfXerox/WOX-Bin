/**
 * Polls Postgres for FFmpeg conversion jobs, runs ffmpeg, uploads output to S3.
 *
 *   npm run worker:convert
 *
 * Requires: DATABASE_URL, CONVERT_S3_*, ffmpeg on PATH, populated schema (npm run db:push).
 */
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { buildFfmpegArgs, getFfmpegWorkerPlan } from "@/lib/convert/ffmpeg-plan";
import { markJobDone, markJobFailed } from "@/lib/convert/conversion-job-service";
import { parseConversionPath } from "@/lib/convert/parse-path";
import { sql } from "@/lib/db";
import {
  downloadInputToFile,
  ensureConvertObjectBucket,
  outputObjectKey,
  uploadFileToOutputKey
} from "@/lib/storage/convert-s3";

const execFileAsync = promisify(execFile);

const POLL_MS = Math.max(1000, Number(process.env.CONVERT_WORKER_POLL_MS) || 3000);

type ClaimedRow = {
  id: string;
  pair_path: string | null;
  target_format: string;
  output_mime: string | null;
  original_filename: string | null;
};

async function claimNextJob(): Promise<ClaimedRow | null> {
  const rows = await sql`
    WITH picked AS (
      SELECT id FROM conversion_jobs
      WHERE status = 'pending' AND input_ready = true AND handler = 'ffmpeg'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE conversion_jobs AS j
    SET status = 'processing', updated_at = NOW()
    FROM picked
    WHERE j.id = picked.id
    RETURNING j.id, j.pair_path, j.target_format, j.output_mime, j.original_filename;
  `;
  const row = rows[0] as ClaimedRow | undefined;
  return row ?? null;
}

function outputDownloadFileName(originalFilename: string | null, outputExt: string): string {
  const base =
    originalFilename
      ?.split(/[/\\]/)
      .pop()
      ?.replace(/\.[^.]+$/, "")
      .replace(/[^\w.\-()+@ ]+/g, "_")
      .slice(0, 120) || "converted";
  return `${base}.${outputExt}`;
}

function inputExtension(originalFilename: string | null): string {
  if (!originalFilename) {
    return "bin";
  }
  const base = originalFilename.split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot >= base.length - 1) {
    return "bin";
  }
  const ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext.slice(0, 12) || "bin";
}

async function processJob(job: ClaimedRow): Promise<void> {
  const pairPath = job.pair_path;
  if (!pairPath) {
    await markJobFailed(job.id, "Missing pair_path");
    return;
  }

  const parsed = parseConversionPath(pairPath);
  if (!parsed) {
    await markJobFailed(job.id, "Invalid pair_path");
    return;
  }

  const plan = getFfmpegWorkerPlan(parsed.from, parsed.to);
  if (!plan) {
    await markJobFailed(job.id, "No FFmpeg plan for this pair");
    return;
  }

  const workDir = await mkdtemp(join(tmpdir(), "wox-convert-"));
  const inExt = inputExtension(job.original_filename);
  const inPath = join(workDir, `input.${inExt}`);
  const outPath = join(workDir, `out.${plan.outputExt}`);

  try {
    await downloadInputToFile(job.id, inPath);
    const args = buildFfmpegArgs(inPath, outPath, plan);
    await execFileAsync("ffmpeg", args, { maxBuffer: 10 * 1024 * 1024 });
    const outKey = outputObjectKey(job.id, plan.outputExt);
    await uploadFileToOutputKey(outPath, outKey, job.output_mime ?? plan.outputMime, {
      downloadFileName: outputDownloadFileName(job.original_filename, plan.outputExt)
    });
    await markJobDone(job.id, outKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markJobFailed(job.id, msg);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function loop(): Promise<void> {
  for (;;) {
    try {
      const job = await claimNextJob();
      if (job) {
        await processJob(job);
      } else {
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    } catch (e) {
      console.error("[convert-worker] loop error", e);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

void (async () => {
  try {
    await ensureConvertObjectBucket();
  } catch (e) {
    console.error("[convert-worker] bucket check failed (set CONVERT_S3_*)", e);
    process.exit(1);
  }
  console.info("[convert-worker] started; poll interval ms =", POLL_MS);
  void loop();
})();
