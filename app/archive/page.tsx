import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { SiteHeader } from "@/components/site/site-header";
import { listFeedPastes } from "@/lib/paste-service";
import { TOOLS_ENABLED } from "@/lib/tools/availability";
import { cn } from "@/lib/utils";

/** Always query the database at request time — avoid static prerender freezing the archive at build. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public pastes archive",
  description:
    "Recently created public pastes on WOX-Bin. Browse titles, syntax, and age—similar to a classic paste archive. No sign-in required."
};

function syntaxLabel(language: string) {
  const l = language?.trim().toLowerCase();
  if (!l || l === "none" || l === "auto") {
    return "—";
  }
  return language;
}

export default async function ArchivePage() {
  const pastes = await listFeedPastes(120);

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
        <Link className="hover:underline" href="/feed">
          Feed
        </Link>
        <span aria-hidden className="text-border">
          /
        </span>
        <span className="font-medium text-foreground">Archive</span>
        <span aria-hidden className="text-border">
          /
        </span>
        <Link className="hover:underline" href="/app">
          Workspace
        </Link>
        {TOOLS_ENABLED ? (
          <>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link className="hover:underline" href="/tools">
              Tools
            </Link>
            <span aria-hidden className="text-border">
              /
            </span>
            <Link className="hover:underline" href="/tools/pdf-extract">
              PDF extract
            </Link>
          </>
        ) : null}
      </nav>

      <header className="glass-panel px-6 py-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Public archive</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Pastes archive</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          This page lists the most recently updated{" "}
          <strong className="font-medium text-foreground">public</strong> pastes—same idea as{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://pastebin.com/archive"
            rel="noreferrer"
            target="_blank"
          >
            Pastebin&apos;s archive
          </a>
          . Password-protected, hidden, expired, and deleted pastes are excluded.
        </p>
      </header>

      {pastes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No public pastes yet. When users publish public pastes, they will appear here.
        </p>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="grid gap-3 p-4 sm:hidden">
            {pastes.map((paste) => (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={paste.id}>
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  href={`/p/${paste.slug}`}
                >
                  {paste.title?.trim() || "Untitled"}
                </Link>
                <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <dt>Posted</dt>
                    <dd className="text-right">
                      {formatDistanceToNow(new Date(paste.updatedAt), { addSuffix: true })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Syntax</dt>
                    <dd className="text-right">{syntaxLabel(paste.language)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt>Views</dt>
                    <dd className="text-right">{paste.viewCount.toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium md:px-5">Name / title</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Posted</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Syntax</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Views</th>
                </tr>
              </thead>
              <tbody>
                {pastes.map((paste, index) => (
                  <tr
                    className={cn(
                      "border-b border-white/5 transition-colors hover:bg-white/[0.04]",
                      index === pastes.length - 1 && "border-b-0"
                    )}
                    key={paste.id}
                  >
                    <td className="max-w-[min(100vw,28rem)] px-4 py-3 md:px-5">
                      <Link
                        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                        href={`/p/${paste.slug}`}
                      >
                        {paste.title?.trim() || "Untitled"}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground md:px-5" title={paste.updatedAt}>
                      {formatDistanceToNow(new Date(paste.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground md:px-5">
                      {syntaxLabel(paste.language)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground md:px-5">
                      {paste.viewCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/10 px-4 py-3 text-xs text-muted-foreground md:px-5">
            Showing {pastes.length} recent public paste{pastes.length === 1 ? "" : "s"}. For previews and snippets, try the{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/feed">
              card feed
            </Link>
            .
          </p>
        </div>
      )}
    </main>
  );
}
