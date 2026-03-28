import type { Metadata } from "next";

import { ClipboardLauncherClient } from "@/components/quick-paste/clipboard-launcher-client";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Clipboard buckets",
  description: "Short-lived text buckets with human-friendly keys, management tokens, and optional client-side encryption."
};

export default function ClipboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ClipboardLauncherClient />
      </div>
    </main>
  );
}
