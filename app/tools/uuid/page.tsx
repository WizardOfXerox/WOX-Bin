import type { Metadata } from "next";

import { UuidToolClient } from "@/components/tools/uuid-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "UUID / ULID / NanoID Generator",
  description: "Generate cryptographically secure UUIDv4, timestamp-ordered UUIDv7, ULID, and customizable NanoIDs in bulk."
};

export default function UuidPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <UuidToolClient />
    </main>
  );
}
