import { and, asc, count, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { pastes, teamMembers, teams, users } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { type PlanId, type TeamRole, PlanLimitError, formatPlanName } from "@/lib/plans";
import { getUserPlanSummary } from "@/lib/usage-service";
import { randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/utils";
import { dispatchUserWebhook } from "@/lib/webhooks";

export type TeamMemberSummary = {
  userId: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  role: TeamRole;
  joinedAt: string;
};

export type TeamSummary = {
  id: string;
  name: string;
  slug: string;
  plan: PlanId;
  planStatus: "active" | "trialing" | "past_due" | "canceled";
  memberCount: number;
  myRole: TeamRole;
  createdAt: string;
  members: TeamMemberSummary[];
};

export type TeamSettingsSnapshot = {
  canCreateTeams: boolean;
  primaryTeamId: string | null;
  teams: TeamSummary[];
};

function canManageTeam(role: TeamRole) {
  return role === "owner" || role === "admin";
}

function canAssignRole(actorRole: TeamRole, nextRole: TeamRole) {
  if (actorRole === "owner") {
    return true;
  }

  return nextRole === "editor" || nextRole === "viewer";
}

async function ensureUniqueTeamSlug(desired: string) {
  const base = slugify(desired);
  let candidate = base;

  for (let index = 0; index < 5; index += 1) {
    const existing = await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, candidate)).limit(1);
    if (!existing[0]) {
      return candidate;
    }

    candidate = `${base}-${randomToken().slice(0, 6)}`;
  }

  return `${base}-${randomToken().slice(0, 10)}`;
}

async function countOwners(teamId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "owner")));

  return row?.count ?? 0;
}

