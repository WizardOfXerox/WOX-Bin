import type { Metadata } from "next";

import { SnapshotToolClient } from "@/components/tools/snapshot-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Encrypted snapshots",
  description: "Create client-side encrypted snapshot links for sensitive text."
};

export default function SnapshotToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <SnapshotToolClient />
    </main>
  );
}
