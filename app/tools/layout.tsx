import Link from "next/link";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TOOLS_DISABLED_COPY, TOOLS_ENABLED } from "@/lib/tools/availability";
import { cn } from "@/lib/utils";

export default function ToolsLayout({ children }: { children: ReactNode }) {
  if (!TOOLS_ENABLED) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="w-full max-w-xl">
          <CardContent className="space-y-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-primary">
              <Wrench aria-hidden className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{TOOLS_DISABLED_COPY.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold">{TOOLS_DISABLED_COPY.title}</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{TOOLS_DISABLED_COPY.description}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/">Back home</Link>
              </Button>
              <Button asChild>
                <Link href="/app">Open workspace</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/doc/tools">Read tools status</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-border",
          "bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75"
        )}
      >
        <div className="mx-auto flex h-11 max-w-5xl items-center justify-between gap-2 px-3 sm:h-12 sm:px-4 md:px-6">
          <Link
            className="flex min-w-0 max-w-[55%] touch-manipulation items-center gap-2 text-sm font-semibold text-foreground sm:max-w-none"
            href="/tools"
          >
            <Wrench aria-hidden className="size-4 shrink-0 text-primary" />
            <span className="truncate">WOX Tools</span>
          </Link>
          <nav aria-label="Site" className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:text-sm"
              href="/"
            >
              Home
            </Link>
            <Link
              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:text-sm"
              href="/app"
            >
              Workspace
            </Link>
            <Link
              className="rounded-md px-1.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground sm:px-2 sm:text-sm"
              href="/doc/tools"
            >
              Docs
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-[max(0.75rem,env(safe-area-inset-bottom))]">{children}</div>
    </div>
  );
}
