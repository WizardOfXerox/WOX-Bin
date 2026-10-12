import type { Metadata } from "next";

import IcoToolClient from "@/components/tools/ico-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Favicon / ICO Generator",
  description: "Generate multi-resolution .ico favicon files in your browser with live previews. No upload required."
};

export default function IcoPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <IcoToolClient />
    </main>
  );
}
