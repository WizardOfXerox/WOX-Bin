import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site/site-header";
import { FEED_ARCHIVE_COPY } from "@/lib/feed-archive-copy";
import { getCachedRecentPublicPastes } from "@/lib/public-feed-cache";
import { RECENT_PUBLIC_PASTES_LIMIT } from "@/lib/public-feed-view";
import { getServerTranslator } from "@/lib/server-i18n";
import { formatDate } from "@/lib/utils";

/** Always query the database at request time — avoid static prerender freezing the feed at build. */
export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { language, t } = await getServerTranslator();
  const copy = FEED_ARCHIVE_COPY[language].feed;
  const archiveCopy = FEED_ARCHIVE_COPY[language].archive;
  const pastes = await getCachedRecentPublicPastes();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-6">
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
              {t("nav.archive").toLowerCase()}
            </Link>
            .
          </p>
        </header>

        {pastes.map((paste) => (
          <Card className="overflow-hidden border-border/80 bg-card/60 backdrop-blur-sm" key={paste.slug}>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight">
                    <Link className="text-foreground underline-offset-4 hover:text-primary hover:underline" href={`/p/${paste.slug}`}>
                      {paste.title || archiveCopy.untitled}
                    </Link>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {paste.author?.username ? (
                      <Link className="font-medium text-primary hover:underline" href={`/u/${paste.author.username}`}>
                        {paste.author.displayName || `@${paste.author.username}`}
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
