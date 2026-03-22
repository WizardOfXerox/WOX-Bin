import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  CONVERT_PRESIGN_TTL_SECONDS,
  getConvertS3Config,
  type ConvertS3Config
} from "@/lib/convert/convert-s3-env";

let cacheKey = "";
let cachedClient: S3Client | null = null;

export function getConvertS3Client(): { client: S3Client; cfg: ConvertS3Config } | null {
  const cfg = getConvertS3Config();
  if (!cfg) {
    return null;
  }
  const key = `${cfg.bucket}|${cfg.endpoint ?? ""}|${cfg.region}|${cfg.forcePathStyle}`;
  if (key !== cacheKey || !cachedClient) {
    cacheKey = key;
    cachedClient = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey
      },
      forcePathStyle: cfg.forcePathStyle
    });
  }
  return { client: cachedClient, cfg };
}

/** Call once per process before presigning (idempotent). */
export async function ensureConvertObjectBucket(): Promise<void> {
  const pair = getConvertS3Client();
  if (!pair) {
    throw new Error("S3 not configured");
  }
  const { client, cfg } = pair;
  try {
    await client.send(new HeadBucketCommand({ Bucket: cfg.bucket }));
  } catch (e: unknown) {
    const name = e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "";
    if (name === "NotFound" || name === "NoSuchBucket") {
      await client.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
      return;
    }
    /* MinIO sometimes returns 404 differently */
    const status =
      e && typeof e === "object" && "$metadata" in e
        ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    if (status === 404) {
      await client.send(new CreateBucketCommand({ Bucket: cfg.bucket }));
      return;
    }
    throw e;
  }
}

export function inputObjectKey(jobId: string): string {
  return `convert-jobs/${jobId}/input`;
}

export function outputObjectKey(jobId: string, ext: string): string {
  const safe = ext.replace(/[^a-z0-9]+/gi, "").slice(0, 8) || "out";
  return `convert-jobs/${jobId}/out.${safe}`;
}

export async function presignPutInput(jobId: string, contentType: string): Promise<string | null> {
  const pair = getConvertS3Client();
  if (!pair) {
    return null;
  }
  const key = inputObjectKey(jobId);
  const cmd = new PutObjectCommand({
    Bucket: pair.cfg.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream"
  });
  return getSignedUrl(pair.client, cmd, { expiresIn: CONVERT_PRESIGN_TTL_SECONDS });
}

export async function presignGetOutput(jobId: string, outputKey: string): Promise<string | null> {
  const pair = getConvertS3Client();
  if (!pair) {
    return null;
  }
  const cmd = new GetObjectCommand({
    Bucket: pair.cfg.bucket,
    Key: outputKey
  });
  return getSignedUrl(pair.client, cmd, { expiresIn: CONVERT_PRESIGN_TTL_SECONDS });
}

export async function headInputObject(jobId: string): Promise<{ contentLength: number } | null> {
  const pair = getConvertS3Client();
  if (!pair) {
    return null;
  }
  try {
    const out = await pair.client.send(
      new HeadObjectCommand({
        Bucket: pair.cfg.bucket,
        Key: inputObjectKey(jobId)
      })
    );
    const len = out.ContentLength ?? 0;
    return { contentLength: len };
  } catch {
    return null;
  }
}

export async function downloadInputToFile(jobId: string, destPath: string): Promise<void> {
  const pair = getConvertS3Client();
  if (!pair) {
    throw new Error("S3 not configured");
  }
  const res = await pair.client.send(
    new GetObjectCommand({
      Bucket: pair.cfg.bucket,
      Key: inputObjectKey(jobId)
    })
  );
  if (!res.Body) {
    throw new Error("Empty S3 object body");
  }
  const fs = await import("node:fs/promises");
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  await fs.writeFile(destPath, Buffer.concat(chunks));
}

export async function uploadFileToOutputKey(
  localPath: string,
  outputKey: string,
  contentType: string,
  opts?: { downloadFileName?: string }
): Promise<void> {
  const pair = getConvertS3Client();
  if (!pair) {
    throw new Error("S3 not configured");
  }
  const fs = await import("node:fs/promises");
  const body = await fs.readFile(localPath);
  const safeName = opts?.downloadFileName?.replace(/[^\w.\-()+@ ]+/g, "_").slice(0, 180);
  const ContentDisposition = safeName ? `attachment; filename="${safeName}"` : undefined;
  await pair.client.send(
    new PutObjectCommand({
      Bucket: pair.cfg.bucket,
      Key: outputKey,
      Body: body,
      ContentType: contentType,
      ...(ContentDisposition ? { ContentDisposition } : {})
    })
  );
}
