import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, teamMembers, users } from "@/lib/db/schema";
import { env } from "@/lib/env";

export const DISCORD_LINKED_ROLE_METADATA_RECORDS = [
  {
    key: "plan_tier",
    name: "Plan tier",
    description: "WOX-Bin plan level. Free=0, Pro=1, Team=2, Admin=3.",
    type: 2
  },
  {
    key: "staff_level",
    name: "Staff level",
    description: "WOX-Bin staff level. User=0, Moderator=1, Admin=2.",
    type: 2
  },
  {
    key: "email_verified",
    name: "Email verified",
    description: "Whether the linked WOX-Bin account has a verified email.",
    type: 7
  },
  {
    key: "profile_ready",
    name: "Profile ready",
    description: "Whether the WOX-Bin account has completed onboarding.",
    type: 7
  },
  {
    key: "account_created_at",
    name: "Account age",
    description: "When the WOX-Bin account was created.",
    type: 6
  }
] as const;

export type DiscordLinkedRolesMetadataRecord = (typeof DISCORD_LINKED_ROLE_METADATA_RECORDS)[number];

export type DiscordLinkedRoleValues = {
  plan_tier: number;
  staff_level: number;
  email_verified: number;
  profile_ready: number;
  account_created_at: string;
};

export type DiscordLinkedRolesAdminSummary = {
  oauthReady: boolean;
  metadataSyncReady: boolean;
  connectedAccountCount: number;
  metadataRecords: DiscordLinkedRolesMetadataRecord[];
};

export type DiscordLinkedRolesUserSnapshot = {
  signedIn: boolean;
  oauthReady: boolean;
  metadataSyncReady: boolean;
  connected: boolean;
  hasRoleConnectionsWriteScope: boolean;
  appConfigured: boolean;
  botTokenConfigured: boolean;
  user: {
    username: string | null;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean;
    plan: "free" | "pro" | "team" | "admin";
    role: "user" | "moderator" | "admin";
    onboardingComplete: boolean;
    teamCount: number;
    createdAt: string;
  } | null;
  discordAccount: {
    providerAccountId: string;
    username: string | null;
    globalName: string | null;
  } | null;
  metadataRecords: DiscordLinkedRolesMetadataRecord[];
  metadataValues: DiscordLinkedRoleValues | null;
  remoteConnection: {
    platformName: string | null;
    platformUsername: string | null;
    metadata: Record<string, number | string>;
  } | null;
};

type DiscordAccountRow = {
  providerAccountId: string;
  accessToken: string | null;
  scope: string | null;
};

type DiscordUserProfile = {
  id: string;
  username: string;
  global_name?: string | null;
};

type DiscordRoleConnectionObject = {
  platform_name?: string | null;
  platform_username?: string | null;
  metadata?: Record<string, number | string>;
};

function hasDiscordOauthConfig() {
  return Boolean(env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET);
}

function hasMetadataSyncConfig() {
  return Boolean(String(process.env.DISCORD_APPLICATION_ID ?? "").trim() && String(process.env.DISCORD_BOT_TOKEN ?? "").trim());
}

function mapPlanTier(plan: "free" | "pro" | "team" | "admin") {
  switch (plan) {
    case "pro":
      return 1;
    case "team":
      return 2;
    case "admin":
      return 3;
    default:
      return 0;
  }
}

function mapStaffLevel(role: "user" | "moderator" | "admin") {
  switch (role) {
    case "moderator":
      return 1;
    case "admin":
      return 2;
    default:
      return 0;
  }
}

function hasRoleConnectionsWriteScope(scope: string | null | undefined) {
  return String(scope ?? "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .includes("role_connections.write");
}

async function getDiscordAccountForUser(userId: string): Promise<DiscordAccountRow | null> {
  const [account] = await db
    .select({
      providerAccountId: accounts.providerAccountId,
      accessToken: accounts.access_token,
      scope: accounts.scope
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.provider, "discord")))
    .limit(1);

  if (!account) {
    return null;
  }

  return {
    providerAccountId: account.providerAccountId,
    accessToken: account.accessToken ?? null,
    scope: account.scope ?? null
  };
}

