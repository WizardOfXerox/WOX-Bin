import type { Metadata } from "next";

import { TOOLS_PAGE_MAIN } from "@/lib/tools/tools-layout";

import { ConvertDynamic } from "./convert-loader";

export const metadata: Metadata = {
  title: "File converter hub | WOX-Bin",
  description:
    "Hybrid conversion tools: browser-first utilities and planned worker-backed formats. Part of WOX-Bin tools."
};

export default function ToolsConvertPage() {
  return (
    <main className={TOOLS_PAGE_MAIN}>
      <ConvertDynamic />
    </main>
  );
}
