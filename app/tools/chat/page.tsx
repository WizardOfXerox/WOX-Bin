import type { Metadata } from "next";

import { ChatToolClient } from "@/components/tools/chat-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Encrypted chat",
  description: "Create temporary encrypted chat rooms with fragment-key invites."
};

export default function ChatToolPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ChatToolClient />
    </main>
  );
}
