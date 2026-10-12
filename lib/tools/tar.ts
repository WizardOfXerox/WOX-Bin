import { gunzipSync, zipSync } from "fflate";

export type TarEntryType = "file" | "directory" | "symlink" | "other";

export type TarEntry = {
  name: string;
  size: number;
  mtime: Date;
  mode: number;
  type: TarEntryType;
  typeFlag: string;
  data: Uint8Array;
};

export type TarArchiveInfo = {
  isCompressed: boolean;
  compressedSize: number;
  uncompressedSize: number;
  entries: TarEntry[];
};

/**
 * Checks if raw bytes begin with the standard gzip header magic bytes (0x1f 0x8b).
 */
export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/**
 * Parses an octal or binary-encoded number from a TAR header field.
 */
function parseTarOctal(bytes: Uint8Array, start: number, length: number): number {
  if (start + length > bytes.length) return 0;

  // Support GNU Tar binary format for large numbers (highest bit set)
  if ((bytes[start]! & 0x80) !== 0) {
    let val = 0;
    for (let i = start + 1; i < start + length; i++) {
      val = val * 256 + (bytes[i] || 0);
    }
    return val;
  }

  let str = "";
  for (let i = start; i < start + length; i++) {
    const b = bytes[i];
    if (b === 0 || b === 32) {
      if (str.length > 0) break;
      continue;
    }
    // Only octal digits '0'..'7'
    if (b >= 48 && b <= 55) {
      str += String.fromCharCode(b);
    } else {
      break;
    }
  }

  return str.length > 0 ? parseInt(str, 8) : 0;
}

/**
 * Reads a null-terminated UTF-8 / ASCII string from a byte slice.
 */
function parseTarString(bytes: Uint8Array, start: number, length: number): string {
  if (start >= bytes.length) return "";
  const endLimit = Math.min(start + length, bytes.length);
  let end = start;
  while (end < endLimit && bytes[end] !== 0) {
    end++;
  }
  if (end === start) return "";
  try {
    return new TextDecoder("utf-8").decode(bytes.subarray(start, end)).trim();
  } catch {
    return "";
  }
}

/**
 * Parses a PAX extended header block for attributes like `path` and `size`.
 */
function parsePaxAttributes(data: Uint8Array): Record<string, string> {
  const result: Record<string, string> = {};
  const text = new TextDecoder("utf-8").decode(data);
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line) continue;
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) continue;
    const rest = line.slice(spaceIdx + 1);
    const eqIdx = rest.indexOf("=");
    if (eqIdx === -1) continue;
    const key = rest.slice(0, eqIdx);
    const val = rest.slice(eqIdx + 1);
    result[key] = val;
  }

  return result;
}

/**
 * Parses a TAR or compressed (.tar.gz / .tgz) archive into entry records.
 */
export function parseTarArchive(rawBytes: Uint8Array): TarArchiveInfo {
  const compressed = isGzip(rawBytes);
  const compressedSize = rawBytes.byteLength;

  let bytes: Uint8Array;
  if (compressed) {
    try {
      bytes = gunzipSync(rawBytes);
    } catch (err) {
      throw new Error(
        `Failed to decompress gzip archive: ${err instanceof Error ? err.message : "corrupted gzip stream"}`
      );
    }
  } else {
    bytes = rawBytes;
  }

  const uncompressedSize = bytes.byteLength;
  const entries: TarEntry[] = [];
  const totalLen = bytes.byteLength;
  let offset = 0;

  let nextOverrideName: string | null = null;
  let nextOverrideSize: number | null = null;

  while (offset + 512 <= totalLen) {
    const header = bytes.subarray(offset, offset + 512);

    // Check for end-of-archive marker (512-byte zero block)
    let isAllZero = true;
    for (let i = 0; i < 512; i++) {
      if (header[i] !== 0) {
        isAllZero = false;
        break;
      }
    }
    if (isAllZero) {
      break;
    }

    // Name (0..100)
    let name = parseTarString(header, 0, 100);
    const mode = parseTarOctal(header, 100, 8);
    let size = parseTarOctal(header, 124, 12);
    const mtimeSec = parseTarOctal(header, 136, 12);
    const mtime = new Date(mtimeSec * 1000);
    const typeFlagChar = String.fromCharCode(header[156] || 0);

    // USTAR prefix (345..500)
    const magic = parseTarString(header, 257, 6);
    if (magic.startsWith("ustar")) {
      const prefix = parseTarString(header, 345, 155);
      if (prefix && !name.startsWith(prefix)) {
        name = `${prefix}/${name}`;
      }
    }

    // Apply PAX or GNU LongLink overrides
    if (nextOverrideName) {
      name = nextOverrideName;
      nextOverrideName = null;
    }
    if (nextOverrideSize !== null) {
      size = nextOverrideSize;
      nextOverrideSize = null;
    }

    const dataOffset = offset + 512;
    const paddedSize = Math.ceil(size / 512) * 512;

    if (dataOffset + size > totalLen) {
      throw new Error(
        `Malformed TAR archive: entry "${name}" specifies size ${size} bytes exceeding archive bounds.`
      );
    }

    const fileData = bytes.subarray(dataOffset, dataOffset + size);

    // GNU LongName
    if (typeFlagChar === "L") {
      nextOverrideName = new TextDecoder("utf-8").decode(fileData).replace(/\0+$/, "").trim();
    }
    // PAX Extended Header
    else if (typeFlagChar === "x" || typeFlagChar === "g") {
      const pax = parsePaxAttributes(fileData);
      if (pax["path"]) {
        nextOverrideName = pax["path"];
      }
      if (pax["size"]) {
        const parsedSize = parseInt(pax["size"], 10);
        if (!isNaN(parsedSize) && parsedSize >= 0) {
          nextOverrideSize = parsedSize;
        }
      }
    } else {
      let type: TarEntryType = "other";
      if (typeFlagChar === "0" || typeFlagChar === "\0" || typeFlagChar === "") {
        type = "file";
      } else if (typeFlagChar === "5" || name.endsWith("/")) {
        type = "directory";
      } else if (typeFlagChar === "1" || typeFlagChar === "2") {
        type = "symlink";
      }

      // Normalize name
      const cleanName = name.replace(/^\.\//, "").replace(/^\//, "");
      if (cleanName && cleanName !== ".") {
        entries.push({
          name: cleanName,
          size: type === "directory" ? 0 : size,
          mtime,
          mode,
          type,
          typeFlag: typeFlagChar,
          data: type === "directory" ? new Uint8Array(0) : fileData
        });
      }
    }

    offset = dataOffset + paddedSize;
  }

  return {
    isCompressed: compressed,
    compressedSize,
    uncompressedSize,
    entries
  };
}

/**
 * Creates a ZIP archive containing all file entries from the TAR archive.
 */
export function createZipFromTarEntries(entries: TarEntry[]): Uint8Array {
  const record: Record<string, Uint8Array> = {};

  for (const entry of entries) {
    if (entry.type !== "directory") {
      record[entry.name] = entry.data;
    }
  }

  return zipSync(record, { level: 6 });
}
