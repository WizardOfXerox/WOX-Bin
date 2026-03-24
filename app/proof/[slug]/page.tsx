import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProofViewClient } from "@/components/tools/proof-view-client";
import { SiteHeader } from "@/components/site/site-header";
import { getPrivacyProofBySlug } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Proof receipt",
  description: "Verify a WOX-Bin proof receipt against local text or files."
};

export default async function ProofSharePage({ params }: Params) {
  const { slug } = await params;
  const proof = await getPrivacyProofBySlug(slug);
  if (!proof) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ProofViewClient
          proof={{
            ...proof,
            createdAt: proof.createdAt.toISOString()
          }}
        />
      </div>
    </main>
  );
}
