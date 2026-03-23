import type { Metadata } from "next";
import { Suspense } from "react";

import { TOOLS_PAGE_MAIN } from "@/lib/tools/tools-layout";

import { PdfExtractDynamic } from "./pdf-extract-loader";

export const metadata: Metadata = {
  title: "PDF page extractor",
  description:
    "Extract PDF pages as PNG or JPEG images in your browser. Optional per-page text. No server upload — works on Vercel."
};

export default function PdfExtractPage() {
  return (
    <main className={TOOLS_PAGE_MAIN}>
      <Suspense
        fallback={
          <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm">Loading PDF tool…</div>
        }
      >
        <PdfExtractDynamic />
      </Suspense>
    </main>
  );
}