async function fetchDiscordUserProfile(accessToken: string): Promise<DiscordUserProfile | null> {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DiscordUserProfile;
}

async function fetchDiscordRoleConnection(
  accessToken: string,
  applicationId: string
): Promise<DiscordRoleConnectionObject | null> {
  const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${applicationId}/role-connection`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DiscordRoleConnectionObject;
}

export function buildDiscordLinkedRoleValues(input: {
  plan: "free" | "pro" | "team" | "admin";
  role: "user" | "moderator" | "admin";
  emailVerified: boolean;
  onboardingComplete: boolean;
  createdAt: Date;
}): DiscordLinkedRoleValues {
  return {
    plan_tier: mapPlanTier(input.plan),
    staff_level: mapStaffLevel(input.role),
    email_verified: input.emailVerified ? 1 : 0,
    profile_ready: input.onboardingComplete ? 1 : 0,
    account_created_at: input.createdAt.toISOString()
  };
}

export async function getDiscordLinkedRolesAdminSummary(): Promise<DiscordLinkedRolesAdminSummary> {
  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)::int`
    })
    .from(accounts)
    .where(eq(accounts.provider, "discord"));

  return {
    oauthReady: hasDiscordOauthConfig(),
    metadataSyncReady: hasMetadataSyncConfig(),
    connectedAccountCount: count,
    metadataRecords: [...DISCORD_LINKED_ROLE_METADATA_RECORDS]
  };
}

export async function getDiscordLinkedRolesUserSnapshot(
  userId: string | null | undefined
): Promise<DiscordLinkedRolesUserSnapshot> {
  if (!userId) {
    return {
      signedIn: false,
      oauthReady: hasDiscordOauthConfig(),
      metadataSyncReady: hasMetadataSyncConfig(),
      connected: false,
      hasRoleConnectionsWriteScope: false,
      appConfigured: Boolean(String(process.env.DISCORD_APPLICATION_ID ?? "").trim()),
      botTokenConfigured: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
      user: null,
      discordAccount: null,
      metadataRecords: [...DISCORD_LINKED_ROLE_METADATA_RECORDS],
      metadataValues: null,
      remoteConnection: null
    };
  }

  const [user, discordAccount, teamCountRow] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        username: true,
        displayName: true,
        email: true,
        emailVerified: true,
        plan: true,
        role: true,
        onboardingComplete: true,
        createdAt: true
      }
    }),
    getDiscordAccountForUser(userId),
    db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .then((rows) => rows[0] ?? { count: 0 })
  ]);

  if (!user) {
    return {
      signedIn: false,
      oauthReady: hasDiscordOauthConfig(),
      metadataSyncReady: hasMetadataSyncConfig(),
      connected: false,
      hasRoleConnectionsWriteScope: false,
      appConfigured: Boolean(String(process.env.DISCORD_APPLICATION_ID ?? "").trim()),
      botTokenConfigured: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
      user: null,
      discordAccount: null,
      metadataRecords: [...DISCORD_LINKED_ROLE_METADATA_RECORDS],
      metadataValues: null,
      remoteConnection: null
    };
  }

  const metadataValues = buildDiscordLinkedRoleValues({
    plan: user.plan,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt
  });

  let discordProfile: DiscordUserProfile | null = null;
  let remoteConnection: DiscordRoleConnectionObject | null = null;
  const accessToken = discordAccount?.accessToken?.trim() || "";
  const applicationId = String(process.env.DISCORD_APPLICATION_ID ?? "").trim();

  if (accessToken) {
    discordProfile = await fetchDiscordUserProfile(accessToken).catch(() => null);
    if (applicationId) {
      remoteConnection = await fetchDiscordRoleConnection(accessToken, applicationId).catch(() => null);
    }
  }

  return {
    signedIn: true,
    oauthReady: hasDiscordOauthConfig(),
    metadataSyncReady: hasMetadataSyncConfig(),
    connected: Boolean(discordAccount),
    hasRoleConnectionsWriteScope: hasRoleConnectionsWriteScope(discordAccount?.scope),
    appConfigured: Boolean(applicationId),
    botTokenConfigured: Boolean(String(process.env.DISCORD_BOT_TOKEN ?? "").trim()),
    user: {
      username: user.username ?? null,
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      emailVerified: Boolean(user.emailVerified),
      plan: user.plan,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      teamCount: teamCountRow.count,
      createdAt: user.createdAt.toISOString()
    },
    discordAccount: discordAccount
      ? {
          providerAccountId: discordAccount.providerAccountId,
          username: discordProfile?.username ?? null,
          globalName: discordProfile?.global_name ?? null
        }
      : null,
    metadataRecords: [...DISCORD_LINKED_ROLE_METADATA_RECORDS],
    metadataValues,
    remoteConnection: remoteConnection
      ? {
          platformName: remoteConnection.platform_name ?? null,
          platformUsername: remoteConnection.platform_username ?? null,
          metadata: remoteConnection.metadata ?? {}
        }
      : null
  };
}

