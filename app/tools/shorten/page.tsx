import type { Metadata } from "next";

import { ShortenerToolClient } from "@/components/tools/shortener-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Short link",
  description: "Create short privacy-aware WOX-Bin redirect links."
};

export default function ShortenToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ShortenerToolClient />
    </main>
  );
}
