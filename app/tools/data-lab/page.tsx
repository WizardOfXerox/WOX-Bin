import type { Metadata } from "next";

import DataLabClient from "@/components/tools/data-lab-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Data lab",
  description: "CSV/JSON/TSV, JSON format, Base64, and SHA-256 — client-side tools."
};

export default function DataLabPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <DataLabClient />
    </main>
  );
}
