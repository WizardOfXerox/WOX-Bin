import sharp from "sharp";

import type { SharpEncodeSlug } from "@/lib/convert/sharp-formats";

export const CONVERT_IMAGE_MAX_BYTES = Math.min(
  Number(process.env.CONVERT_IMAGE_MAX_BYTES) || 12 * 1024 * 1024,
  25 * 1024 * 1024
);

/**
 * Convert arbitrary image buffer to target format (first page / first frame when needed).
 */
export async function convertImageWithSharp(input: Buffer, to: SharpEncodeSlug): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const base =
    to === "gif"
      ? sharp(input, { failOn: "none", limitInputPixels: 268_402_689, animated: true })
      : sharp(input, { failOn: "none", limitInputPixels: 268_402_689, page: 0 });

  switch (to) {
    case "png": {
      const buffer = await base.png({ compressionLevel: 9 }).toBuffer();
      return { buffer, mime: "image/png", ext: "png" };
    }
    case "jpeg": {
      const buffer = await base.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      return { buffer, mime: "image/jpeg", ext: "jpg" };
    }
    case "webp": {
      const buffer = await base.webp({ quality: 86 }).toBuffer();
      return { buffer, mime: "image/webp", ext: "webp" };
    }
    case "avif": {
      const buffer = await base.avif({ quality: 55 }).toBuffer();
      return { buffer, mime: "image/avif", ext: "avif" };
    }
    case "tiff": {
      const buffer = await base.tiff({ compression: "lzw" }).toBuffer();
      return { buffer, mime: "image/tiff", ext: "tif" };
    }
    case "gif": {
      const buffer = await base.gif().toBuffer();
      return { buffer, mime: "image/gif", ext: "gif" };
    }
    case "heif": {
      const buffer = await base.heif({ quality: 70 }).toBuffer();
      return { buffer, mime: "image/heif", ext: "heif" };
    }
    default: {
      const _x: never = to;
      throw new Error(`Unsupported output: ${String(_x)}`);
    }
  }
}
