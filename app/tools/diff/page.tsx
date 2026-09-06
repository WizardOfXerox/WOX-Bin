import type { Metadata } from "next";

import { DiffToolClient } from "@/components/tools/diff-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Diff checker",
  description: "Compare text, code, and markdown side-by-side or unified with character-level accuracy — 100% offline in browser."
};

export default function DiffPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <DiffToolClient />
    </main>
  );
}
