"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TeamRole } from "@/lib/plans";
import type { TeamSettingsSnapshot } from "@/lib/team-service";

type Props = {
  initial: TeamSettingsSnapshot;
};

export function TeamSettingsClient({ initial }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [selectedTeamId, setSelectedTeamId] = useState(initial.primaryTeamId ?? initial.teams[0]?.id ?? null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedTeam = useMemo(
    () => snapshot.teams.find((team) => team.id === selectedTeamId) ?? snapshot.teams[0] ?? null,
    [selectedTeamId, snapshot.teams]
  );
  const canManageSelectedTeam = selectedTeam ? selectedTeam.myRole === "owner" || selectedTeam.myRole === "admin" : false;

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/settings/team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        slug: String(form.get("slug") ?? "")
      })
    });

    const body = (await response.json().catch(() => null)) as TeamSettingsSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not create the team.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setSelectedTeamId(body.primaryTeamId ?? body.teams[0]?.id ?? null);
    setStatus("Created a new team workspace.");
    setLoading(false);
    event.currentTarget.reset();
  }

  async function setPrimary(teamId: string) {
    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch("/api/settings/team", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamId
      })
    });

    const body = (await response.json().catch(() => null)) as TeamSettingsSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not set the primary team.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setSelectedTeamId(teamId);
    setStatus("Updated your primary team.");
    setLoading(false);
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeam) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/settings/team/members?teamId=${encodeURIComponent(selectedTeam.id)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identifier: String(form.get("identifier") ?? ""),
        role: String(form.get("role") ?? "viewer")
      })
    });

    const body = (await response.json().catch(() => null)) as TeamSettingsSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not add the team member.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setStatus("Added a new team member.");
    setLoading(false);
    event.currentTarget.reset();
  }

  async function updateMemberRole(userId: string, role: TeamRole) {
    if (!selectedTeam) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/settings/team/members?teamId=${encodeURIComponent(selectedTeam.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        role
      })
    });

    const body = (await response.json().catch(() => null)) as TeamSettingsSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not update that member.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setStatus("Updated the team member role.");
    setLoading(false);
  }

  async function removeMember(userId: string) {
    if (!selectedTeam) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    const response = await fetch(`/api/settings/team/members?teamId=${encodeURIComponent(selectedTeam.id)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId
      })
    });

    const body = (await response.json().catch(() => null)) as TeamSettingsSnapshot & { error?: string };
    if (!response.ok) {
      setError(body?.error ?? "Could not remove that member.");
      setLoading(false);
      return;
    }

    setSnapshot(body);
    setStatus("Removed the team member.");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Team access</p>
              <h2 className="mt-2 text-2xl font-semibold">Team administration</h2>
            </div>
            <Badge
              className={
                snapshot.canCreateTeams
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  : "border-white/15 bg-transparent text-muted-foreground"
              }
            >
              {snapshot.canCreateTeams ? "Team plan unlocked" : "Team plan required"}
            </Badge>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">
            Create teams, choose a primary team, and manage members with owner, admin, editor, and viewer roles.
          </p>
          {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {snapshot.teams.length > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Published pastes from teammates</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse public and unlisted pastes owned by anyone on your teams (same visibility rules as the open web—private
                workspace drafts stay private).
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={selectedTeam ? `/settings/team/pastes?team=${encodeURIComponent(selectedTeam.id)}` : "/settings/team/pastes"}>
                Open team paste directory
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Your teams</p>
              <h3 className="mt-2 text-xl font-semibold">Memberships</h3>
            </div>
            {snapshot.teams.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                You are not a member of any teams yet.
              </div>
            ) : (
              <div className="space-y-3">
                {snapshot.teams.map((team) => (
                  <div
                    key={team.id}
                    className={`rounded-[1rem] border p-4 ${
                      selectedTeam?.id === team.id ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button className="text-left" onClick={() => setSelectedTeamId(team.id)} type="button">
                        <p className="font-medium text-foreground">{team.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          /{team.slug} • {team.memberCount} member{team.memberCount === 1 ? "" : "s"} • You are {team.myRole}
                        </p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {snapshot.primaryTeamId === team.id ? <Badge>Primary</Badge> : null}
                        <Button disabled={loading || snapshot.primaryTeamId === team.id} onClick={() => void setPrimary(team.id)} size="sm" type="button" variant="outline">
                          Make primary
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
              <div>
                <p className="font-medium text-foreground">Create a new team</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Team creation is available on the Team tier. Owners are added automatically.
                </p>
              </div>
              <form className="mt-4 space-y-3" onSubmit={createTeam}>
                <Input disabled={!snapshot.canCreateTeams || loading} name="name" placeholder="Team name" required />
                <Input disabled={!snapshot.canCreateTeams || loading} name="slug" placeholder="Optional team slug" />
                <Button disabled={!snapshot.canCreateTeams || loading} type="submit">
                  {loading ? "Working..." : "Create team"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Selected team</p>
              <h3 className="mt-2 text-xl font-semibold">{selectedTeam?.name ?? "No team selected"}</h3>
              {selectedTeam ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  /{selectedTeam.slug} • Team billing {selectedTeam.planStatus}
                </p>
              ) : null}
            </div>

            {selectedTeam ? (
              <>
                {canManageSelectedTeam ? (
                  <form className="space-y-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4" onSubmit={addMember}>
                    <div>
                      <p className="font-medium text-foreground">Add member</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Invite an existing WOX-Bin user by username or email.
                      </p>
                    </div>
                    <Input disabled={loading} name="identifier" placeholder="username or email" required />
                    <select className="h-11 w-full rounded-2xl border border-border bg-card/80 px-4 text-sm" defaultValue="viewer" name="role">
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                      {selectedTeam.myRole === "owner" ? <option value="owner">Owner</option> : null}
                    </select>
                    <Button disabled={loading} type="submit">
                      Add member
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                    You can view this team, but only owners and admins can manage members.
                  </div>
                )}

                <div className="space-y-3">
                  {selectedTeam.members.map((member) => (
                    <div key={member.userId} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{member.displayName || member.username || member.email || member.userId}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.username ? `@${member.username}` : member.email || "No public handle"} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {canManageSelectedTeam ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="h-9 rounded-full border border-border bg-card/80 px-3 text-xs"
                              onChange={(event) => void updateMemberRole(member.userId, event.target.value as TeamRole)}
                              value={member.role}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                              {selectedTeam.myRole === "owner" ? <option value="owner">Owner</option> : null}
                            </select>
                            <Button onClick={() => void removeMember(member.userId)} size="sm" type="button" variant="ghost">
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Badge className="capitalize">{member.role}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                Choose a team from the list to manage its members and primary team settings.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
