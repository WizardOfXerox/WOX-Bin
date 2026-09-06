import type { Metadata } from "next";

import { QrToolClient } from "@/components/tools/qr-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "QR code studio",
  description: "Generate offline vector SVG and high-resolution PNG QR codes with zero tracking or server uploads."
};

export default function QrPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <QrToolClient />
    </main>
  );
}
