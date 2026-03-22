/** Formats we can decode in-browser via Image + canvas (best-effort). */
export const CLIENT_IMAGE_DECODE = new Set([
  "png",
  "jpeg",
  "jpg",
  "jfif",
  "jpe",
  "webp",
  "gif",
  "bmp",
  "avif",
  "svg",
  "ico"
]);

/** Formats we can encode from canvas.toBlob (reliable cross-browser). */
export const CLIENT_IMAGE_ENCODE = new Set(["png", "jpeg", "webp"]);

export function isClientRasterPair(from: string, to: string): boolean {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  return CLIENT_IMAGE_DECODE.has(f) && CLIENT_IMAGE_ENCODE.has(t);
}
