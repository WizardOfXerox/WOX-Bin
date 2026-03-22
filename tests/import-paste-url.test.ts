import { describe, expect, it } from "vitest";

import { extractGithubGistId, normalizeRawPasteFetchUrl } from "@/lib/import-paste-url";

describe("normalizeRawPasteFetchUrl", () => {
  it("rewrites pastebin paste pages to /raw/", () => {
    expect(normalizeRawPasteFetchUrl("https://pastebin.com/AbCdEf12")).toBe(
      "https://pastebin.com/raw/AbCdEf12"
    );
    expect(normalizeRawPasteFetchUrl("https://www.pastebin.com/AbCdEf12/")).toBe(
      "https://www.pastebin.com/raw/AbCdEf12"
    );
  });

  it("leaves pastebin raw URLs unchanged", () => {
    expect(normalizeRawPasteFetchUrl("https://pastebin.com/raw/AbCdEf12")).toBe(
      "https://pastebin.com/raw/AbCdEf12"
    );
  });

  it("does not rewrite pastebin non-paste paths", () => {
    expect(normalizeRawPasteFetchUrl("https://pastebin.com/tools")).toBe("https://pastebin.com/tools");
  });

  it("rewrites hastebin keys to /raw/", () => {
    expect(normalizeRawPasteFetchUrl("https://hastebin.com/abcdefgh")).toBe(
      "https://hastebin.com/raw/abcdefgh"
    );
  });

  it("rewrites dpaste to .txt", () => {
    expect(normalizeRawPasteFetchUrl("https://dpaste.com/H4RQJVA2P")).toBe(
      "https://dpaste.com/H4RQJVA2P.txt"
    );
  });

  it("rewrites rentry to /raw/", () => {
    expect(normalizeRawPasteFetchUrl("https://rentry.co/myslug")).toBe("https://rentry.co/raw/myslug");
  });

  it("rewrites paste.ee /p/ to /r/", () => {
    expect(normalizeRawPasteFetchUrl("https://paste.ee/p/abc123")).toBe("https://paste.ee/r/abc123");
  });

  it("rewrites paste.mozilla.org to /plain/", () => {
    expect(normalizeRawPasteFetchUrl("https://paste.mozilla.org/abc123")).toBe(
      "https://paste.mozilla.org/plain/abc123"
    );
  });

  it("rewrites sourceb.in to /raw/", () => {
    expect(normalizeRawPasteFetchUrl("https://sourceb.in/abcd1234")).toBe(
      "https://sourceb.in/raw/abcd1234"
    );
  });
});

describe("extractGithubGistId", () => {
  it("extracts id from gist page URL", () => {
    expect(extractGithubGistId("https://gist.github.com/octocat/6cad326836d38bd3a7ab")).toBe(
      "6cad326836d38bd3a7ab"
    );
  });

  it("returns null for non-gist URLs", () => {
    expect(extractGithubGistId("https://pastebin.com/raw/AbCdEf12")).toBeNull();
  });
});
