import type { Metadata } from "next";

import TarToolClient from "@/components/tools/tar-tool-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "TAR & Compressed TAR Archive Reader",
  description: "Inspect, view, and extract .tar, .tar.gz, and .tgz archives in your browser without uploading."
};

export default function TarGzPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <TarToolClient />
    </main>
  );
}
