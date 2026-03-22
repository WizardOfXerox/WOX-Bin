"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
};

export function LegacyPasteRedirect({ slug }: Props) {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash ?? "";
    router.replace(`/p/${slug}${hash}`);
  }, [router, slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      Redirecting to your paste...
    </div>
  );
}
