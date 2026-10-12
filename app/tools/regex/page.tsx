import type { Metadata } from "next";

import { RegexToolClient } from "@/components/tools/regex-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Regex Tester & Debugger",
  description: "Interactive real-time regular expression tester with visual match highlights, capture groups breakdown, and substitution preview."
};

export default function RegexPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <RegexToolClient />
    </main>
  );
}
