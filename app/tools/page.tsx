import type { Metadata } from "next";
import Link from "next/link";

import { getServerUiLanguage } from "@/lib/server-i18n";
import { CONVERT_TOOLS } from "@/lib/tools/convert-registry";
import { TOOLS_PAGE_MAIN } from "@/lib/tools/tools-layout";
import { TOOLS_PAGE_COPY } from "@/lib/tools-page-copy";
import { ToolsGrid, ToolItem } from "@/components/tools/tools-grid";

export const metadata: Metadata = {
  title: "Tools",
  description: "Browser utilities: PDF extraction, file conversion hub, and more — many run locally without uploading files."
};

const featuredTools: ToolItem[] = [
  {
    title: "PDF page extractor",
    description: "Rasterize pages, export PNG/JPEG/TXT/DOCX, previews, and drag-and-drop — all client-side.",
    href: "/tools/pdf-extract",
    iconName: "FileStack",
    category: "pdf",
    isLocal: true
  },
  {
    title: "Converter hub",
    description: "Live browser tools + Convertio index; per-pair routes under /tools/c/{from}-{to}.",
    href: "/tools/convert",
    iconName: "FileImage",
    category: "convert",
    isLocal: true
  },
  {
    title: "Image converter",
    description: "PNG / JPEG / WebP (and more decodes) in the browser — no upload.",
    href: "/tools/image-convert",
    iconName: "ImageIcon",
    category: "convert",
    isLocal: true
  },
  {
    title: "Data lab",
    description: "CSV ↔ JSON, TSV, JSON format, Base64, SHA-256 — local.",
    href: "/tools/data-lab",
    iconName: "Braces",
    category: "data",
    isLocal: true
  },
  {
    title: "Privacy suite",
    description: "Encrypted snapshots, chat, polls, proofs, and privacy redirect tools.",
    href: "/tools/privacy",
    iconName: "Lock",
    category: "privacy",
    isLocal: true
  },
  {
    title: "Metadata scrubber",
    description: "Strip image metadata in the browser and download a cleaner copy.",
    href: "/tools/scrub",
    iconName: "ScanSearch",
    category: "privacy",
    isLocal: true
  },
  {
    title: "NoRef generator",
    description: "Generate share links that hide the referring page.",
    href: "/tools/noref",
    iconName: "Link2",
    category: "privacy",
    isLocal: true
  },
  {
    title: "Poll creator",
    description: "Create anonymous public polls with shareable result pages.",
    href: "/tools/poll",
    iconName: "Vote",
    category: "privacy",
    isLocal: false
  },
  {
    title: "ZIP lab",
    description: "Pack files into .zip or extract entries with fflate.",
    href: "/tools/zip-lab",
    iconName: "FileArchive",
    category: "data",
    isLocal: true
  },
  {
    title: "Markdown → HTML",
    description: "Marked + DOMPurify in the browser; download a small HTML page.",
    href: "/tools/markdown-html",
    iconName: "Code2",
    category: "data",
    isLocal: true
  },
  {
    title: "PDF merge",
    description: "Concatenate PDFs with pdf-lib — all client-side.",
    href: "/tools/pdf-merge",
    iconName: "Merge",
    category: "pdf",
    isLocal: true
  },
  {
    title: "PDF split",
    description: "One PDF per page, packaged in a ZIP — browser only.",
    href: "/tools/pdf-split",
    iconName: "Scissors",
    category: "pdf",
    isLocal: true
  },
  {
    title: "Text ↔ HTML",
    description: "Escape text to HTML or strip tags to plain text.",
    href: "/tools/text-convert",
    iconName: "FileText",
    category: "convert",
    isLocal: true
  }
];

export default async function ToolsIndexPage() {
  const liveCount = CONVERT_TOOLS.filter((t) => t.status === "live").length;
  const language = await getServerUiLanguage();
  const copy = TOOLS_PAGE_COPY[language];
  const liveDescription = copy.description
    .replace("{liveCount}", String(liveCount))
    .replace("{suffix}", liveCount === 1 ? "" : "s");

  // Format tools with translations
  const localizedTools = featuredTools.map((item) => {
    const card = copy.featured[item.href];
    return {
      ...item,
      title: card?.title || item.title,
      description: card?.description || item.description
    };
  });

  return (
    <main className={TOOLS_PAGE_MAIN}>
      {/* Breadcrumb Nav */}
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <span className="font-medium text-foreground">{copy.overview}</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <Link className="touch-manipulation hover:underline" href="/archive">
          {copy.archive}
        </Link>
      </nav>

      {/* Header Panel with soft spotlight glow */}
      <header className="glass-panel relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
        <div className="absolute top-0 right-0 -z-10 size-60 rounded-full bg-gradient-to-br from-primary/10 via-accent/5 to-transparent blur-3xl" />
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-3xl md:text-4xl text-foreground">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm sm:leading-relaxed">
          {liveDescription}
        </p>
      </header>

      {/* Interactive grid and filters */}
      <ToolsGrid tools={localizedTools} copy={copy} />
    </main>
  );
}
