import type { Metadata } from "next";

import { PollToolClient } from "@/components/tools/poll-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Poll creator",
  description: "Build quick anonymous polls with shareable result pages."
};

export default function PollToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <PollToolClient />
    </main>
  );
}
