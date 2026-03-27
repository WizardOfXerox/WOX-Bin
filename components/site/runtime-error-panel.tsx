"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RuntimeErrorPanelProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  scope: "route" | "global";
};

export function RuntimeErrorPanel({ error, reset, scope }: RuntimeErrorPanelProps) {
  useEffect(() => {
    console.error(`[runtime-error:${scope}]`, error);
  }, [error, scope]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-2xl">
        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Runtime recovery</p>
            <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              WOX-Bin hit an unexpected runtime error. You can retry this view now, head back to the main site shell, or
              check the deployment and monitoring runbooks if you are the operator.
            </p>
          </div>

          {error.digest ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Error digest</p>
              <code className="mt-2 block break-all text-sm text-foreground">{error.digest}</code>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {reset ? (
              <Button onClick={() => reset()} type="button">
                Try again
              </Button>
            ) : null}
            <Button asChild type="button" variant="outline">
              <Link href="/">Back to WOX-Bin</Link>
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link href="/admin/deployment">Deployment checks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