async function getMembership(userId: string, teamId: string) {
  const [membership] = await db
    .select({
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return membership ?? null;
}

async function getPrimaryTeamId(userId: string) {
  const [user] = await db
    .select({
      teamId: users.teamId
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.teamId ?? null;
}

async function syncPrimaryTeamId(userId: string) {
  const currentPrimaryTeamId = await getPrimaryTeamId(userId);
  if (!currentPrimaryTeamId) {
    return;
  }

  const [membership] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, currentPrimaryTeamId)))
    .limit(1);

  if (membership) {
    return;
  }

  const [nextMembership] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .orderBy(asc(teamMembers.createdAt))
    .limit(1);

  await db
    .update(users)
    .set({
      teamId: nextMembership?.teamId ?? null,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

export async function getTeamSettingsSnapshot(userId: string): Promise<TeamSettingsSnapshot> {
  const [planSummary, primaryTeamId, memberships] = await Promise.all([
    getUserPlanSummary(userId),
    getPrimaryTeamId(userId),
    db
      .select({
        teamId: teamMembers.teamId,
        myRole: teamMembers.role,
        name: teams.name,
        slug: teams.slug,
        plan: teams.plan,
        planStatus: teams.planStatus,
        createdAt: teams.createdAt
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId))
      .orderBy(asc(teams.createdAt))
  ]);

  const teamIds = memberships.map((entry) => entry.teamId);
  const memberCounts =
    teamIds.length === 0
      ? []
      : await db
          .select({
            teamId: teamMembers.teamId,
            count: count()
          })
          .from(teamMembers)
          .where(inArray(teamMembers.teamId, teamIds))
          .groupBy(teamMembers.teamId);

  const membersByTeam =
    teamIds.length === 0
      ? []
      : await db
          .select({
            teamId: teamMembers.teamId,
            userId: users.id,
            username: users.username,
            email: users.email,
            displayName: users.displayName,
            role: teamMembers.role,
            createdAt: teamMembers.createdAt
          })
          .from(teamMembers)
          .innerJoin(users, eq(users.id, teamMembers.userId))
          .where(inArray(teamMembers.teamId, teamIds))
          .orderBy(asc(teamMembers.createdAt));

  return {
    canCreateTeams: planSummary.features.sharedWorkspaces,
    primaryTeamId,
    teams: memberships.map((entry) => ({
      id: entry.teamId,
      name: entry.name,
      slug: entry.slug,
      plan: entry.plan,
      planStatus: entry.planStatus,
      memberCount: memberCounts.find((countEntry) => countEntry.teamId === entry.teamId)?.count ?? 0,
      myRole: entry.myRole,
      createdAt: entry.createdAt.toISOString(),
      members: membersByTeam
        .filter((member) => member.teamId === entry.teamId)
        .map((member) => ({
          userId: member.userId,
          username: member.username,
          email: member.email,
          displayName: member.displayName,
          role: member.role,
          joinedAt: member.createdAt.toISOString()
        }))
    }))
  };
}

export async function createTeamForUser(userId: string, input: { name: string; slug?: string | null }) {
  const planSummary = await getUserPlanSummary(userId);
  if (!planSummary.features.sharedWorkspaces) {
    throw new PlanLimitError({
      code: "team_workspaces",
      feature: "sharedWorkspaces",
      plan: planSummary.effectivePlan,
      limit: true,
      used: false,
      message: `${formatPlanName(planSummary.effectivePlan)} accounts cannot create shared team workspaces. Upgrade to Team to unlock them.`
    });
  }

  const teamId = randomToken("team");
  const slug = await ensureUniqueTeamSlug(input.slug || input.name);

  await db.insert(teams).values({
    id: teamId,
    name: input.name.trim(),
    slug,
    createdByUserId: userId,
    plan: "team",
    planStatus: "active",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db.insert(teamMembers).values({
    teamId,
    userId,
    role: "owner",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db
    .update(users)
    .set({
      teamId,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  await logAudit({
    actorUserId: userId,
    action: "team.created",
    targetType: "team",
    targetId: teamId,
    metadata: {
      slug
    }
  });

  await dispatchUserWebhook(userId, "team.created", {
    teamId,
    slug,
    name: input.name.trim()
  });

  return getTeamSettingsSnapshot(userId);
}

export async function setPrimaryTeamForUser(userId: string, teamId: string | null) {
  if (teamId) {
    const membership = await getMembership(userId, teamId);
    if (!membership) {
      throw new Error("You are not a member of that team.");
    }
  }

  await db
    .update(users)
    .set({
      teamId,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  await logAudit({
    actorUserId: userId,
    action: "team.primary_changed",
    targetType: "team",
    targetId: teamId ?? "none"
  });

  return getTeamSettingsSnapshot(userId);
}

export async function addTeamMemberByIdentifier(
  actorUserId: string,
  teamId: string,
  input: { identifier: string; role: TeamRole }
) {
  const actorMembership = await getMembership(actorUserId, teamId);
  if (!actorMembership || !canManageTeam(actorMembership.role)) {
    throw new Error("You do not have permission to manage this team.");
  }

  if (!canAssignRole(actorMembership.role, input.role)) {
    throw new Error("Only team owners can assign that role.");
  }

  const identifier = input.identifier.toLowerCase();
  const [targetUser] = await db
    .select({
      id: users.id,
      teamId: users.teamId
    })
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);

  if (!targetUser) {
    throw new Error("No existing user matched that username or email.");
  }

  const [existingMembership] = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUser.id)))
    .limit(1);

  if (existingMembership) {
    throw new Error("That user is already on the team.");
  }

  await db.insert(teamMembers).values({
    teamId,
    userId: targetUser.id,
    role: input.role,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  if (!targetUser.teamId) {
    await db
      .update(users)
      .set({
        teamId,
        updatedAt: new Date()
      })
      .where(eq(users.id, targetUser.id));
  }

  await logAudit({
    actorUserId,
    action: "team.member_added",
    targetType: "team_member",
    targetId: `${teamId}:${targetUser.id}`,
    metadata: {
      role: input.role
    }
  });

  await dispatchUserWebhook(actorUserId, "team.member_added", {
    teamId,
    targetUserId: targetUser.id,
    role: input.role
  });

  return getTeamSettingsSnapshot(actorUserId);
}

export async function updateTeamMemberRole(
  actorUserId: string,
  teamId: string,
  input: { userId: string; role: TeamRole }
) {
  const actorMembership = await getMembership(actorUserId, teamId);
  if (!actorMembership || !canManageTeam(actorMembership.role)) {
    throw new Error("You do not have permission to manage this team.");
  }

  if (!canAssignRole(actorMembership.role, input.role)) {
    throw new Error("Only team owners can assign that role.");
  }

  const [membership] = await db
    .select({
      role: teamMembers.role
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, input.userId)))
    .limit(1);

  if (!membership) {
    throw new Error("That team member was not found.");
  }

  if (membership.role === "owner" && input.role !== "owner" && (await countOwners(teamId)) <= 1) {
    throw new Error("A team must keep at least one owner.");
  }

  await db
    .update(teamMembers)
    .set({
      role: input.role,
      updatedAt: new Date()
    })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, input.userId)));

  await logAudit({
    actorUserId,
    action: "team.member_updated",
    targetType: "team_member",
    targetId: `${teamId}:${input.userId}`,
    metadata: {
      role: input.role
    }
  });

  await dispatchUserWebhook(actorUserId, "team.member_updated", {
    teamId,
    targetUserId: input.userId,
    role: input.role
  });

  return getTeamSettingsSnapshot(actorUserId);
}

export async function removeTeamMember(actorUserId: string, teamId: string, userId: string) {
  const actorMembership = await getMembership(actorUserId, teamId);
  if (!actorMembership || !canManageTeam(actorMembership.role)) {
    throw new Error("You do not have permission to manage this team.");
  }

  const [membership] = await db
    .select({
      role: teamMembers.role
    })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new Error("That team member was not found.");
  }

  if (actorMembership.role !== "owner" && membership.role !== "viewer" && membership.role !== "editor") {
    throw new Error("Only team owners can remove admins or owners.");
  }

  if (membership.role === "owner" && (await countOwners(teamId)) <= 1) {
    throw new Error("A team must keep at least one owner.");
  }

  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  await syncPrimaryTeamId(userId);

  await logAudit({
    actorUserId,
    action: "team.member_removed",
    targetType: "team_member",
    targetId: `${teamId}:${userId}`
  });

  await dispatchUserWebhook(actorUserId, "team.member_removed", {
    teamId,
    targetUserId: userId
  });

  return getTeamSettingsSnapshot(actorUserId);
}

/** Public + unlisted pastes owned by members of a team (password-free, active). For team directory UI. */
export type TeamPublishedPasteRow = {
  slug: string;
  title: string;
  language: string;
  visibility: "public" | "unlisted";
  updatedAt: string;
  authorUserId: string | null;
  authorUsername: string | null;
  authorDisplayName: string | null;
};

export async function listTeamPublishedPastesForViewer(
  viewerUserId: string,
  teamId: string,
  limit = 120
): Promise<TeamPublishedPasteRow[]> {
  const membership = await getMembership(viewerUserId, teamId);
  if (!membership) {
    throw new Error("You are not a member of this team.");
  }

  const memberRows = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const memberIds = memberRows.map((row) => row.userId);
  if (memberIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      slug: pastes.slug,
      title: pastes.title,
      language: pastes.language,
      visibility: pastes.visibility,
      updatedAt: pastes.updatedAt,
      authorUserId: pastes.userId,
      authorUsername: users.username,
      authorDisplayName: users.displayName
    })
    .from(pastes)
    .leftJoin(users, eq(users.id, pastes.userId))
    .where(
      and(
        inArray(pastes.userId, memberIds),
        inArray(pastes.visibility, ["public", "unlisted"]),
        eq(pastes.status, "active"),
        isNull(pastes.deletedAt),
        isNull(pastes.passwordHash),
        isNotNull(pastes.userId)
      )
    )
    .orderBy(desc(pastes.updatedAt))
    .limit(limit);

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    language: row.language,
    visibility: row.visibility as TeamPublishedPasteRow["visibility"],
    updatedAt: row.updatedAt.toISOString(),
    authorUserId: row.authorUserId,
    authorUsername: row.authorUsername,
    authorDisplayName: row.authorDisplayName
  }));
}
