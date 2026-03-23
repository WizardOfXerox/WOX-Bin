import type { Metadata } from "next";

import { FragmentShareClient } from "@/components/quick-paste/fragment-share-client";

export const metadata: Metadata = {
  title: "Fragment share",
  description: "Client-side text sharing with no server storage. Content lives in the URL fragment."
};

export default function FragmentSharePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <FragmentShareClient />
      </div>
    </main>
  );
}
