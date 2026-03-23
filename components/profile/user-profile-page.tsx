"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  Eye,
  FileText,
  FolderLock,
  Globe2,
  MessageSquare,
  Shield,
  Sparkles,
  Star
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPasteSharePath } from "@/lib/paste-links";
import type { UserProfilePasteRow, UserProfileSnapshot } from "@/lib/profile-service";
import { formatDate } from "@/lib/utils";

type Props = {
  snapshot: UserProfileSnapshot;
};

type FilterValue = "all" | "public" | "unlisted" | "private" | "hidden" | "secret";

function profileLabel(snapshot: UserProfileSnapshot) {
  return snapshot.profile.displayName?.trim() || snapshot.profile.username;
}

function profileInitials(snapshot: UserProfileSnapshot) {
  const source = profileLabel(snapshot).trim();
  const parts = source.split(/\s+/).slice(0, 2);
  if (parts.length === 0) {
    return "WB";
  }
  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function matchesFilter(paste: UserProfilePasteRow, filter: FilterValue) {
  if (filter === "all") {
    return true;
  }
  if (filter === "hidden") {
    return paste.status === "hidden";
  }
  if (filter === "secret") {
    return paste.secretMode;
  }
  if (paste.status !== "active") {
    return false;
  }
  if (paste.secretMode && filter === "unlisted") {
    return false;
  }
  return paste.visibility === filter;
}

function visibilityTone(paste: UserProfilePasteRow) {
  if (paste.status === "hidden") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  }
  if (paste.visibility === "private") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  }
  if (paste.visibility === "unlisted") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100";
  }
  return undefined;
}

function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-card/55 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ProfilePasteBadges({ paste }: { paste: UserProfilePasteRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className={visibilityTone(paste)}>{paste.status === "hidden" ? "Hidden" : paste.visibility}</Badge>
      <Badge>{paste.language}</Badge>
      {paste.secretMode ? <Badge className="border-primary/30 bg-primary/10 text-primary">Secret link</Badge> : null}
      {paste.hasPassword ? <Badge>Password</Badge> : null}
      {paste.pinned ? <Badge>Pinned</Badge> : null}
      {paste.archived ? <Badge>Archived</Badge> : null}
      {paste.template ? <Badge>Template</Badge> : null}
      {paste.category ? <Badge>{paste.category}</Badge> : null}
    </div>
  );
}

