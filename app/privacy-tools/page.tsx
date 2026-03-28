import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { PrivacyHub } from "@/components/tools/privacy-hub";
import { getServerUiLanguage } from "@/lib/server-i18n";

export const metadata: Metadata = {
  title: "Privacy tools",
  description: "Encrypted snapshots, proofs, chat, polls, metadata scrubbing, and NoRef links."
};

export default async function PrivacyToolsPage() {
  const language = await getServerUiLanguage();

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <PrivacyHub language={language} />
      </div>
    </main>
  );
}
