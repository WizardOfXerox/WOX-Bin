import type { Metadata } from "next";

import { NorefToolClient } from "@/components/tools/noref-tool-client";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "NoRef",
  description: "Generate WOX-Bin privacy redirect links that hide the referring page."
};

export default function NorefPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <NorefToolClient />
      </div>
    </main>
  );
}
