import type { Metadata } from "next";

import { EncryptedSecretClient } from "@/components/quick-paste/encrypted-secret-client";
import { SiteHeader } from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Encrypted secret links",
  description: "Create client-side encrypted secret links with sender-side revoke controls."
};

export default function SecretSharePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <EncryptedSecretClient />
      </div>
    </main>
  );
}
