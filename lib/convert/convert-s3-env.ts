/**
 * S3-compatible storage for conversion jobs (AWS S3, Cloudflare R2, MinIO).
 * @see docs/CONVERSION-WORKER.md
 */

export type ConvertS3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Required for MinIO / R2 custom endpoints */
  forcePathStyle: boolean;
};

export function getConvertS3Config(): ConvertS3Config | null {
  const bucket = process.env.CONVERT_S3_BUCKET?.trim();
  const accessKeyId = process.env.CONVERT_S3_ACCESS_KEY?.trim() || process.env.CONVERT_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.CONVERT_S3_SECRET_KEY?.trim() || process.env.CONVERT_S3_SECRET_ACCESS_KEY?.trim();
  const region = process.env.CONVERT_S3_REGION?.trim() || "auto";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = process.env.CONVERT_S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle =
    process.env.CONVERT_S3_FORCE_PATH_STYLE === "1" ||
    process.env.CONVERT_S3_FORCE_PATH_STYLE === "true" ||
    Boolean(endpoint);

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle
  };
}

export function isConvertStorageConfigured(): boolean {
  return getConvertS3Config() != null;
}

export const CONVERT_JOB_MAX_INPUT_BYTES = Math.min(
  Number(process.env.CONVERT_JOB_MAX_INPUT_BYTES) || 500 * 1024 * 1024,
  2 * 1024 * 1024 * 1024
);

export const CONVERT_PRESIGN_TTL_SECONDS = Math.min(
  Number(process.env.CONVERT_PRESIGN_TTL_SECONDS) || 900,
  3600
);