export async function syncDiscordApplicationRoleMetadata() {
  const applicationId = String(process.env.DISCORD_APPLICATION_ID ?? "").trim();
  const botToken = String(process.env.DISCORD_BOT_TOKEN ?? "").trim();
  if (!applicationId || !botToken) {
    throw new Error("Discord application metadata sync is not configured on this deployment.");
  }

  const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/role-connections/metadata`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(DISCORD_LINKED_ROLE_METADATA_RECORDS),
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Discord application linked-role metadata sync failed with HTTP ${response.status}${errorText ? `: ${errorText}` : "."}`
    );
  }

  return (await response.json()) as DiscordLinkedRolesMetadataRecord[];
}

export async function syncDiscordLinkedRoleConnection(userId: string) {
  const snapshot = await getDiscordLinkedRolesUserSnapshot(userId);
  if (!snapshot.signedIn || !snapshot.user) {
    throw new Error("You must be signed in to sync Discord linked roles.");
  }
  if (!snapshot.connected) {
    throw new Error("Connect your Discord account to WOX-Bin before syncing linked roles.");
  }
  if (!snapshot.hasRoleConnectionsWriteScope) {
    throw new Error("Reconnect Discord so WOX-Bin can request the role_connections.write scope.");
  }

  const account = await getDiscordAccountForUser(userId);
  const accessToken = account?.accessToken?.trim() || "";
  if (!accessToken) {
    throw new Error("This Discord connection no longer has an access token. Reconnect Discord and try again.");
  }

  await syncDiscordApplicationRoleMetadata();

  const applicationId = String(process.env.DISCORD_APPLICATION_ID ?? "").trim();
  const platformUsername =
    snapshot.user.displayName ?? snapshot.user.username ?? snapshot.discordAccount?.globalName ?? snapshot.user.email ?? "WOX-Bin user";
  const payload = {
    platform_name: "WOX-Bin",
    platform_username: platformUsername,
    metadata: snapshot.metadataValues ?? {}
  };

  const response = await fetch(`https://discord.com/api/v10/users/@me/applications/${applicationId}/role-connection`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Discord linked-role sync failed with HTTP ${response.status}${errorText ? `: ${errorText}` : "."}`
    );
  }

  const remoteConnection = (await response.json()) as DiscordRoleConnectionObject;

  return {
    snapshot,
    remoteConnection: {
      platformName: remoteConnection.platform_name ?? null,
      platformUsername: remoteConnection.platform_username ?? null,
      metadata: remoteConnection.metadata ?? {}
    }
  };
}
