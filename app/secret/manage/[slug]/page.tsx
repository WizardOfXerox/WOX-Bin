import type { Metadata } from "next";

import { EncryptedSecretManageClient } from "@/components/quick-paste/encrypted-secret-manage-client";
import { SiteHeader } from "@/components/site/site-header";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Manage encrypted secret ${slug}`,
    description: "Sender-side status and revoke controls for an encrypted WOX-Bin secret link."
  };
}

export default async function SecretManagePage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <EncryptedSecretManageClient slug={slug} />
      </div>
    </main>
  );
}
