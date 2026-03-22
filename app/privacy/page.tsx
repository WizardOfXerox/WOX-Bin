import Link from "next/link";
import type { Metadata } from "next";

import { PrivacyPolicyContent } from "@/components/legal/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy — WOX-Bin",
  description: "Privacy Policy for using WOX-Bin."
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Legal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          </div>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" href="/">
            ← Home
          </Link>
        </div>
        <PrivacyPolicyContent />
      </div>
    </main>
  );
}
