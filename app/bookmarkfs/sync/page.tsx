import type { Metadata } from "next";

import { BookmarkFsSyncClient } from "@/components/bookmarkfs/bookmarkfs-sync-client";

export const metadata: Metadata = {
  title: "BookmarkFS Sync",
  description:
    "Use the BookmarkFS extension bridge to browse the local vault from the hosted WOX-Bin app and push selected vault files into the workspace."
};

export default function BookmarkFsSyncPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-35" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <BookmarkFsSyncClient />
      </div>
    </main>
  );
}
