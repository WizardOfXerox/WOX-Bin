import { describe, expect, it } from "vitest";
import { gzipSync } from "fflate";
import { parseTarArchive, createZipFromTarEntries, isGzip } from "@/lib/tools/tar";

function createTarHeader(opts: {
  name: string;
  size: number;
  typeFlag?: string;
  prefix?: string;
  mtimeSec?: number;
}): Uint8Array {
  const header = new Uint8Array(512);

  // name (0..100)
  const nameBytes = new TextEncoder().encode(opts.name);
  header.set(nameBytes.subarray(0, 100), 0);

  // mode (100..108)
  const modeStr = "0000644\0";
  header.set(new TextEncoder().encode(modeStr), 100);

  // size (124..136)
  const sizeOctal = opts.size.toString(8).padStart(11, "0") + " ";
  header.set(new TextEncoder().encode(sizeOctal), 124);

  // mtime (136..148)
  const mtime = opts.mtimeSec ?? 1700000000;
  const mtimeOctal = mtime.toString(8).padStart(11, "0") + " ";
  header.set(new TextEncoder().encode(mtimeOctal), 136);

  // chksum dummy placeholder
  header.set(new TextEncoder().encode("000000\0 "), 148);

  // typeflag (156)
  header[156] = (opts.typeFlag || "0").charCodeAt(0);

  // magic (257..263)
  header.set(new TextEncoder().encode("ustar\0"), 257);
  // version (263..265)
  header.set(new TextEncoder().encode("00"), 263);

  // prefix (345..500)
  if (opts.prefix) {
    const prefixBytes = new TextEncoder().encode(opts.prefix);
    header.set(prefixBytes.subarray(0, 155), 345);
  }

  return header;
}

function buildTarFile(entries: Array<{ header: Uint8Array; data?: Uint8Array }>): Uint8Array {
  const chunks: Uint8Array[] = [];
  for (const entry of entries) {
    chunks.push(entry.header);
    if (entry.data && entry.data.byteLength > 0) {
      chunks.push(entry.data);
      const remainder = entry.data.byteLength % 512;
      if (remainder !== 0) {
        chunks.push(new Uint8Array(512 - remainder));
      }
    }
  }
  // 1024 bytes of zeros for end of archive
  chunks.push(new Uint8Array(1024));

  const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.byteLength;
  }
  return out;
}

describe("TAR & Compressed TAR Archive Engine", () => {
  it("detects gzip magic bytes correctly", () => {
    const plain = new Uint8Array([0x00, 0x11, 0x22]);
    const gz = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

    expect(isGzip(plain)).toBe(false);
    expect(isGzip(gz)).toBe(true);
  });

  it("parses uncompressed standard USTAR archive", () => {
    const file1Data = new TextEncoder().encode("Hello WOX-Bin world!");
    const header1 = createTarHeader({ name: "notes.txt", size: file1Data.byteLength });

    const dirHeader = createTarHeader({ name: "docs/", size: 0, typeFlag: "5" });

    const file2Data = new TextEncoder().encode("console.log('hi');");
    const header2 = createTarHeader({ name: "index.js", size: file2Data.byteLength, prefix: "docs" });

    const tarBytes = buildTarFile([
      { header: header1, data: file1Data },
      { header: dirHeader },
      { header: header2, data: file2Data }
    ]);

    const result = parseTarArchive(tarBytes);

    expect(result.isCompressed).toBe(false);
    expect(result.entries.length).toBe(3);

    expect(result.entries[0]!.name).toBe("notes.txt");
    expect(result.entries[0]!.type).toBe("file");
    expect(result.entries[0]!.size).toBe(file1Data.byteLength);
    expect(new TextDecoder().decode(result.entries[0]!.data)).toBe("Hello WOX-Bin world!");

    expect(result.entries[1]!.name).toBe("docs/");
    expect(result.entries[1]!.type).toBe("directory");

    expect(result.entries[2]!.name).toBe("docs/index.js");
    expect(result.entries[2]!.type).toBe("file");
    expect(new TextDecoder().decode(result.entries[2]!.data)).toBe("console.log('hi');");
  });

  it("parses gzip-compressed tar.gz archives seamlessly", () => {
    const data = new TextEncoder().encode("Gzipped content inside tar");
    const header = createTarHeader({ name: "payload.json", size: data.byteLength });
    const tarBytes = buildTarFile([{ header, data }]);

    const compressedTar = gzipSync(tarBytes);

    expect(isGzip(compressedTar)).toBe(true);

    const result = parseTarArchive(compressedTar);
    expect(result.isCompressed).toBe(true);
    expect(result.compressedSize).toBe(compressedTar.byteLength);
    expect(result.uncompressedSize).toBe(tarBytes.byteLength);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.name).toBe("payload.json");
    expect(new TextDecoder().decode(result.entries[0]!.data)).toBe("Gzipped content inside tar");
  });

  it("supports GNU long filename ('L' typeflag)", () => {
    const longName = "very/deeply/nested/path/to/some/really/long/filename/that/exceeds/the/ustar/limit.txt";
    const longNameData = new TextEncoder().encode(longName + "\0");

    const longNameHeader = createTarHeader({
      name: "././@LongLink",
      size: longNameData.byteLength,
      typeFlag: "L"
    });

    const fileData = new TextEncoder().encode("File contents with long name");
    const actualHeader = createTarHeader({
      name: "shortname.txt",
      size: fileData.byteLength
    });

    const tarBytes = buildTarFile([
      { header: longNameHeader, data: longNameData },
      { header: actualHeader, data: fileData }
    ]);

    const result = parseTarArchive(tarBytes);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0]!.name).toBe(longName);
    expect(result.entries[0]!.size).toBe(fileData.byteLength);
  });

  it("converts tar entries into a valid zip archive using createZipFromTarEntries", () => {
    const data = new TextEncoder().encode("Zipped file text");
    const header = createTarHeader({ name: "test.txt", size: data.byteLength });
    const tarBytes = buildTarFile([{ header, data }]);

    const parsed = parseTarArchive(tarBytes);
    const zipBytes = createZipFromTarEntries(parsed.entries);

    expect(zipBytes.byteLength).toBeGreaterThan(0);
    // Standard ZIP magic bytes: PK\x03\x04
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });

  it("throws clear error on truncated or corrupt archives", () => {
    const header = createTarHeader({ name: "corrupted.txt", size: 5000 });
    // Archive has header specifying 5000 bytes, but no data blocks follow
    const truncated = new Uint8Array(512);
    truncated.set(header);

    expect(() => parseTarArchive(truncated)).toThrow("specifies size 5000 bytes exceeding archive bounds");
  });
});
