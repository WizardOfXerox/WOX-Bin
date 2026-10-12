import type { Metadata } from "next";

import { HashToolClient } from "@/components/tools/hash-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Hash & HMAC Suite",
  description: "Calculate MD5, SHA-1, SHA-256, SHA-384, SHA-512 hashes and HMAC signatures offline in your browser."
};

export default function HashPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <HashToolClient />
    </main>
  );
}
