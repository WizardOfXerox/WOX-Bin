import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { ChatToolClient } from "@/components/tools/chat-tool-client";

export const metadata: Metadata = {
  title: "Create chat",
  description: "Create a temporary encrypted chat room and share its invite."
};

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />
        <ChatToolClient />
      </div>
    </main>
  );
}
