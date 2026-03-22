import type { Metadata } from "next";

import ImageConvertClient from "@/components/tools/image-convert-client";
import { TOOLS_PAGE_MAIN_SIMPLE } from "@/lib/tools/tools-layout";

export const metadata: Metadata = {
  title: "Image converter | WOX-Bin",
  description: "Convert images between PNG, JPEG, and WebP in your browser — no upload."
};

export default function ImageConvertPage() {
  return (
    <main className={TOOLS_PAGE_MAIN_SIMPLE}>
      <ImageConvertClient />
    </main>
  );
}
