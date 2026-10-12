import { describe, expect, it } from "vitest";
import { buildIco, ICO_RESOLUTIONS } from "@/lib/tools/ico";

describe("ICO Generator: buildIco binary builder", () => {
  it("throws when empty entry list is provided", () => {
    expect(() => buildIco([])).toThrow("At least one image resolution is required");
  });

  it("builds a single-resolution ICO file with valid headers and data offsets", () => {
    const dummyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    const ico = buildIco([{ size: 32, pngBytes: dummyPng }]);

    // Header size (6) + 1 Dir Entry (16) + Png Size (10) = 32 bytes
    expect(ico.length).toBe(6 + 16 + 10);

    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    // Reserved must be 0
    expect(view.getUint16(0, true)).toBe(0);
    // Type must be 1 (ICO)
    expect(view.getUint16(2, true)).toBe(1);
    // Image count
    expect(view.getUint16(4, true)).toBe(1);

    // Dir entry 0
    expect(view.getUint8(6)).toBe(32); // width
    expect(view.getUint8(7)).toBe(32); // height
    expect(view.getUint8(8)).toBe(0);  // colors
    expect(view.getUint8(9)).toBe(0);  // reserved
    expect(view.getUint16(10, true)).toBe(1); // planes
    expect(view.getUint16(12, true)).toBe(32); // bpp
    expect(view.getUint32(14, true)).toBe(10); // size of PNG
    expect(view.getUint32(18, true)).toBe(22); // offset = 6 + 16 = 22

    // Check payload bytes
    const payload = ico.subarray(22, 32);
    expect(payload).toEqual(dummyPng);
  });

  it("encodes 256x256 dimensions as 0 in directory entry per ICO specification", () => {
    const dummyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const ico = buildIco([{ size: 256, pngBytes: dummyPng }]);

    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect(view.getUint8(6)).toBe(0); // 256 is encoded as 0
    expect(view.getUint8(7)).toBe(0); // 256 is encoded as 0
  });

  it("packs all standard resolutions (16, 32, 48, 64, 128, 256) sequentially", () => {
    const entries = ICO_RESOLUTIONS.map((res, i) => ({
      size: res,
      // simulate different size PNGs
      pngBytes: new Uint8Array(100 + i * 20).fill(i + 1)
    }));

    const ico = buildIco(entries);
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);

    expect(view.getUint16(4, true)).toBe(6); // 6 images

    let expectedOffset = 6 + 6 * 16;
    for (let i = 0; i < entries.length; i++) {
      const entryOffset = 6 + i * 16;
      const sizeVal = entries[i]!.size >= 256 ? 0 : entries[i]!.size;
      expect(view.getUint8(entryOffset + 0)).toBe(sizeVal);
      expect(view.getUint8(entryOffset + 1)).toBe(sizeVal);
      expect(view.getUint32(entryOffset + 8, true)).toBe(entries[i]!.pngBytes.byteLength);
      expect(view.getUint32(entryOffset + 12, true)).toBe(expectedOffset);

      // Verify data match
      const data = ico.subarray(expectedOffset, expectedOffset + entries[i]!.pngBytes.byteLength);
      expect(data).toEqual(entries[i]!.pngBytes);

      expectedOffset += entries[i]!.pngBytes.byteLength;
    }

    expect(ico.length).toBe(expectedOffset);
  });
});
