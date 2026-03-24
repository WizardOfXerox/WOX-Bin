import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { ProofToolClient } from "@/components/tools/proof-tool-client";

export const metadata: Metadata = {
  title: "Create proof",
  description: "Create a SHA-256 proof receipt for local text or files."
};

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ProofToolClient />
      </div>
    </main>
  );
}
