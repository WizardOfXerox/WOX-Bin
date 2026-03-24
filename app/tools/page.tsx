import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  Braces,
  Code2,
  FileArchive,
  FileImage,
  FileStack,
  FileText,
  ImageIcon,
  Link2,
  Lock,
  Merge,
  ScanSearch,
  Scissors,
  Vote
} from "lucide-react";

import { CONVERT_TOOLS } from "@/lib/tools/convert-registry";
import { TOOLS_PAGE_MAIN } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Tools",
  description: "Browser utilities: PDF extraction, file conversion hub, and more — many run locally without uploading files."
};

const featured = [
  {
    title: "PDF page extractor",
    description: "Rasterize pages, export PNG/JPEG/TXT/DOCX, previews, and drag-and-drop — all client-side.",
    href: "/tools/pdf-extract",
    icon: FileStack
  },
  {
    title: "Converter hub",
    description: "Live browser tools + Convertio index; per-pair routes under /tools/c/{from}-{to}.",
    href: "/tools/convert",
    icon: FileImage
  },
  {
    title: "Image converter",
    description: "PNG / JPEG / WebP (and more decodes) in the browser — no upload.",
    href: "/tools/image-convert",
    icon: ImageIcon
  },
  {
    title: "Data lab",
    description: "CSV ↔ JSON, TSV, JSON format, Base64, SHA-256 — local.",
    href: "/tools/data-lab",
    icon: Braces
  },
  {
    title: "Privacy suite",
    description: "Encrypted snapshots, chat, polls, proofs, and privacy redirect tools.",
    href: "/tools/privacy",
    icon: Lock
  },
  {
    title: "Metadata scrubber",
    description: "Strip image metadata in the browser and download a cleaner copy.",
    href: "/tools/scrub",
    icon: ScanSearch
  },
  {
    title: "NoRef generator",
    description: "Generate share links that hide the referring page.",
    href: "/tools/noref",
    icon: Link2
  },
  {
    title: "Poll creator",
    description: "Create anonymous public polls with shareable result pages.",
    href: "/tools/poll",
    icon: Vote
  },
  {
    title: "ZIP lab",
    description: "Pack files into .zip or extract entries with fflate.",
    href: "/tools/zip-lab",
    icon: FileArchive
  },
  {
    title: "Markdown → HTML",
    description: "Marked + DOMPurify in the browser; download a small HTML page.",
    href: "/tools/markdown-html",
    icon: Code2
  },
  {
    title: "PDF merge",
    description: "Concatenate PDFs with pdf-lib — all client-side.",
    href: "/tools/pdf-merge",
    icon: Merge
  },
  {
    title: "PDF split",
    description: "One PDF per page, packaged in a ZIP — browser only.",
    href: "/tools/pdf-split",
    icon: Scissors
  },
  {
    title: "Text ↔ HTML",
    description: "Escape text to HTML or strip tags to plain text.",
    href: "/tools/text-convert",
    icon: FileText
  }
];

export default function ToolsIndexPage() {
  const liveCount = CONVERT_TOOLS.filter((t) => t.status === "live").length;

  return (
    <main className={TOOLS_PAGE_MAIN}>
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
        <span className="font-medium text-foreground">Overview</span>
        <span aria-hidden className="text-border">
          ·
        </span>
        <Link className="touch-manipulation hover:underline" href="/archive">
          Archive
        </Link>
      </nav>

      <header className="glass-panel px-4 py-4 sm:px-6 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          Separate surface
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl md:text-4xl">Tools</h1>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-7">
          WOX Tools is intentionally separate from the paste workspace at <span className="font-mono text-xs">/app</span>. Most tools are
          browser-only and do not touch your paste library unless you explicitly import or export data. Heavy image pairs (TIFF/RAW→WebP,
          etc.) use a <span className="font-medium text-foreground">server sharp</span> endpoint (
          <span className="font-mono text-xs">POST /api/convert/image</span>) — files are processed in memory for that request only.{" "}
          <span className="font-medium text-foreground">{liveCount}</span> conversion-related tool{liveCount === 1 ? "" : "s"} marked{" "}
          <span className="font-medium text-foreground">live</span> in the registry — see{" "}
          <span className="font-mono text-xs">docs/CONVERSION-PLATFORM.md</span>.
        </p>
      </header>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {featured.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className="glass-panel group flex flex-col gap-2.5 p-4 transition hover:border-primary/30 active:bg-muted/20 sm:gap-3 sm:p-6"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 sm:size-10">
                    <Icon className="size-[1.1rem] text-primary sm:size-5" />
                  </span>
                  <h2 className="text-base font-semibold leading-snug tracking-tight sm:text-lg">{item.title}</h2>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground sm:size-5" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
