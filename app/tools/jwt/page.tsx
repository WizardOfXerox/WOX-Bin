import type { Metadata } from "next";

import { JwtToolClient } from "@/components/tools/jwt-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "JWT inspector",
  description: "Decode, inspect, and analyze JSON Web Tokens offline in your browser — zero credentials sent to servers."
};

export default function JwtPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <JwtToolClient />
    </main>
  );
}
