/**
 * Regenerates ../example-big-paste.json — one importable workspace paste with
 * markdown kitchen sink, lorem ipsum, Prism samples for every LANGUAGES id, and 5 attachments.
 * Run: node scripts/generate-example-big-paste.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "example-big-paste.json");

const LOREM_CLASSIC = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi.

Fusce convallis metus id felis luctus adipiscing. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.`;

const LOREM_MORE = `Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.`;

/** Extra paragraphs for scroll / layout stress (still lorem-style). */
const LOREM_SCROLL_DECK = `
Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut eros et nisl sagittis vestibulum. Nullam nulla eros, ultricies sit amet, nonummy id, imperdiet feugiat, pede. Sed lectus. Donec mollis hendrerit risus. Phasellus nec sem in justo pellentesque facilisis. Etiam imperdiet imperdiet orci.

Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue.

Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt.

Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante.

Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed aliquam, nisi quis porttitor congue, elit erat euismod orci, ac placerat dolor lectus quis orci. Phasellus consectetuer vestibulum elit. Aenean tellus metus, bibendum sed, posuere ac, mattis non, nunc. Vestibulum fringilla pede sit amet augue.

Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus.

Fusce fermentum odio nec arcu. Donec posuere vulputate arcu. Phasellus accumsan cursus velit. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Sed aliquam, nisi quis porttitor congue, elit erat euismod orci, ac placerat dolor lectus quis orci.

In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim.

Aliquam erat volutpat. Nam dui ligula, fringilla a, euismod sodales, sollicitudin vel, wisi. Morbi auctor, lorem non molestie vehicula, dolor lectus tempus sapien, quis porta ligula felis eu felis. Cras non velit nec nisi vulputate nonummy. Mauris nibh felis, adipiscing varius, adipiscing in, lacinia vel, tellus.

Suspendisse mauris. Fusce accumsan mollis eros. Pellentesque a diam sit amet mi ullamcorper vehicula. Integer adipiscing risus a sem. Nullam quis massa sit amet nibh viverra malesuada. Nunc sem lacus, accumsan quis, faucibus non, congue vel, arcu. Ut scelerisque hendrerit tellus. Integer sagittis. Vivamus a mauris vel quam semper commodo.

Proin pharetra nonummy pede. Mauris et orci. Aenean posuere, tortor sed cursus feugiat, nunc augue blandit nunc, eu sollicitudin urna dolor sagittis lacus. Donec elit libero, sodales nec, volutpat a, suscipit non, turpis. Nullam sagittis. Suspendisse pulvinar, augue ac venenatis condimentum, sem libero volutpat nibh, nec pellentesque velit pede quis nunc.

Morbi interdum mollis sapien. Sed ac risus. Phasellus lacinia, magna a ullamcorper laoreet, lectus arcu pulvinar risus, vitae facilisis libero dolor a purus. Sed vel lacus. Mauris nibh felis, adipiscing varius, adipiscing in, lacinia vel, tellus. Suspendisse ac urna. Etiam pellentesque mauris ut lectus.

Nunc egestas, augue at pellentesque laoreet, felis eros vehicula leo, at malesuada velit leo quis pede. Donec interdum, metus et hendrerit aliquet, dolor diam sagittis ligula, eget egestas libero turpis vel mi. Nunc nulla. Fusce risus nisl, viverra et, tempor et, pretium in, sapien. Donec venenatis vulputate lorem.

Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.
`.trim();

