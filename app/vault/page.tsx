import type { Metadata } from "next";

import { EncryptedFileVaultClient } from "@/components/quick-paste/encrypted-file-vault-client";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Encrypted file vault",
  description: "Upload client-side encrypted files and share them with fragment-key vault links."
};

export default function VaultPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <EncryptedFileVaultClient />
      </div>
    </main>
  );
}
