"use client";

import { RuntimeErrorPanel } from "@/components/site/runtime-error-panel";

export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RuntimeErrorPanel error={error} reset={reset} scope="route" />;
}