export function UserProfilePage({ snapshot }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const label = profileLabel(snapshot);
  const joinedText = formatDate(snapshot.profile.createdAt);
  const owner = snapshot.profile.isOwnerViewer;

  const filterCounts = useMemo(() => {
    const rows = snapshot.pastes;
    return {
      public: rows.filter((paste) => matchesFilter(paste, "public")).length,
      unlisted: rows.filter((paste) => matchesFilter(paste, "unlisted")).length,
      private: rows.filter((paste) => matchesFilter(paste, "private")).length,
      hidden: rows.filter((paste) => matchesFilter(paste, "hidden")).length,
      secret: rows.filter((paste) => matchesFilter(paste, "secret")).length
    };
  }, [snapshot.pastes]);

  const filteredPastes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.pastes.filter((paste) => {
      if (!matchesFilter(paste, filter)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [paste.title, paste.slug, paste.language, paste.category ?? ""].some((value) =>
        value.toLowerCase().includes(needle)
      );
    });
  }, [filter, query, snapshot.pastes]);

  const filterButtons: Array<{ key: FilterValue; label: string; count?: number }> = owner
    ? [
        { key: "all", label: "All" },
        { key: "public", label: "Public", count: filterCounts.public },
        { key: "unlisted", label: "Unlisted", count: filterCounts.unlisted },
        { key: "private", label: "Private", count: filterCounts.private },
        { key: "hidden", label: "Hidden", count: filterCounts.hidden },
        { key: "secret", label: "Secret", count: filterCounts.secret }
      ]
    : [{ key: "all", label: "Visible pastes" }];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="absolute inset-0 bg-hero-mesh opacity-35" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link className="text-foreground hover:underline" href="/">
            Home
          </Link>
          <span aria-hidden className="text-border">
            /
          </span>
          <span className="font-medium text-foreground">@{snapshot.profile.username}</span>
        </nav>

        <section className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/60 backdrop-blur-sm">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-8 lg:p-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start gap-4 sm:gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
                  {profileInitials(snapshot)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/10 bg-white/[0.04] text-foreground">User profile</Badge>
                    {owner ? <Badge className="border-primary/30 bg-primary/10 text-primary">Owner view</Badge> : null}
                  </div>
                  <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    {label}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">@{snapshot.profile.username}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Joined {joinedText}
                    </span>
                    {snapshot.publicStats.latestUpdateAt ? (
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Last public update {formatDistanceToNow(new Date(snapshot.publicStats.latestUpdateAt), { addSuffix: true })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {owner
                      ? "This is your public-facing paste index. You can also see your unlisted, private, and moderated-hidden entries here; other visitors only see active public pastes."
                      : "This page lists the public pastes shared from this account. Secret links, unlisted items, private entries, expired content, and moderated-hidden posts stay off the public profile."}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {owner ? (
                  <>
                    <Button asChild>
                      <Link href="/app">Open workspace</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/settings/account">Account settings</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild>
                      <Link href="/archive">Browse archive</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/quick">Quick paste</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {owner && snapshot.ownerStats ? (
                <>
                  <StatCard
                    detail="Active hosted pastes in your account library."
                    label="Active library"
                    value={snapshot.ownerStats.activePasteCount.toLocaleString()}
                  />
                  <StatCard
                    detail="Total views across active hosted pastes."
                    label="Views"
                    value={snapshot.ownerStats.totalViews.toLocaleString()}
                  />
                  <StatCard
                    detail="Active public entries visible on your profile."
                    label="Public"
                    value={snapshot.ownerStats.publicCount.toLocaleString()}
                  />
                  <StatCard
                    detail={`Unlisted ${snapshot.ownerStats.unlistedCount.toLocaleString()} · Private ${snapshot.ownerStats.privateCount.toLocaleString()} · Hidden ${snapshot.ownerStats.hiddenPasteCount.toLocaleString()}`}
                    label="Restricted"
                    value={(snapshot.ownerStats.unlistedCount + snapshot.ownerStats.privateCount + snapshot.ownerStats.hiddenPasteCount).toLocaleString()}
                  />
                </>
              ) : (
                <>
                  <StatCard
                    detail="Active public pastes currently listed on this profile."
                    label="Public pastes"
                    value={snapshot.publicStats.publicPasteCount.toLocaleString()}
                  />
                  <StatCard
                    detail="Combined views across those public pastes."
                    label="Public views"
                    value={snapshot.publicStats.totalViews.toLocaleString()}
                  />
                  <StatCard
                    detail="Account creation date on WOX-Bin."
                    label="Joined"
                    value={new Date(snapshot.profile.createdAt).toLocaleDateString()}
                  />
                  <StatCard
                    detail="Most recent public paste activity."
                    label="Latest activity"
                    value={
                      snapshot.publicStats.latestUpdateAt
                        ? formatDistanceToNow(new Date(snapshot.publicStats.latestUpdateAt), { addSuffix: true })
                        : "No public posts"
                    }
                  />
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Paste index</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {owner ? "Your hosted pastes" : "Public pastes"}
                    </h2>
                  </div>
                  <div className="w-full md:max-w-sm">
                    <Input
                      aria-label="Search profile pastes"
                      className="h-11 rounded-[1.25rem] border-border bg-card/80 px-4 text-sm"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={owner ? "Search title, URL, language, or category" : "Search public pastes"}
                      value={query}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterButtons.map((item) => (
                    <Button
                      className="rounded-full"
                      key={item.key}
                      onClick={() => setFilter(item.key)}
                      size="sm"
                      type="button"
                      variant={filter === item.key ? "default" : "ghost"}
                    >
                      {item.label}
                      {typeof item.count === "number" ? ` ${item.count.toLocaleString()}` : ""}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {filteredPastes.length === 0 ? (
              <div className="rounded-[1.8rem] border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
                No pastes matched the current search and filter.
              </div>
            ) : (
              <div className="glass-panel overflow-hidden">
                <div className="grid gap-3 p-4 sm:hidden">
                  {filteredPastes.map((paste) => (
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4" key={paste.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            className="line-clamp-2 font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                            href={getPasteSharePath(paste.slug, paste.secretMode)}
                          >
                            {paste.title?.trim() || "Untitled"}
                          </Link>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDate(paste.updatedAt)}</p>
                        </div>
                        <Badge className={visibilityTone(paste)}>{paste.status === "hidden" ? "Hidden" : paste.visibility}</Badge>
                      </div>
                      <div className="mt-3">
                        <ProfilePasteBadges paste={paste} />
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.2em]">Views</dt>
                          <dd className="mt-1 text-foreground">{paste.viewCount.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.2em]">Comments</dt>
                          <dd className="mt-1 text-foreground">{paste.commentsCount.toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] uppercase tracking-[0.2em]">Stars</dt>
                          <dd className="mt-1 text-foreground">{paste.stars.toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3 font-medium">Name / title</th>
                        <th className="px-4 py-3 font-medium">Visibility</th>
                        <th className="px-4 py-3 font-medium">Syntax</th>
                        <th className="px-4 py-3 font-medium">Updated</th>
                        <th className="px-4 py-3 font-medium">Views</th>
                        <th className="px-4 py-3 font-medium">Comments</th>
                        <th className="px-4 py-3 font-medium">Stars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPastes.map((paste) => (
                        <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.04]" key={paste.id}>
                          <td className="max-w-[28rem] px-5 py-4 align-top">
                            <Link
                              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                              href={getPasteSharePath(paste.slug, paste.secretMode)}
                            >
                              {paste.title?.trim() || "Untitled"}
                            </Link>
                            <div className="mt-2">
                              <ProfilePasteBadges paste={paste} />
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-muted-foreground">
                            {paste.status === "hidden" ? "Hidden" : paste.visibility}
                          </td>
                          <td className="px-4 py-4 align-top text-muted-foreground">{paste.language}</td>
                          <td className="whitespace-nowrap px-4 py-4 align-top text-muted-foreground" title={paste.updatedAt}>
                            {formatDistanceToNow(new Date(paste.updatedAt), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-4 align-top text-muted-foreground">{paste.viewCount.toLocaleString()}</td>
                          <td className="px-4 py-4 align-top text-muted-foreground">{paste.commentsCount.toLocaleString()}</td>
                          <td className="px-4 py-4 align-top text-muted-foreground">{paste.stars.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">What appears here</p>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="flex items-start gap-3">
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Public active pastes are visible to everyone and linked from shared pages when the author has a username.
                  </p>
                  <p className="flex items-start gap-3">
                    <FolderLock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Unlisted and private entries stay off the public view and only appear here for the signed-in owner.
                  </p>
                  <p className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Secret links, expired pastes, and deleted items are excluded from the public profile surface.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Summary</p>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Listed rows
                    </span>
                    <span className="font-medium text-foreground">{filteredPastes.length.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Total views
                    </span>
                    <span className="font-medium text-foreground">
                      {(owner && snapshot.ownerStats ? snapshot.ownerStats.totalViews : snapshot.publicStats.totalViews).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments shown
                    </span>
                    <span className="font-medium text-foreground">
                      {filteredPastes.reduce((total, paste) => total + paste.commentsCount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Stars shown
                    </span>
                    <span className="font-medium text-foreground">
                      {filteredPastes.reduce((total, paste) => total + paste.stars, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {snapshot.listTruncated ? (
                  <p className="rounded-[1.1rem] border border-border/70 bg-card/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    This page is capped to the most recent 200 pastes to keep it fast. Older entries still exist in the account library.
                  </p>
                ) : null}
                {owner ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/app">Manage in workspace</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/feed">Browse public feed</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}
