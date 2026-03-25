import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { ShortenerToolClient } from "@/components/tools/shortener-tool-client";

export const metadata: Metadata = {
  title: "Short link",
  description: "Create short privacy-aware WOX-Bin redirect links."
};

export default function ShortenPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ShortenerToolClient />
      </div>
    </main>
  );
}
