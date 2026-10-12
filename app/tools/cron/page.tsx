import type { Metadata } from "next";

import { CronToolClient } from "@/components/tools/cron-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Cron Expression Visualizer",
  description: "Visual breakdown of 5-field and 6-field cron expressions, plain English schedule translation, and preview of the next 10 execution times."
};

export default function CronPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <CronToolClient />
    </main>
  );
}
