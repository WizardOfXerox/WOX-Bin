import { LANGUAGE_LABELS, LANGUAGES } from "@/lib/constants";
import { bigExampleTemplatePaste } from "@/lib/example-data";
import type { PasteFileDraft } from "@/lib/types";

type LanguageId = (typeof LANGUAGES)[number];

export type BuiltinTemplate = {
  id: string;
  title: string;
  language: LanguageId;
  content: string;
  folder?: string | null;
  category?: string | null;
  tags?: string[];
  files?: PasteFileDraft[];
  description?: string;
};

const LANGUAGE_TEMPLATE_SNIPPETS = {
  none: `WOX-Bin plain-text starter

Title: quick note
Owner: your workspace
Status: draft

- Use this for general notes or prose.
- Switch the language selector any time.
`,
  auto: `// Auto-detect scratchpad
const payload = {
  note: "Use Auto-detect when the snippet is mixed or temporary.",
  ok: true
};

console.log(JSON.stringify(payload, null, 2));
`,
  markup: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WOX-Bin HTML starter</title>
  </head>
  <body>
    <main>
      <h1>Hello</h1>
      <p>Edit this template.</p>
    </main>
  </body>
</html>
`,
  css: `:root {
  --bg: #0f172a;
  --fg: #e2e8f0;
  --accent: #38bdf8;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: var(--accent);
}
`,
  javascript: `export function main() {
  const name = "WOX-Bin";
  return \`Hello, \${name}\`;
}

console.log(main());
`,
  typescript: `type PasteSummary = {
  slug: string;
  title: string;
  pinned: boolean;
};

export function formatSummary(paste: PasteSummary) {
  return \`\${paste.title} (\${paste.slug})\`;
}
`,
  json: `{
  "name": "wox-bin",
  "template": true,
  "tags": ["json", "starter"],
  "settings": {
    "privateByDefault": true
  }
}
`,
  python: `#!/usr/bin/env python3
"""WOX-Bin Python starter."""

def main() -> None:
    print("Hello from WOX-Bin")


if __name__ == "__main__":
    main()
`,
  bash: `#!/usr/bin/env bash
set -euo pipefail

echo "[wox-bin] starting"
# your script here
`,
  sql: `-- WOX-Bin SQL starter
SELECT id, title, created_at
FROM pastes
WHERE visibility = 'public'
ORDER BY created_at DESC;
`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <title>WOX-Bin XML starter</title>
  <item id="1">Hello</item>
</root>
`,
  cpp: `#include <iostream>
#include <string>

int main() {
  std::string name = "WOX-Bin";
  std::cout << "Hello, " << name << "\\n";
  return 0;
}
`,
  csharp: `using System;

public static class Program
{
    public static void Main()
    {
        Console.WriteLine("Hello from WOX-Bin");
    }
}
`,
  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from WOX-Bin");
  }
}
`,
  php: `<?php
declare(strict_types=1);

function hello(string $name): string {
    return "Hello, {$name}";
}

echo hello("WOX-Bin");
`,
  powershell: `param(
  [string]$Name = "WOX-Bin"
)

$ErrorActionPreference = "Stop"
Write-Host "Hello from $Name" -ForegroundColor Cyan
`,
  yaml: `app:
  name: wox-bin
  mode: development
  features:
    - comments
    - templates
    - versions
`,
  markdown: `# WOX-Bin Markdown starter

Use this for docs, notes, and rich paste previews.

## Checklist

- [ ] Update the title
- [ ] Replace this content
- [ ] Share when ready
`,
  go: `package main

import "fmt"

func main() {
	fmt.Println("Hello from WOX-Bin")
}
`,
  rust: `fn main() {
    println!("Hello from WOX-Bin");
}
`,
  ruby: `def hello(name = "WOX-Bin")
  "Hello from #{name}"
end

puts hello
`,
  swift: `import Foundation

print("Hello from WOX-Bin")
`,
  kotlin: `fun main() {
    println("Hello from WOX-Bin")
}
`
} satisfies Record<LanguageId, string>;

function starterTitle(language: LanguageId) {
  if (language === "none") {
    return "Plain text note";
  }
  if (language === "auto") {
    return "Auto-detect scratchpad";
  }
  return `${LANGUAGE_LABELS[language]} starter`;
}

function cloneFiles(files?: PasteFileDraft[]) {
  return files?.map((file) => ({ ...file }));
}

const languageTemplates: BuiltinTemplate[] = LANGUAGES.map((language) => ({
  id: `starter-${language}`,
  title: starterTitle(language),
  language,
  content: LANGUAGE_TEMPLATE_SNIPPETS[language],
  description: `${LANGUAGE_LABELS[language]} starter template.`
}));

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "megademo",
    title: bigExampleTemplatePaste.title,
    language: bigExampleTemplatePaste.language as LanguageId,
    content: bigExampleTemplatePaste.content,
    folder: bigExampleTemplatePaste.folder,
    category: bigExampleTemplatePaste.category,
    tags: [...bigExampleTemplatePaste.tags],
    files: cloneFiles(bigExampleTemplatePaste.files),
    description: "The bundled WOX-Bin megademo with full Markdown, Prism samples, and five attachments."
  },
  ...languageTemplates
];