function prismBlocks() {
  return [
    ["none", "Plain text / no highlighting\nLine 2: 0123456789 !@#$%\nUnicode: café, 你好, مرحبا"],
    [
      "auto",
      "// Use the \"Auto-detect\" language in the editor toolbar for mixed snippets.\n// Fenced blocks still need an explicit language tag in Markdown.\nconst x = { demo: true };\nconsole.log(JSON.stringify(x, null, 2));"
    ],
    [
      "markup",
      `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>Prism — markup</title>\n  </head>\n  <body>\n    <main>\n      <h1 class="title">Hello</h1>\n      <p id="desc" data-test="ok">Attributes &amp; entities.</p>\n    </main>\n  </body>\n</html>`
    ],
    [
      "css",
      `:root {\n  --accent: #38bdf8;\n  --radius: 12px;\n}\n\n.card {\n  border-radius: var(--radius);\n  background: linear-gradient(135deg, #0f172a, #1e293b);\n  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);\n}\n\n.card:hover {\n  outline: 2px solid var(--accent);\n  transition: outline 0.2s ease;\n}\n\n@media (max-width: 640px) {\n  .card { padding: 1rem; }\n}`
    ],
    [
      "javascript",
      `/** @param {string} name */\nfunction greet(name) {\n  const trimmed = name?.trim() ?? "world";\n  return \`Hello, \${trimmed}!\`;\n}\n\nexport const api = {\n  greet,\n  version: 2,\n  tags: ["paste", "prism", "demo"]\n};\n\nconsole.log(api.greet("WOX-Bin"));`
    ],
    [
      "typescript",
      `type PasteId = string & { readonly __brand: unique symbol };\n\ninterface Viewer {\n  readonly id: string;\n  role: "user" | "admin" | "moderator";\n}\n\nexport function assertNever(x: never): never {\n  throw new Error("Unexpected: " + String(x));\n}\n\nconst slug = "demo-slug" as const;\nexport type Slug = typeof slug;`
    ],
    [
      "json",
      `{\n  "$schema": "https://example.com/woxbin-demo.json",\n  "name": "megademo",\n  "languages": ["markdown", "typescript", "yaml"],\n  "nested": {\n    "ok": true,\n    "count": 42,\n    "ratio": 0.25\n  },\n  "list": [1, 2, 3]\n}`
    ],
    [
      "python",
      `from __future__ import annotations\nfrom dataclasses import dataclass\nfrom typing import Literal\n\nVisibility = Literal["public", "unlisted", "private"]\n\n@dataclass(frozen=True)\nclass Paste:\n    slug: str\n    title: str\n    visibility: Visibility\n\ndef excerpt(body: str, n: int = 160) -> str:\n    one_line = " ".join(body.split())\n    return one_line if len(one_line) <= n else one_line[: n - 1] + "…"`
    ],
    [
      "bash",
      `#!/usr/bin/env bash\nset -euo pipefail\n\nROOT="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"\nexport NODE_ENV=production\n\nif [[ -f "\${ROOT}/.env" ]]; then\n  # shellcheck source=/dev/null\n  source "\${ROOT}/.env"\nfi\n\necho "[demo] Building from \${ROOT}…"\nnpm run build\necho "[demo] Done."`
    ],
    [
      "sql",
      `-- Prism SQL sample\nBEGIN;\n\nCREATE TABLE pastes (\n  id UUID PRIMARY KEY,\n  slug TEXT NOT NULL UNIQUE,\n  title TEXT NOT NULL,\n  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'unlisted', 'private')),\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n);\n\nCREATE INDEX idx_pastes_created ON pastes (created_at DESC);\n\nINSERT INTO pastes (id, slug, title, visibility)\nVALUES (gen_random_uuid(), 'demo', 'Demo paste', 'public')\nON CONFLICT (slug) DO NOTHING;\n\nCOMMIT;`
    ],
    [
      "xml",
      `<?xml version="1.0" encoding="UTF-8"?>\n<!-- WOX-Bin Prism: XML -->\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>Demo</title>\n  <entry>\n    <id>urn:woxbin:demo:1</id>\n    <title type="html">Sample &amp; entities</title>\n    <updated>2025-03-19T12:00:00Z</updated>\n  </entry>\n</feed>`
    ],
    [
      "cpp",
      `#include <cstdint>\n#include <string>\n#include <vector>\n\nnamespace wox::demo {\n\nstruct PasteMeta {\n  std::string slug;\n  std::uint32_t version;\n};\n\ninline std::vector<int> iota_n(int n) {\n  std::vector<int> v(static_cast<size_t>(n));\n  for (int i = 0; i < n; ++i) v[static_cast<size_t>(i)] = i;\n  return v;\n}\n\n} // namespace wox::demo`
    ],
    [
      "csharp",
      `using System;\nusing System.Collections.Generic;\n\nnamespace WoxBin.Demo;\n\npublic sealed record Paste(string Slug, string Title, bool Pinned)\n{\n  public string Excerpt(string body, int max = 120)\n  {\n    var s = body.Replace("\\n", " ", StringComparison.Ordinal).Trim();\n    return s.Length <= max ? s : s[..(max - 1)] + "…";\n  }\n}\n\npublic static class Program\n{\n  public static void Main()\n  {\n    var p = new Paste("demo", "Hello", Pinned: true);\n    Console.WriteLine(p);\n  }\n}`
    ],
    [
      "java",
      `package com.woxbin.demo;\n\nimport java.util.List;\nimport java.util.Objects;\n\npublic final class Paste {\n  private final String slug;\n  private final String title;\n\n  public Paste(String slug, String title) {\n    this.slug = Objects.requireNonNull(slug);\n    this.title = Objects.requireNonNull(title);\n  }\n\n  public String slug() { return slug; }\n\n  public List<String> tags() {\n    return List.of("demo", "java", "prism");\n  }\n}`
    ],
    [
      "php",
      `<?php\ndeclare(strict_types=1);\n\nnamespace WoxBin\\Demo;\n\nfinal class Paste\n{\n    public function __construct(\n        public readonly string $slug,\n        public readonly string $title,\n    ) {\n    }\n\n    /** @param array<string, mixed> $meta */\n    public static function fromArray(array $meta): self\n    {\n        return new self((string) $meta['slug'], (string) $meta['title']);\n    }\n}\n`
    ],
    [
      "powershell",
      `# Prism: PowerShell\nparam(\n  [string]$Name = "WOX-Bin",\n  [int]$Retries = 3\n)\n\n$ErrorActionPreference = "Stop"\n\nfunction Get-DemoPath {\n  return Join-Path $PSScriptRoot ".." "dist"\n}\n\nWrite-Host "Hello, $Name!" -ForegroundColor Cyan\n1..$Retries | ForEach-Object { Write-Verbose "Attempt $_" }`
    ],
    [
      "yaml",
      `# docker-compose style sample\nversion: "3.9"\n\nservices:\n  app:\n    image: node:22-alpine\n    working_dir: /app\n    environment:\n      NODE_ENV: development\n      PORT: 3000\n    ports:\n      - "3000:3000"\n    volumes:\n      - .:/app:cached\n    command: npm run dev\n`
    ],
    [
      "markdown",
      `# Nested Markdown sample\n\n- **bold** and *italic* and ***both***\n- \`inline code\` and a [link](https://example.com)\n\n> Blockquote inside fenced markdown\n\n| A | B |\n|---|---|\n| 1 | 2 |\n`
    ],
    [
      "go",
      `package main\n\nimport (\n  "fmt"\n  "strings"\n)\n\ntype Paste struct {\n  Slug  string\n  Title string\n}\n\nfunc (p Paste) Label() string {\n  return strings.TrimSpace(p.Title)\n}\n\nfunc main() {\n  p := Paste{Slug: "demo", Title: "  Hello  "}\n  fmt.Println(p.Slug, p.Label())\n}`
    ],
    [
      "rust",
      `use std::fmt::{self, Display};\n\n#[derive(Debug, Clone)]\npub struct Paste {\n    pub slug: String,\n    pub title: String,\n}\n\nimpl Display for Paste {\n    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {\n        write!(f, "{} — {}", self.slug, self.title)\n    }\n}\n\nfn main() {\n    let p = Paste { slug: "a".into(), title: "Demo".into() };\n    println!("{p:?}");\n}`
    ],
    [
      "ruby",
      `# frozen_string_literal: true\n\nmodule WoxBin\n  Paste = Data.define(:slug, :title) do\n    def excerpt(body, max = 120)\n      s = body.gsub(/\\s+/, " ").strip\n      s.length <= max ? s : s[0, max - 1] + "…"\n    end\n  end\nend\n\np WoxBin::Paste.new("demo", "Hello")`
    ],
    [
      "swift",
      `import Foundation\n\nstruct Paste: Sendable, Hashable {\n  var slug: String\n  var title: String\n\n  func excerpt(from body: String, max: Int = 120) -> String {\n    let s = body.replacingOccurrences(of: "\\n", with: " ")\n      .trimmingCharacters(in: .whitespacesAndNewlines)\n    if s.count <= max { return s }\n    let idx = s.index(s.startIndex, offsetBy: max - 1)\n    return String(s[..<idx]) + "…"\n  }\n}\n`
    ],
    [
      "kotlin",
      `package com.woxbin.demo\n\ndata class Paste(\n    val slug: String,\n    val title: String,\n    val pinned: Boolean = false,\n) {\n    fun excerpt(body: String, max: Int = 120): String {\n        val s = body.replace("\\n", " ").trim()\n        return if (s.length <= max) s else s.take(max - 1) + "…"\n    }\n}\n\nfun main() {\n    println(Paste("x", "Demo"))\n}`
    ]
  ];
}

