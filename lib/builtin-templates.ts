/** Built-in paste templates (ported from legacy `legacy/js/01-core.js`). */
export type BuiltinTemplate = {
  id: string;
  title: string;
  language: string;
  content: string;
};

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "py-script",
    title: "Python script",
    language: "python",
    content: `#!/usr/bin/env python3
"""Description."""

def main():
    pass


if __name__ == "__main__":
    main()
`
  },
  {
    id: "html-boiler",
    title: "HTML boilerplate",
    language: "markup",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page</title>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>
`
  },
  {
    id: "js-module",
    title: "JavaScript module",
    language: "javascript",
    content: `export function hello() {
  return "Hello";
}

export default { hello };
`
  },
  {
    id: "json-empty",
    title: "Empty JSON",
    language: "json",
    content: `{
  
}
`
  },
  {
    id: "bash-script",
    title: "Bash script",
    language: "bash",
    content: `#!/usr/bin/env bash
set -euo pipefail

# Your script here
echo "Done"
`
  },
  {
    id: "sql-query",
    title: "SQL query",
    language: "sql",
    content: `-- Example query
SELECT id, name
FROM table_name
WHERE 1=1
ORDER BY name;
`
  }
];
