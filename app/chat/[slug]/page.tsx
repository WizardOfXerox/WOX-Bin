import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChatRoomClient } from "@/components/tools/chat-room-client";
import { SiteHeader } from "@/components/site/site-header";
import { getPrivacyChatRoomBySlug } from "@/lib/privacy-suite";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Encrypted chat",
  description: "Join a WOX-Bin encrypted temporary chat room."
};

export default async function ChatSharePage({ params }: Params) {
  const { slug } = await params;
  const room = await getPrivacyChatRoomBySlug(slug);
  if (!room) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ChatRoomClient slug={slug} />
      </div>
    </main>
  );
}
