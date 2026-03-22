import Link from "next/link";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export default function ToolsLayout({ children }: { children: ReactNode }) {
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
