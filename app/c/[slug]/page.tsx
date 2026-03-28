import type { Metadata } from "next";

import { ClipboardBucketClient } from "@/components/quick-paste/clipboard-bucket-client";
import { SiteHeader } from "@/components/site/site-header";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} — clipboard bucket`,
    description: "A temporary clipboard bucket for cross-device handoff, with optional client-side encryption."
  };
}

export default async function ClipboardBucketPage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ClipboardBucketClient slug={slug} />
      </div>
    </main>
  );
}
