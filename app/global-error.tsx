"use client";

import { RuntimeErrorPanel } from "@/components/site/runtime-error-panel";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <RuntimeErrorPanel error={error} reset={reset} scope="global" />
      </body>
    </html>
  );
}
