import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site/site-header";
import { SnapshotViewClient } from "@/components/tools/snapshot-view-client";
import { getPrivacySnapshotBySlug } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Encrypted snapshot",
  description: "Unlock a WOX-Bin encrypted snapshot with its fragment key."
};

export default async function SnapshotSharePage({ params }: Params) {
  const { slug } = await params;
  const snapshot = await getPrivacySnapshotBySlug(slug, true);
  if (!snapshot) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <SnapshotViewClient
          snapshot={{
            ...snapshot,
            createdAt: snapshot.createdAt.toISOString(),
            expiresAt: snapshot.expiresAt?.toISOString() ?? null
          }}
        />
      </div>
    </main>
  );
}
