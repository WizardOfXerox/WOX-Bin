import type { Metadata } from "next";

import ZipLabClient from "@/components/tools/zip-lab-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "ZIP tools",
  description: "Create ZIP archives or extract files in the browser with fflate."
};

export default function ZipLabPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ZipLabClient />
    </main>
  );
}
