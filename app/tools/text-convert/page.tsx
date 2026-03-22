import type { Metadata } from "next";
import Link from "next/link";

import { TOOLS_PAGE_MAIN_NARROW } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Text ↔ HTML | WOX-Bin",
  description: "Plain text to HTML or HTML to plain text — client-side."
};

export default function TextConvertIndexPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_NARROW}>
      <nav className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">Text ↔ HTML</span>
      </nav>
      <header className="glass-panel space-y-2 px-4 py-4 sm:px-6 sm:py-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Text ↔ HTML</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Pick a direction (opens the same engine as /tools/c/… pair routes).
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Link
          className="glass-panel block min-h-11 touch-manipulation rounded-xl border p-4 text-center text-sm font-medium transition hover:border-primary/30 active:bg-muted/30 sm:min-h-0 sm:p-6"
          href="/tools/c/txt-html"
        >
          TXT → HTML
        </Link>
        <Link
          className="glass-panel block min-h-11 touch-manipulation rounded-xl border p-4 text-center text-sm font-medium transition hover:border-primary/30 active:bg-muted/30 sm:min-h-0 sm:p-6"
          href="/tools/c/html-txt"
        >
          HTML → TXT
        </Link>
      </div>
    </main>
  );
}
