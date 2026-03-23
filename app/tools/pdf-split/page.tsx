import type { Metadata } from "next";

import PdfSplitClient from "@/components/tools/pdf-split-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "PDF split",
  description: "Split a PDF into one file per page in the browser; download as a ZIP."
};

export default function PdfSplitPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <PdfSplitClient />
    </main>
  );
}
