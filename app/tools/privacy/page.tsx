import type { Metadata } from "next";

import { PrivacyHub } from "@/components/tools/privacy-hub";
import { getServerUiLanguage } from "@/lib/server-i18n";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Privacy suite",
  description: "Encrypted snapshots, anonymous polls, proofs, metadata scrubbing, chat, and NoRef links."
};

export default async function PrivacyToolsPage() {
  const language = await getServerUiLanguage();

  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <PrivacyHub language={language} />
    </main>
  );
}
