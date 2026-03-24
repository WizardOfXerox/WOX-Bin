import type { Metadata } from "next";

import { ProofToolClient } from "@/components/tools/proof-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Proof receipts",
  description: "Create timestamped SHA-256 proof pages for text or files."
};

export default function ProofToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ProofToolClient />
    </main>
  );
}
