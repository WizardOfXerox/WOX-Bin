import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { ScrubToolClient } from "@/components/tools/scrub-tool-client";

export const metadata: Metadata = {
  title: "Scrub metadata",
  description: "Remove image metadata in the browser and download a cleaned file."
};

export default function ScrubPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ScrubToolClient />
      </div>
    </main>
  );
}
