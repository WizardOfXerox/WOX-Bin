import type { Metadata } from "next";

import { NorefToolClient } from "@/components/tools/noref-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "NoRef link generator",
  description: "Build WOX-Bin outbound links that hide the referring page."
};

export default function NorefToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <NorefToolClient />
    </main>
  );
}
