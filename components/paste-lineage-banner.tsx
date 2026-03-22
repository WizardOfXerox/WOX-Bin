import Link from "next/link";
import { GitFork, MessageSquareReply } from "lucide-react";

import type { PasteLineageTarget } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  forkedFrom: PasteLineageTarget | null;
  replyTo: PasteLineageTarget | null;
  className?: string;
  /** Use plain text when target is not linkable (e.g. private unpublished draft). */
  plain?: boolean;
};

export function PasteLineageBanner({ forkedFrom, replyTo, className, plain }: Props) {
  if (!forkedFrom && !replyTo) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm", className)}>
      {forkedFrom ? (
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <GitFork aria-hidden className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0">Fork of</span>
          {plain ? (
            <span className="font-medium text-foreground">{forkedFrom.title}</span>
          ) : (
            <Link
              className="min-w-0 font-medium text-primary underline-offset-4 hover:underline"
              href={`/p/${forkedFrom.slug}`}
            >
              {forkedFrom.title}
            </Link>
          )}
        </div>
      ) : null}
      {replyTo ? (
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <MessageSquareReply aria-hidden className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0">Reply to</span>
          {plain ? (
            <span className="font-medium text-foreground">{replyTo.title}</span>
          ) : (
            <Link
              className="min-w-0 font-medium text-primary underline-offset-4 hover:underline"
              href={`/p/${replyTo.slug}`}
            >
              {replyTo.title}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
