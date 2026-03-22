import { describe, expect, it } from "vitest";

import {
  dataUrlFromPasteFile,
  isAllowedPasteMediaMime,
  mediaKindFromMime,
  parseDataUrl
} from "@/lib/paste-file-media";

describe("parseDataUrl", () => {
  it("parses base64 data URLs", () => {
    const p = parseDataUrl("data:image/png;base64,QUJD");
    expect(p?.mimeType).toBe("image/png");
    expect(p?.base64).toBe("QUJD");
  });
});

describe("isAllowedPasteMediaMime", () => {
  it("allows png and mp4", () => {
    expect(isAllowedPasteMediaMime("image/png")).toBe(true);
    expect(isAllowedPasteMediaMime("video/mp4")).toBe(true);
  });
  it("rejects svg", () => {
    expect(isAllowedPasteMediaMime("image/svg+xml")).toBe(false);
  });
});

describe("mediaKindFromMime", () => {
  it("classifies types", () => {
    expect(mediaKindFromMime("image/jpeg")).toBe("image");
    expect(mediaKindFromMime("video/webm")).toBe("video");
    expect(mediaKindFromMime("text/plain")).toBe(null);
  });
});

describe("dataUrlFromPasteFile", () => {
  it("builds a data URL from stored fields", () => {
    const u = dataUrlFromPasteFile({
      mediaKind: "image",
      mimeType: "image/png",
      content: "QUJD"
    });
    expect(u).toBe("data:image/png;base64,QUJD");
  });
});
