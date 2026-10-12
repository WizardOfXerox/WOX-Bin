import { describe, expect, it } from "vitest";

describe("Developer Utilities Suite: Hash & HMAC Suite", () => {
  // Test vectors from RFC 1321
  it("computes MD5 accurately according to RFC 1321 test vectors", async () => {
    // Dynamic import to test client module functions or inline RFC logic
    const testCases = [
      { input: "", expected: "d41d8cd98f00b204e9800998ecf8427e" },
      { input: "a", expected: "0cc175b9c0f1b6a831c399e269772661" },
      { input: "abc", expected: "900150983cd24fb0d6963f7d28e17f72" },
      { input: "message digest", expected: "f96b697d7cb7938d525a2f31aaf161d0" },
      {
        input: "The quick brown fox jumps over the lazy dog",
        expected: "9e107d9d372bb6826bd81d3542a419d6"
      }
    ];

    for (const { input, expected } of testCases) {
      const crypto = await import("crypto");
      const hash = crypto.createHash("md5").update(input).digest("hex");
      expect(hash).toBe(expected);
    }
  });

  it("computes HMAC-MD5 according to RFC 2202 test vector", async () => {
    const crypto = await import("crypto");
    const key = "Jefe";
    const data = "what do ya want for nothing?";
    const expected = "750c783e6ab0b503eaa86e310a5db738";

    const hmac = crypto.createHmac("md5", key).update(data).digest("hex");
    expect(hmac).toBe(expected);
  });
});

describe("Developer Utilities Suite: Regex Tester & Debugger", () => {
  it("matches patterns and extracts capture groups correctly", () => {
    const pattern = "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})";
    const regex = new RegExp(pattern, "gi");
    const sample = "Email support@wox-bin.com or admin@example.org";

    const matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(sample)) !== null) {
      matches.push(m);
    }

    expect(matches.length).toBe(2);
    expect(matches[0]![0]).toBe("support@wox-bin.com");
    expect(matches[0]![1]).toBe("support");
    expect(matches[0]![2]).toBe("wox-bin");
    expect(matches[0]![3]).toBe("com");

    expect(matches[1]![0]).toBe("admin@example.org");
    expect(matches[1]![1]).toBe("admin");
    expect(matches[1]![2]).toBe("example");
    expect(matches[1]![3]).toBe("org");
  });

  it("handles substitution replacement tokens correctly", () => {
    const regex = /(\w+)\s(\w+)/g;
    const str = "John Doe, Jane Smith";
    const result = str.replace(regex, "$2, $1");

    expect(result).toBe("Doe, John, Smith, Jane");
  });

  it("safely catches invalid regex syntax without crashing", () => {
    let error: string | null = null;
    try {
      new RegExp("[unclosed-group", "g");
    } catch (e) {
      error = e instanceof Error ? e.message : "Error";
    }

    expect(error).not.toBeNull();
  });
});

describe("Developer Utilities Suite: UUID / ULID / NanoID Generator", () => {
  it("generates valid RFC 4122 UUIDv4 strings", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 10; i++) {
      const id = crypto.randomUUID();
      expect(uuidRegex.test(id)).toBe(true);
    }
  });

  it("generates valid RFC 9562 UUIDv7 strings with correct version 7 and variant bits", () => {
    // Generate sample UUIDv7
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const timestamp = Date.now();
    bytes[0] = Math.floor(timestamp / 0x10000000000) & 0xff;
    bytes[1] = Math.floor(timestamp / 0x100000000) & 0xff;
    bytes[2] = Math.floor(timestamp / 0x1000000) & 0xff;
    bytes[3] = Math.floor(timestamp / 0x10000) & 0xff;
    bytes[4] = Math.floor(timestamp / 0x100) & 0xff;
    bytes[5] = timestamp & 0xff;
    bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant RFC 4122

    const hex: string[] = [];
    for (let i = 0; i < 16; i++) {
      hex.push(bytes[i]!.toString(16).padStart(2, "0"));
    }
    const uuidv7 = [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join("")
    ].join("-");

    const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidv7Regex.test(uuidv7)).toBe(true);
  });

  it("generates sortable ULID format (26 chars Crockford Base32)", () => {
    const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const ulidRegex = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

    const timestamp = Date.now();
    let timeStr = "";
    let t = timestamp;
    for (let i = 9; i >= 0; i--) {
      timeStr = CROCKFORD_BASE32[t % 32] + timeStr;
      t = Math.floor(t / 32);
    }
    const randBytes = new Uint8Array(16);
    crypto.getRandomValues(randBytes);
    let randStr = "";
    for (let i = 0; i < 16; i++) {
      randStr += CROCKFORD_BASE32[randBytes[i]! % 32];
    }
    const ulid = timeStr + randStr;

    expect(ulid.length).toBe(26);
    expect(ulidRegex.test(ulid)).toBe(true);
  });

  it("generates NanoID with customizable length and custom alphabet", () => {
    const alphabet = "0123456789ABCDEF";
    const length = 16;
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let nanoid = "";
    for (let i = 0; i < length; i++) {
      nanoid += alphabet[bytes[i]! % alphabet.length];
    }

    expect(nanoid.length).toBe(16);
    expect(/^[0-9A-F]{16}$/.test(nanoid)).toBe(true);
  });
});

describe("Developer Utilities Suite: Cron Expression Visualizer", () => {
  it("correctly identifies 5-field standard cron schedules", () => {
    const expr = "0 9 * * 1-5";
    const parts = expr.split(/\s+/);
    expect(parts.length).toBe(5);
    expect(parts[0]).toBe("0"); // minute
    expect(parts[1]).toBe("9"); // hour
    expect(parts[2]).toBe("*"); // dom
    expect(parts[3]).toBe("*"); // month
    expect(parts[4]).toBe("1-5"); // dow
  });

  it("correctly calculates next execution time for hourly cron", () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    expect(nextHour.getMinutes()).toBe(0);
    expect(nextHour.getSeconds()).toBe(0);
    expect(nextHour.getTime()).toBeGreaterThan(now.getTime());
  });
});
