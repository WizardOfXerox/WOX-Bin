"use client";

import dynamic from "next/dynamic";

export const PdfExtractDynamic = dynamic(() => import("@/components/tools/pdf-extract-client"), {
  loading: () => (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-2xl items-center justify-center text-sm text-muted-foreground">
      Loading tool…
    </div>
  ),
  ssr: false
});
