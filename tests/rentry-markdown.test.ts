import { describe, expect, it } from "vitest";

import { parseUserMarkdown } from "@/lib/markdown/parse-user-markdown";
import { preprocessRentryMarkdown } from "@/lib/markdown/rentry-preprocess";

describe("preprocessRentryMarkdown", () => {
  it("leaves fenced code unchanged", () => {
    const md = "```\n==x==\n```\n\n==y==";
    const out = preprocessRentryMarkdown(md);
    expect(out).toContain("==x==");
    expect(out).toContain("<mark>y</mark>");
  });

  it("replaces [TOC] with nav", () => {
    const md = "# A\n\n[TOC]\n\n## B\n";
    const out = preprocessRentryMarkdown(md);
    expect(out).toContain("wox-md-toc");
    expect(out).toContain('href="#a"');
    expect(out).toContain('href="#b"');
  });
});

describe("parseUserMarkdown", () => {
  it("produces highlight and ids for headings", () => {
    const html = parseUserMarkdown("# Hi\n\n==there==", { breaks: true });
    expect(html).toContain('id="hi"');
    expect(html).toContain("<mark>there</mark>");
  });

  it("sanitizes script in image src", () => {
    const html = parseUserMarkdown(`![](javascript:alert(1))`, { breaks: true });
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("highlights fenced code with Prism spans in markdown preview pipeline", () => {
    const html = parseUserMarkdown("```javascript\nconst x = 1;\n```", { breaks: true });
    expect(html).toContain("language-javascript");
    expect(html).toContain('class="token');
  });
});
