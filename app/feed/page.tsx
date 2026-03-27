import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site/site-header";
import { FEED_ARCHIVE_COPY } from "@/lib/feed-archive-copy";
import { listFeedPastes } from "@/lib/paste-service";
import { RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";
import { getServerTranslator } from "@/lib/server-i18n";
import { formatDate } from "@/lib/utils";

/** Always query the database at request time — avoid static prerender freezing the feed at build. */
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { language, t } = await getServerTranslator();
  const copy = FEED_ARCHIVE_COPY[language].feed;
  const pastes = await listFeedPastes(RECENT_PUBLIC_PASTES_LIMIT);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
      <SiteHeader />
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <Link className="text-foreground hover:underline" href="/">
          {t("nav.home")}
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">{t("nav.feed")}</span>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="hover:underline" href="/archive">
          {t("nav.archive")}
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="hover:underline" href="/app">
          {t("nav.workspace")}
        </Link>
      </nav>

      <header className="glass-panel px-6 py-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          {copy.description.replace("{limit}", String(RECENT_PUBLIC_PASTES_LIMIT))} {copy.archiveLeadIn}{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/archive">
            {t("nav.archive")}
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
                    {copy.byLabel}{" "}
                    {paste.author.username ? (
                      <Link
                        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                        href={`/u/${encodeURIComponent(paste.author.username)}`}
                      >
                        {paste.author.displayName || paste.author.username}
                      </Link>
                    ) : (
                      <span className="text-foreground">{paste.author.displayName || copy.anonymous}</span>
                    )}{" "}
                    {copy.dateConnector} {formatDate(paste.updatedAt)}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{paste.viewCount.toLocaleString()} {copy.views}</p>
                  <p>{paste.stars} {copy.stars}</p>
                  <p>{paste.commentsCount} {copy.comments}</p>
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
