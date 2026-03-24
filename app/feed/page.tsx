import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site/site-header";
import { listFeedPastes } from "@/lib/paste-service";
import { formatDate } from "@/lib/utils";

/** Always query the database at request time — avoid static prerender freezing the feed at build. */
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const pastes = await listFeedPastes(50);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
      <SiteHeader />
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link className="text-foreground hover:underline" href="/">
          Home
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Feed</span>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="hover:underline" href="/archive">
          Archive
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="hover:underline" href="/app">
          Workspace
        </Link>
      </nav>

      <header className="glass-panel px-6 py-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">WOX-Bin feed</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Fresh public pastes</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Public entries from the new WOX-Bin workspace. Password-protected, hidden, expired, and deleted content stays out of this feed.
          Prefer a compact table? See the{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/archive">
            public archive
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-4">
        {pastes.map((paste) => (
          <Card key={paste.id}>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{paste.language}</Badge>
                    {paste.category ? <Badge>{paste.category}</Badge> : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">
                    <Link href={`/p/${paste.slug}`}>{paste.title}</Link>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    By{" "}
                    {paste.author.username ? (
                      <Link
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                        href={`/u/${encodeURIComponent(paste.author.username)}`}
                      >
                        {paste.author.displayName || paste.author.username}
                      </Link>
                    ) : (
                      <span className="text-foreground">{paste.author.displayName || "Anonymous"}</span>
                    )}{" "}
                    on {formatDate(paste.updatedAt)}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{paste.viewCount.toLocaleString()} views</p>
                  <p>{paste.stars} stars</p>
                  <p>{paste.commentsCount} comments</p>
                </div>
              </div>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {paste.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
