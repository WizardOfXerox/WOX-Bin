"use client";

import dynamic from "next/dynamic";

export const ConvertDynamic = dynamic(() => import("@/components/tools/convert-client"), {
  loading: () => (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-4xl items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
  ssr: true
});
