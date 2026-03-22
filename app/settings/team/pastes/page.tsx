import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { auth } from "@/auth";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTeamSettingsSnapshot, listTeamPublishedPastesForViewer } from "@/lib/team-service";
import { getUserPlanSummary } from "@/lib/usage-service";

export const metadata: Metadata = {
  title: "Team published pastes | WOX-Bin",
  description: "Public and unlisted pastes from members of your team workspaces."
};

type Props = {
  searchParams: Promise<{ team?: string }>;
};

function authorLabel(row: { authorDisplayName: string | null; authorUsername: string | null }) {
  return row.authorDisplayName || row.authorUsername || "Member";
}

export default async function TeamPastesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (!session.user.onboardingComplete || !session.user.username) {
    redirect("/account/onboarding");
  }

  const userId = session.user.id;
  const sp = await searchParams;
  const requestedTeamId = sp.team?.trim() || null;

  const [snapshot, plan] = await Promise.all([getTeamSettingsSnapshot(userId), getUserPlanSummary(userId)]);

  const teams = snapshot.teams;
  const teamId =
    requestedTeamId && teams.some((t) => t.id === requestedTeamId)
      ? requestedTeamId
      : (snapshot.primaryTeamId ?? teams[0]?.id ?? null);

  let pastes: Awaited<ReturnType<typeof listTeamPublishedPastesForViewer>> = [];
  let listError: string | null = null;

  if (teamId) {
    try {
      pastes = await listTeamPublishedPastesForViewer(userId, teamId, 150);
    } catch (e) {
      listError = e instanceof Error ? e.message : "Could not load team pastes.";
    }
  }

  const activeTeam = teams.find((t) => t.id === teamId) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <SettingsNav currentPath="/settings/team/pastes" plan={plan.plan} />

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Team workspace</p>
        <h1 className="text-3xl font-semibold">Published pastes from your team</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          This directory lists <strong className="font-medium text-foreground">public</strong> and{" "}
          <strong className="font-medium text-foreground">unlisted</strong> pastes owned by anyone on the selected team—so you can find
          what teammates have shared without hunting through each person&apos;s private workspace. Password-protected and private pastes
          are not shown.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-sm text-muted-foreground">
          You are not a member of any team yet. Ask an admin to invite you, or create a team from{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/settings/team">
            Team settings
          </Link>{" "}
          if your plan includes shared workspaces.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <Button
                asChild
                key={team.id}
                size="sm"
                type="button"
                variant={team.id === teamId ? "default" : "outline"}
              >
                <Link href={`/settings/team/pastes?team=${encodeURIComponent(team.id)}`}>{team.name}</Link>
              </Button>
            ))}
          </div>

          {listError ? (
            <p className="text-sm text-destructive">{listError}</p>
          ) : activeTeam ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Showing pastes for <span className="font-medium text-foreground">{activeTeam.name}</span> · Your role:{" "}
                <Badge className="capitalize border-white/20 bg-transparent">{activeTeam.myRole}</Badge>
              </p>

              {pastes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
                  No matching pastes yet. When teammates save pastes as <strong className="text-foreground">public</strong> or{" "}
                  <strong className="text-foreground">unlisted</strong>, they will show up here.
                </div>
              ) : (
                <div className="glass-panel overflow-hidden">
                  <div className="grid gap-3 p-4 sm:hidden">
                    {pastes.map((row) => (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={row.slug}>
                        <Link
                          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                          href={`/p/${row.slug}`}
                        >
                          {row.title?.trim() || "Untitled"}
                        </Link>
                        <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-between gap-3">
                            <dt>Author</dt>
                            <dd className="text-right">
                              {authorLabel(row)}
                              {row.authorUsername ? ` @${row.authorUsername}` : ""}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt>Visibility</dt>
                            <dd>
                              <Badge className="capitalize border-white/20 bg-transparent">{row.visibility}</Badge>
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt>Syntax</dt>
                            <dd className="text-right">
                              {row.language && row.language !== "none" ? row.language : "—"}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt>Updated</dt>
                            <dd className="text-right">
                              {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3 font-medium md:px-5">Title</th>
                          <th className="px-4 py-3 font-medium md:px-5">Author</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Visibility</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Syntax</th>
                          <th className="whitespace-nowrap px-4 py-3 font-medium md:px-5">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastes.map((row, index) => (
                          <tr
                            className={cn(
                              "border-b border-white/5 transition-colors hover:bg-white/[0.04]",
                              index === pastes.length - 1 && "border-b-0"
                            )}
                            key={row.slug}
                          >
                            <td className="max-w-[min(100vw,20rem)] px-4 py-3 md:px-5">
                              <Link
                                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                                href={`/p/${row.slug}`}
                              >
                                {row.title?.trim() || "Untitled"}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground md:px-5">
                              {authorLabel(row)}
                              {row.authorUsername ? (
                                <span className="ml-1 text-xs text-muted-foreground/80">@{row.authorUsername}</span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 md:px-5">
                              <Badge className="capitalize border-white/20 bg-transparent">{row.visibility}</Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground md:px-5">
                              {row.language && row.language !== "none" ? row.language : "—"}
                            </td>
                            <td
                              className="whitespace-nowrap px-4 py-3 text-muted-foreground md:px-5"
                              title={row.updatedAt}
                            >
                              {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-white/10 px-4 py-3 text-xs text-muted-foreground md:px-5">
                    {pastes.length} paste{pastes.length === 1 ? "" : "s"} · Open a row to view on the public paste page (unlisted
                    links work for anyone with the URL).
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
