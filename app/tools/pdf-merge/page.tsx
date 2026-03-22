import type { Metadata } from "next";

import PdfMergeClient from "@/components/tools/pdf-merge-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "PDF merge | WOX-Bin",
  description: "Merge multiple PDFs in the browser with pdf-lib."
};

export default function PdfMergePage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <PdfMergeClient />
    </main>
  );
}
