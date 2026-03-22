import type { Metadata } from "next";

import MarkdownHtmlClient from "@/components/tools/markdown-html-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Markdown → HTML | WOX-Bin",
  description: "Render Markdown to sanitized HTML in your browser and download."
};

export default function MarkdownHtmlPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <MarkdownHtmlClient />
    </main>
  );
}