function buildMarkdownBody() {
  const blocks = prismBlocks();
  const fences = blocks
    .map(([lang, code]) => {
      return `### \`${lang}\`\n\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    })
    .join("\n");

  return `# WOX-Bin megademo — one paste, full Markdown & Prism tour

Single importable paste: **kitchen-sink Markdown** in this body, **every editor language id** below as fenced samples, **lorem ipsum** for scroll/layout stress, and **five attachments** (free-tier file limit) for extra tabs.

---

## Contents (jump targets)

- [Lorem ipsum](#lorem-ipsum-classic)
- [More placeholder text](#more-lorem-placeholder)
- [Extended lorem](#extended-lorem-scroll-deck)
- [Markdown kitchen sink](#markdown-kitchen-sink)
- [Prism language samples](#prism-language-samples)
- [Closing](#closing)

---

## Lorem ipsum (classic)

${LOREM_CLASSIC}

---

## More lorem (placeholder)

${LOREM_MORE}

---

## Extended lorem (scroll deck)

${LOREM_SCROLL_DECK}

---

## Markdown kitchen sink

### Heading levels

###### H6 — smallest built-in heading

#### H4 and ##### H5 sit between H3 and H6

### Emphasis & inline

- **bold** with double asterisks
- *italic* with single asterisks
- ***bold italic*** combined
- \`inline code\` with backticks
- ~~strikethrough~~ if your renderer supports GFM

### Lists

**Unordered**

- Alpha
  - Nested one
  - Nested two
- Bravo
- Charlie

**Ordered**

1. First
2. Second
   1. Nested step A
   2. Nested step B
3. Third

**Task list (GFM-style)**

- [x] Headings & emphasis
- [x] Lists & tables
- [ ] Your own checkbox here

### Blockquote

> Single-level quote: *Curabitur ligula sapien, tincidunt non, euismod vitae, posuere imperdiet, leo.*
>
> > Nested quote: **Maecenas malesuada elit lectus felis, malesuada ultricies.**

### Table

| Syntax element | Example | Notes |
| --- | --- | --- |
| Inline code | \`const x = 1\` | Monospace |
| Link | [WOX-Bin](/) | Relative OK |
| Image | \`![alt](url)\` | Below |

### Image (placeholder URL)

![Placeholder landscape](https://picsum.photos/seed/woxbin/800/200)

### Horizontal rules

---

***

___

### Link

Open the [pricing](/pricing) page or an [external example](https://example.com) (may be blocked by CSP on some hosts).

---

## Prism language samples

Use the **Syntax highlighting** dropdown on the main editor or each file tab. Fenced blocks here use the same ids (\`none\` … \`kotlin\`).

${fences}

---

## Closing

- Import this file via **Workspace → Import file** (\`example-big-paste.json\`).
- Switch **theme / Prism** in settings to compare token colors.
- Open **attachments** (up to 5 on Free) for HTML, CSS, YAML, Kotlin, and Ruby in separate tabs.

*End of main body.*
`;
}

const attachments = [
  {
    filename: "layout.html",
    language: "markup",
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Megademo — layout.html attachment</title>
  </head>
  <body>
    <a href="#main" class="skip-link">Skip to content</a>
    <header role="banner">
      <h1>Attachment: semantic HTML</h1>
      <p>This file tab uses the <code>markup</code> / HTML highlighter.</p>
    </header>
    <main id="main" role="main">
      <article>
        <h2>Section</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        <ul>
          <li>Item one</li>
          <li>Item two</li>
        </ul>
      </article>
    </main>
    <footer role="contentinfo"><small>WOX-Bin megademo</small></footer>
  </body>
</html>
`
  },
  {
    filename: "tokens.css",
    language: "css",
    content: `/* Attachment: CSS tokens & layout demo */
:root {
  color-scheme: dark light;
  --bg: #0b1220;
  --fg: #e2e8f0;
  --accent: #f97316;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: radial-gradient(1200px 600px at 10% -10%, #1d4ed8 0%, transparent 55%), var(--bg);
  color: var(--fg);
}

.code {
  font-family: var(--mono);
  font-size: 0.9rem;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--fg) 18%, transparent);
}

@media (max-width: 48rem) {
  .code { font-size: 0.8rem; }
}
`
  },
  {
    filename: "stack.yaml",
    language: "yaml",
    content: `# Attachment: YAML — fake stack file
version: 1
project: wox-bin-megademo
environments:
  development:
    debug: true
    port: 3000
  production:
    debug: false
    cdn: https://cdn.example.com
services:
  web:
    replicas: 2
    resources:
      limits:
        cpu: "500m"
        memory: 512Mi
features:
  - markdown
  - prism
  - paste-files
`
  },
  {
    filename: "server.kt",
    language: "kotlin",
    content: `package demo

import kotlin.math.min

/** Attachment: Kotlin — Prism sample */
data class PasteFile(
    val filename: String,
    val language: String,
    val lines: Int,
) {
    fun label(): String = "$filename ($language, $lines lines)"
}

fun main() {
    val files = listOf(
        PasteFile("layout.html", "markup", 40),
        PasteFile("tokens.css", "css", 55),
    )
    files.forEach { println(it.label()) }
    val n = min(files.size, 5)
    println("Free tier file cap hint: $n files shown")
}
`
  },
  {
    filename: "helpers.rb",
    language: "ruby",
    content: `# frozen_string_literal: true

# Attachment: Ruby — Prism sample
module WoxBin
  module Megademo
    module_function

    def slugify(title)
      title.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')
    end

    def word_count(body)
      body.split(/\s+/).count { |w| !w.empty? }
    end
  end
end

if $PROGRAM_NAME == __FILE__
  puts WoxBin::Megademo.slugify("Hello From WOX-Bin!!!")
end
`
  }
];

const exportedAt = new Date().toISOString();

const snapshot = {
  version: 2,
  exportedAt,
  description:
    "One megademo paste: full Markdown kitchen sink, classic lorem ipsum, fenced Prism samples for every WOX-Bin language id, 5 attachments (free-tier limit). Import from Workspace → Import file.",
  folders: ["Examples", "Code", "Snippets", "Notes"],
  pastes: [
    {
      id: "example-megademo-woxbin",
      slug: "example-megademo-woxbin",
      title: "WOX-Bin megademo — Markdown, lorem, all Prism languages",
      language: "markdown",
      folder: "Examples",
      category: "Software",
      tags: [
        "demo",
        "markdown",
        "prism",
        "lorem",
        "kitchen-sink",
        "import",
        "languages"
      ],
      visibility: "public",
      password: null,
      burnAfterRead: false,
      burnAfterViews: 0,
      favorite: true,
      archived: false,
      template: false,
      pinned: true,
      forkedFromId: null,
      replyToId: null,
      forkedFrom: null,
      replyTo: null,
      expiresAt: null,
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: exportedAt,
      content: buildMarkdownBody(),
      files: attachments.map((f) => ({
        filename: f.filename,
        content: f.content,
        language: f.language,
        mediaKind: null,
        mimeType: null
      })),
      versions: [
        {
          id: "ver-001",
          title: "WOX-Bin megademo — Markdown, lorem, all Prism languages",
          content:
            "# Megademo v1\n\nStub revision — outline only.\n\n- [ ] Expand markdown\n- [ ] Add Prism blocks\n",
          files: [],
          createdAt: "2025-01-15T10:00:00.000Z"
        },
        {
          id: "ver-002",
          title: "WOX-Bin megademo — Markdown, lorem, all Prism languages",
          content:
            "# Megademo v2\n\nAdded lorem ipsum sections; Prism samples still TODO.\n\n" + LOREM_CLASSIC.slice(0, 400) + "…\n",
          files: [],
          createdAt: "2025-02-01T14:30:00.000Z"
        },
        {
          id: "ver-003",
          title: "WOX-Bin megademo — Markdown, lorem, all Prism languages",
          content:
            "# Megademo v3\n\nAttachments: HTML + CSS only.\n\nSee `layout.html` and `tokens.css` in versions.\n",
          files: [attachments[0], attachments[1]].map((f) => ({
            filename: f.filename,
            content: f.content.slice(0, 200) + "\n<!-- truncated in version snapshot -->\n",
            language: f.language,
            mediaKind: null,
            mimeType: null
          })),
          createdAt: "2025-02-20T09:15:00.000Z"
        }
      ]
    }
  ]
};

fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");
const bytes = Buffer.byteLength(snapshot.pastes[0].content, "utf8");
console.log("Wrote", outPath);
console.log("Main body size:", (bytes / 1024).toFixed(1), "KB");
console.log("Attachments:", snapshot.pastes[0].files.length);
