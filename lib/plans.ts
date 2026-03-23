const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const PLAN_IDS = ["free", "pro", "team", "admin"] as const;
export const PLAN_STATUS_IDS = ["active", "trialing", "past_due", "canceled"] as const;
export const PLAN_FEATURES = ["webhooks", "sharedWorkspaces", "auditExports", "customSlugs"] as const;
export const TEAM_ROLE_IDS = ["owner", "admin", "editor", "viewer"] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type PlanStatus = (typeof PLAN_STATUS_IDS)[number];
export type PlanFeature = (typeof PLAN_FEATURES)[number];
export type TeamRole = (typeof TEAM_ROLE_IDS)[number];
export type PlanLimitCode =
  | "hosted_pastes"
  | "storage"
  | "api_keys"
  | "files_per_paste"
  | "paste_size"
  | "webhooks"
  | "custom_slugs"
  | "team_workspaces";

export type PlanLimits = {
  hostedPastes: number;
  storageBytes: number;
  apiKeys: number;
  filesPerPaste: number;
  maxPasteBytes: number;
  versionHistory: number;
  anonymousClaimMerge: number;
};

export type UsageSnapshot = {
  pastes: number;
  pasteFiles: number;
  storageBytes: number;
  apiKeys: number;
  versions: number;
};

export type AccountPlanSummary = {
  plan: PlanId;
  effectivePlan: PlanId;
  /**
   * Plan used for hosted quotas (pastes, storage, API keys, attachment limits).
   * Can differ from `effectivePlan` for platform admins/moderators (see `resolveQuotaPlan`).
   */
  quotaPlan: PlanId;
  planStatus: PlanStatus;
  planExpiresAt: string | null;
  teamId: string | null;
  isPaid: boolean;
  limits: PlanLimits;
  features: Record<PlanFeature, boolean>;
  usage: UsageSnapshot;
};

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    hostedPastes: 250,
    storageBytes: 250 * MB,
    apiKeys: 1,
    filesPerPaste: 5,
    maxPasteBytes: 1 * MB,
    versionHistory: 10,
    anonymousClaimMerge: 25
  },
  pro: {
    hostedPastes: 5000,
    storageBytes: 10 * GB,
    apiKeys: 10,
    filesPerPaste: 25,
    maxPasteBytes: 10 * MB,
    versionHistory: 200,
    anonymousClaimMerge: 100
  },
  team: {
    hostedPastes: 25000,
    storageBytes: 100 * GB,
    apiKeys: 50,
    filesPerPaste: 50,
    maxPasteBytes: 25 * MB,
    versionHistory: 500,
    anonymousClaimMerge: 250
  },
  /** Operator / staff tier: very high limits; not sold via billing CTAs. */
  admin: {
    hostedPastes: 1_000_000,
    storageBytes: 1024 * GB,
    apiKeys: 500,
    filesPerPaste: 200,
    maxPasteBytes: 100 * MB,
    versionHistory: 10_000,
    anonymousClaimMerge: 10_000
  }
};

const FEATURE_ACCESS: Record<PlanFeature, PlanId[]> = {
  webhooks: ["pro", "team", "admin"],
  sharedWorkspaces: ["team", "admin"],
  auditExports: ["pro", "team", "admin"],
  customSlugs: ["pro", "team", "admin"]
};

export function getPlanLimits(plan: PlanId | null | undefined): PlanLimits {
  return PLAN_LIMITS[plan ?? "free"];
}

export function isPaidPlan(plan: PlanId | null | undefined) {
  return plan === "pro" || plan === "team" || plan === "admin";
}

export function canUseFeature(plan: PlanId | null | undefined, feature: PlanFeature) {
  return FEATURE_ACCESS[feature].includes(plan ?? "free");
}

export function formatPlanName(plan: PlanId) {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function formatPlanStatus(status: PlanStatus) {
  return status.replace("_", " ");
}

export function resolveEffectivePlan(options: {
  plan: PlanId | null | undefined;
  planStatus: PlanStatus | null | undefined;
}): PlanId {
  const requestedPlan = options.plan ?? "free";
  /** Operator-assigned tier; not tied to payment provider status. */
  if (requestedPlan === "admin") {
    return "admin";
  }
  if (requestedPlan === "free") {
    return "free";
  }

  if (options.planStatus === "active" || options.planStatus === "trialing") {
    return requestedPlan;
  }

  return "free";
}

/**
 * Which plan’s **hosted quotas** (pastes, storage, API keys, attachments) apply.
 * Platform **admin** and **moderator** roles default to the **`admin`** plan limits (operator tier).
 * Set **`ADMIN_QUOTA_PLAN`** to `free`, `pro`, `team`, or `admin` to override quotas for all staff.
 * Regular users with **`plan = admin`** in the database also receive **admin** quotas.
 */
export function resolveQuotaPlan(options: {
  effectivePlan: PlanId;
  role: "user" | "moderator" | "admin" | null | undefined;
}): PlanId {
  const role = options.role ?? "user";
  const raw =
    typeof process !== "undefined" ? (process.env.ADMIN_QUOTA_PLAN?.trim().toLowerCase() as PlanId | "") : "";

  if (role === "admin" || role === "moderator") {
    if (raw === "free" || raw === "pro" || raw === "team" || raw === "admin") {
      return resolveEffectivePlan({ plan: raw, planStatus: "active" });
    }
    return "admin";
  }

  if (options.effectivePlan === "admin") {
    return "admin";
  }

  return options.effectivePlan;
}

export class PlanLimitError extends Error {
  readonly code: PlanLimitCode;
  readonly plan: PlanId;
  readonly limit: number | boolean;
  readonly used: number | boolean;
  readonly feature?: PlanFeature;

  constructor(options: {
    code: PlanLimitCode;
    plan: PlanId;
    limit: number | boolean;
    used: number | boolean;
    message: string;
    feature?: PlanFeature;
  }) {
    super(options.message);
    this.name = "PlanLimitError";
    this.code = options.code;
    this.plan = options.plan;
    this.limit = options.limit;
    this.used = options.used;
    this.feature = options.feature;
  }
}
