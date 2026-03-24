import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PollViewClient } from "@/components/tools/poll-view-client";
import { SiteHeader } from "@/components/site/site-header";
import { getPrivacyPollBySlug } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Poll",
  description: "Vote in a WOX-Bin public poll."
};

export default async function PollSharePage({ params }: Params) {
  const { slug } = await params;
  const poll = await getPrivacyPollBySlug(slug, null);
  if (!poll) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <PollViewClient
          initialPoll={{
            ...poll,
            createdAt: poll.createdAt.toISOString(),
            expiresAt: poll.expiresAt?.toISOString() ?? null
          }}
        />
      </div>
    </main>
  );
}
