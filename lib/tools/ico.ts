/**
 * Multi-resolution Windows ICO generator.
 * Packs multiple PNG images into a standard .ico binary format.
 *
 * Binary Structure:
 * - Header (6 bytes):
 *   - 2 bytes: Reserved (0)
 *   - 2 bytes: Image type (1 for .ico)
 *   - 2 bytes: Number of images (N)
 * - Directory Entry per image (16 bytes each):
 *   - 1 byte: Width (1-255, 0 represents 256)
 *   - 1 byte: Height (1-255, 0 represents 256)
 *   - 1 byte: Number of colors in palette (0 for truecolor/PNG)
 *   - 1 byte: Reserved (0)
 *   - 2 bytes: Color planes (1)
 *   - 2 bytes: Bits per pixel (32)
 *   - 4 bytes: Size of image data in bytes
 *   - 4 bytes: Offset of image data from start of file
 * - Image Data:
 *   - PNG data blocks concatenated in order
 */

export const ICO_RESOLUTIONS = [16, 32, 48, 64, 128, 256] as const;
export type IcoResolution = (typeof ICO_RESOLUTIONS)[number];

export type IcoImageEntry = {
  /** Target resolution in pixels (e.g. 16, 32, 48, 64, 128, 256) */
  size: number;
  /** Encoded PNG byte data */
  pngBytes: Uint8Array;
};

/**
 * Packs one or more PNG image entries into a binary Windows ICO buffer.
 */
export function buildIco(entries: IcoImageEntry[]): Uint8Array {
  if (entries.length === 0) {
    throw new Error("At least one image resolution is required to generate an ICO file.");
  }
  if (entries.length > 65535) {
    throw new Error("Too many images for ICO format limit (max 65,535).");
  }

  const HEADER_SIZE = 6;
  const DIR_ENTRY_SIZE = 16;
  const totalDirSize = entries.length * DIR_ENTRY_SIZE;
  const totalHeaderSize = HEADER_SIZE + totalDirSize;

  let totalDataSize = 0;
  for (const entry of entries) {
    totalDataSize += entry.pngBytes.byteLength;
  }

  const output = new Uint8Array(totalHeaderSize + totalDataSize);
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);

  // 1. ICONDIR Header (6 bytes)
  view.setUint16(0, 0, true); // Reserved (must be 0)
  view.setUint16(2, 1, true); // Resource Type: 1 for Icon (.ICO)
  view.setUint16(4, entries.length, true); // Image count (N)

  // 2. Directory entries & 3. PNG data blocks
  let currentOffset = totalHeaderSize;
  let dirOffset = HEADER_SIZE;

  for (const entry of entries) {
    // In ICO specification, a dimension of 256 pixels is encoded as 0
    const w = entry.size >= 256 ? 0 : Math.min(Math.max(entry.size, 1), 255);
    const h = entry.size >= 256 ? 0 : Math.min(Math.max(entry.size, 1), 255);

    view.setUint8(dirOffset + 0, w);
    view.setUint8(dirOffset + 1, h);
    view.setUint8(dirOffset + 2, 0); // Palette count: 0 for 32bpp PNG
    view.setUint8(dirOffset + 3, 0); // Reserved: must be 0
    view.setUint16(dirOffset + 4, 1, true); // Color planes: 1
    view.setUint16(dirOffset + 6, 32, true); // Bits per pixel: 32
    view.setUint32(dirOffset + 8, entry.pngBytes.byteLength, true); // PNG byte length
    view.setUint32(dirOffset + 12, currentOffset, true); // Image data offset

    // Copy raw PNG bytes
    output.set(entry.pngBytes, currentOffset);

    currentOffset += entry.pngBytes.byteLength;
    dirOffset += DIR_ENTRY_SIZE;
  }

  return output;
}

/**
 * Render a canvas element to a PNG Blob.
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to render canvas to PNG blob."));
      }
    }, "image/png");
  });
}

/**
 * Resizes a source image into a square canvas of `targetSize` x `targetSize`
 * and exports as a PNG Blob.
 */
export async function renderImageToSquarePng(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  fit: "contain" | "cover" = "contain"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D context from canvas.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (fit === "cover") {
    const scale = Math.max(targetSize / sourceWidth, targetSize / sourceHeight);
    const w = sourceWidth * scale;
    const h = sourceHeight * scale;
    const x = (targetSize - w) / 2;
    const y = (targetSize - h) / 2;
    ctx.drawImage(source, x, y, w, h);
  } else {
    // "contain" (default): preserve aspect ratio, centered with transparency
    const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
    const w = sourceWidth * scale;
    const h = sourceHeight * scale;
    const x = (targetSize - w) / 2;
    const y = (targetSize - h) / 2;
    ctx.drawImage(source, x, y, w, h);
  }

  return canvasToPngBlob(canvas);
}
