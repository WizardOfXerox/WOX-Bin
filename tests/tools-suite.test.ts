import { describe, expect, it } from "vitest";
import DiffMatchPatch from "diff-match-patch";
import QRCode from "qrcode";

import { parseJwt, base64UrlDecode } from "@/components/tools/jwt-tool-client";
import { TOOLS_PAGE_COPY } from "@/lib/tools-page-copy";

describe("Tools Suite: i18n & Catalog Alignment", () => {
  const languages = ["en", "fil", "ja", "es"] as const;

  const expectedFeaturedTools = [
    "/tools/pdf-extract",
    "/tools/convert",
    "/tools/image-convert",
    "/tools/data-lab",
    "/tools/privacy",
    "/tools/scrub",
    "/tools/noref",
    "/tools/poll",
    "/tools/zip-lab",
    "/tools/markdown-html",
    "/tools/pdf-merge",
    "/tools/pdf-split",
    "/tools/text-convert",
    "/tools/diff",
    "/tools/jwt",
    "/tools/qr",
    "/tools/chat",
    "/tools/snapshot",
    "/tools/proof",
    "/tools/shorten"
  ];

  it("ensures every featured tool has complete localized copy across all 4 languages", () => {
    for (const lang of languages) {
      const copy = TOOLS_PAGE_COPY[lang];
      expect(copy, `Missing copy for language ${lang}`).toBeDefined();
      expect(copy.allTools).toBeTruthy();
      expect(copy.pdfSuite).toBeTruthy();
      expect(copy.converters).toBeTruthy();
      expect(copy.dataDev).toBeTruthy();
      expect(copy.privacy).toBeTruthy();

      for (const toolHref of expectedFeaturedTools) {
        const item = copy.featured[toolHref];
        expect(item, `Missing copy for ${toolHref} in language ${lang}`).toBeDefined();
        expect(item.title.trim().length, `Empty title for ${toolHref} in ${lang}`).toBeGreaterThan(0);
        expect(item.description.trim().length, `Empty description for ${toolHref} in ${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it("verifies all tool paths start with /tools/", () => {
    for (const href of expectedFeaturedTools) {
      expect(href.startsWith("/tools/")).toBe(true);
    }
  });
});

describe("Tools Suite: JWT Inspector Engine", () => {
  const samplePayload = {
    sub: "usr_99812",
    name: "Tadami Dev 🚀",
    role: "admin",
    iat: 1700000000,
    exp: 2000000000,
    iss: "wox-bin.com"
  };

  function createTestJwt(header: object, payload: object, sig = "test-sig") {
    const b64 = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return `${b64(header)}.${b64(payload)}.${sig}`;
  }

  it("decodes valid standard JWT correctly", () => {
    const header = { alg: "HS256", typ: "JWT" };
    const token = createTestJwt(header, samplePayload);

    const parsed = parseJwt(token);
    expect(parsed.error).toBeNull();
    expect(parsed.header).toEqual(header);
    expect(parsed.payload).toEqual(samplePayload);
    expect(parsed.signature).toBe("test-sig");
  });

  it("correctly decodes UTF-8 unicode and emoji in JWT payload", () => {
    const unicodePayload = {
      greeting: "Kumusta Mundo! 🇵🇭 こんにちは世界 🇯🇵",
      symbol: "⚡🛡️"
    };
    const token = createTestJwt({ alg: "HS256" }, unicodePayload);
    const parsed = parseJwt(token);

    expect(parsed.error).toBeNull();
    expect(parsed.payload).toEqual(unicodePayload);
  });

  it("handles empty or blank input gracefully", () => {
    const parsed = parseJwt("   ");
    expect(parsed.header).toBeNull();
    expect(parsed.payload).toBeNull();
    expect(parsed.error).toBeNull();
  });

  it("detects invalid token structure (less than 2 parts or more than 3)", () => {
    const tooFew = parseJwt("onlyonepart");
    expect(tooFew.error).toContain("Invalid JWT format");

    const tooMany = parseJwt("part1.part2.part3.part4");
    expect(tooMany.error).toContain("Invalid JWT format");
  });

  it("detects invalid JSON in header", () => {
    const badHeader = "bm90LWpzb24." + Buffer.from(JSON.stringify({ a: 1 })).toString("base64url") + ".sig";
    const parsed = parseJwt(badHeader);
    expect(parsed.error).toContain("Failed to decode or parse JWT Header");
  });

  it("detects invalid JSON in payload", () => {
    const badPayload = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url") + ".bm90LWpzb24.sig";
    const parsed = parseJwt(badPayload);
    expect(parsed.error).toContain("Failed to decode or parse JWT Payload");
  });

  it("base64UrlDecode handles URL-safe characters correctly", () => {
    const raw = "Hello+World/Test=";
    const base64url = Buffer.from(raw).toString("base64url");
    expect(base64UrlDecode(base64url)).toBe(raw);
  });
});

describe("Tools Suite: Diff Checker Engine", () => {
  const dmp = new DiffMatchPatch();

  it("detects identical texts with zero additions or deletions", () => {
    const text = "const port = 3000;\nconsole.log(port);";
    const diffs = dmp.diff_main(text, text);
    dmp.diff_cleanupSemantic(diffs);

    expect(diffs.length).toBe(1);
    expect(diffs[0]![0]).toBe(0); // DIFF_EQUAL
    expect(diffs[0]![1]).toBe(text);
  });

  it("detects text additions and deletions with character precision", () => {
    const oldText = "Hello World";
    const newText = "Hello Beautiful World!";

    const diffs = dmp.diff_main(oldText, newText);
    dmp.diff_cleanupSemantic(diffs);

    const ops = diffs.map(([op]) => op);
    expect(ops).toContain(1); // Contains insertion

    const patches = dmp.patch_make(oldText, newText);
    const patchText = dmp.patch_toText(patches);

    expect(patchText).toContain("@@");
    expect(patchText).toContain("+Beautiful ");
    expect(patchText).toContain("+!");
  });

  it("produces valid unified patch that can be applied to recreate modified text", () => {
    const textA = "Line 1: Alpha\nLine 2: Beta\nLine 3: Gamma";
    const textB = "Line 1: Alpha\nLine 2: Beta Modified\nLine 3: Gamma\nLine 4: Delta";

    const patches = dmp.patch_make(textA, textB);
    const [resultText, applied] = dmp.patch_apply(patches, textA);

    expect(resultText).toBe(textB);
    expect(applied.every(Boolean)).toBe(true);
  });
});

describe("Tools Suite: QR Code Studio Engine", () => {
  it("generates valid SVG markup for URLs", async () => {
    const svg = await QRCode.toString("https://wox-bin.vercel.app", {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("viewBox=");
  });

  it("generates valid base64 PNG data URL", async () => {
    const dataUrl = await QRCode.toDataURL("WOX-BIN-TEST", {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 256
    });

    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it("supports all 4 error correction levels (L, M, Q, H)", async () => {
    const levels = ["L", "M", "Q", "H"] as const;
    for (const ec of levels) {
      const svg = await QRCode.toString("Test Payload", {
        type: "svg",
        errorCorrectionLevel: ec
      });
      expect(svg).toContain("<svg");
    }
  });

  it("respects custom colors and margins", async () => {
    const svg = await QRCode.toString("Colored QR", {
      type: "svg",
      margin: 4,
      color: {
        dark: "#ff0055",
        light: "#ffffff"
      }
    });

    expect(svg.toLowerCase()).toContain("#ff0055");
  });
});
