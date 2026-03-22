import { describe, expect, it } from "vitest";

import { parseConversionPath } from "@/lib/convert/parse-path";
import { isClientRasterPair } from "@/lib/convert/image-formats";
import {
  isImplementedInBrowser,
  isImplementedInWoxBin,
  resolveConversionPair
} from "@/lib/convert/resolver";

describe("parseConversionPath", () => {
  it("parses dashed pair", () => {
    expect(parseConversionPath("jpeg-png")).toEqual({
      from: "jpeg",
      to: "png",
      canonical: "jpeg-png"
    });
  });

  it("normalizes jpg alias", () => {
    expect(parseConversionPath("jpg-webp")).toEqual({
      from: "jpeg",
      to: "webp",
      canonical: "jpg-webp"
    });
  });

  it("parses convert-x-to-y", () => {
    expect(parseConversionPath("convert-pdf-to-jpg")).toEqual({
      from: "pdf",
      to: "jpeg",
      canonical: "convert-pdf-to-jpg"
    });
  });
});

describe("resolveConversionPair", () => {
  it("resolves raster image pairs to client-image-raster", () => {
    const r = resolveConversionPair("png-webp");
    expect(r?.implementation).toBe("client-image-raster");
    expect(r?.appHref).toBe("/tools/c/png-webp");
    expect(isImplementedInWoxBin(r!)).toBe(true);
    expect(isImplementedInBrowser(r!)).toBe(true);
  });

  it("resolves tiff to webp via server sharp", () => {
    const r = resolveConversionPair("tiff-webp");
    expect(r?.implementation).toBe("server-image-sharp");
    expect(isImplementedInWoxBin(r!)).toBe(true);
    expect(isImplementedInBrowser(r!)).toBe(false);
  });

  it("resolves pdf to png via pdf-extract", () => {
    const r = resolveConversionPair("pdf-png");
    expect(r?.implementation).toBe("client-pdf-extract");
    expect(r?.appHref).toContain("/tools/pdf-extract");
    expect(r?.appHref).toContain("export=png-zip");
  });

  it("resolves mp4-webm to FFmpeg worker route", () => {
    const r = resolveConversionPair("mp4-webm");
    expect(r?.implementation).toBe("worker-ffmpeg");
    expect(r?.appHref).toBe("/tools/c/mp4-webm");
    expect(isImplementedInWoxBin(r!)).toBe(true);
  });

  it("resolves csv-json", () => {
    const r = resolveConversionPair("csv-json");
    expect(r?.implementation).toBe("client-data-lab");
    expect(isImplementedInBrowser(r!)).toBe(true);
  });

  it("resolves markdown-html", () => {
    const r = resolveConversionPair("markdown-html");
    expect(r?.implementation).toBe("client-markdown-html");
    expect(isImplementedInWoxBin(r!)).toBe(true);
  });

  it("resolves txt-html", () => {
    const r = resolveConversionPair("txt-html");
    expect(r?.implementation).toBe("client-text-html");
    expect(isImplementedInWoxBin(r!)).toBe(true);
  });
});

describe("isClientRasterPair", () => {
  it("allows png to jpeg", () => {
    expect(isClientRasterPair("png", "jpeg")).toBe(true);
  });

  it("disallows mp4 as raster source", () => {
    expect(isClientRasterPair("mp4", "png")).toBe(false);
  });
});
