import type { Metadata } from "next";

import { QuickPasteClient } from "@/components/quick-paste/quick-paste-client";

export const metadata: Metadata = {
  title: "Quick paste",
  description: "A fast route for anonymous or secret text/code sharing without opening the full workspace."
};

export default function QuickPastePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <QuickPasteClient />
      </div>
    </main>
  );
}
