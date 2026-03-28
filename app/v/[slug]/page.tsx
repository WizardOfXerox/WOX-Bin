import type { Metadata } from "next";

import { EncryptedFileVaultViewClient } from "@/components/quick-paste/encrypted-file-vault-view-client";
import { SiteHeader } from "@/components/site/site-header";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Encrypted vault ${slug}`,
    description: "Unlock and download a client-side encrypted WOX-Bin file vault."
  };
}

export default async function VaultViewPage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <EncryptedFileVaultViewClient slug={slug} />
      </div>
    </main>
  );
}
