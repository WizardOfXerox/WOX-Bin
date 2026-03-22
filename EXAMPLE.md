# WOX-Bin example pastes & how to use Prism

This folder includes **example pastes** you can import into WOX-Bin to see how the app works and how **Prism** syntax highlighting looks.

## How to load the examples

1. Open WOX-Bin:
   - current Next.js app: run `run-next.bat` or `npm run dev`
   - legacy app: run `legacy/run-local.bat` or `legacy/run-server.bat`
2. In the **sidebar**, click **Import file**.
3. Choose **`example-pastes.json`** from this project folder.
4. Click Open. You’ll see a message like “Imported 5 paste(s).”
5. The example pastes appear in your list. Click each one to view.

## One megademo paste (`example-big-paste.json`)

**`example-big-paste.json`** is a **v2 workspace export** with a **single** paste that includes:

- **Markdown kitchen sink** (headings, lists, tasks, tables, quotes, rules, links, placeholder image)
- **Classic + extended lorem ipsum** (long scroll-friendly paragraphs)
- **Fenced code blocks for every WOX-Bin language id** (`none`, `auto`, `markup`, `css`, `javascript`, … `kotlin`)
- **Five attachments** (HTML, CSS, YAML, Kotlin, Ruby) — matches the **Free** plan file-per-paste limit

Import it the same way (**Import file**). To regenerate the file after editing the generator:

```bash
npm run gen:example-big-paste
```

All other **`npm run`** commands (database, tests, conversion worker, etc.) are listed in **[docs/NPM-SCRIPTS.md](./docs/NPM-SCRIPTS.md)**.

## What’s in the example file

| Paste | Description |
|-------|-------------|
| **Welcome to WOX-Bin** | Short intro and basic usage (plain text). |
| **Prism example: JavaScript** | Sample JS code; set language to **JavaScript** to see highlighting. |
| **Prism example: Python** | Sample Python code; set language to **Python**. |
| **Prism example: HTML** | Sample HTML; set language to **HTML** (markup). |
| **Keyboard shortcuts** | Quick reference for Ctrl+N, Ctrl+S, Ctrl+F, ?. |

## How Prism works in WOX-Bin

- **Prism** is the library that colors your code (keywords, strings, comments, etc.).
- In the **editor toolbar**, use the **“Syntax highlighting”** dropdown and pick a language (e.g. JavaScript, Python, HTML, Markdown, JSON).
- The current paste is then highlighted according to that language. If you leave it on “Plain text”, no highlighting is applied.
- You can change the **syntax theme** in the editor options (Tomorrow, Prism, Coy, Dark) and toggle **line numbers** and **word wrap**.

## Languages you can try

From the dropdown you can select, among others:

- Plain text, Markdown, HTML (markup), CSS, JavaScript, TypeScript, JSON  
- Python, Bash, SQL, YAML, PowerShell  
- C++, C#, Java, PHP, XML  

Pick the one that matches your snippet to get the right colors.

## File format (for your own backups)

The file **`example-pastes.json`** has this shape:

- `version`: 1  
- `exportedAt`: ISO date string  
- `folders`: array of folder names  
- `pastes`: array of paste objects (each with `id`, `title`, `content`, `language`, `folder`, `tags`, etc.)

When you use **Export** in WOX-Bin, you get a file in the same format. You can edit or merge such JSON and re-import it via **Import file**.

## Fork / reply from a public paste

On any public paste page (`/p/{slug}`), use **Fork** or **Reply** to open the workspace with a draft. You can also deep-link:

- `/app?fork={slug}` — fork (same content + lineage)
- `/app?reply={slug}` — reply (empty body, reply lineage)

Password-protected pastes must be unlocked in `/p/…` in the same browser first (access cookie), or the import will show an error.
