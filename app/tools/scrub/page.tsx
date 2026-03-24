import type { Metadata } from "next";

import { ScrubToolClient } from "@/components/tools/scrub-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Metadata scrubber",
  description: "Remove image metadata locally in the browser and download a cleaner copy."
};

export default function ScrubToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ScrubToolClient />
    </main>
  );
}
