import { env } from "@/lib/env";
import { type AccountPlanSummary, type PlanId, type PlanStatus, formatPlanName } from "@/lib/plans";

export type BillingLinks = {
  proUpgradeUrl: string | null;
  teamUpgradeUrl: string | null;
  billingPortalUrl: string | null;
};

export type BillingPlanCard = {
  id: PlanId;
  name: string;
  headline: string;
  description: string;
  highlights: string[];
};

export type BillingOverview = {
  currentPlan: PlanId;
  currentStatus: PlanStatus;
  effectivePlan: PlanId;
  links: BillingLinks;
  plans: BillingPlanCard[];
};

/** Public + settings UI: keep in sync with `TIER-PLAN.md` limits. */
export const BILLING_PLAN_CARDS: BillingPlanCard[] = [
  {
    id: "free",
    name: "Free",
    headline: "Local-first plus a generous hosted starter",
    description: "Best for personal snippets, basic sharing, and account-backed sync.",
    highlights: ["250 hosted pastes", "250 MB storage", "1 API key", "10 saved versions per paste"]
  },
  {
    id: "pro",
    name: "Pro",
    headline: "Time-boxed access for heavier publishing and automation",
    description: "Buy a 30-day or yearly pass when you need custom URLs, larger uploads, more API keys, and deeper version retention.",
    highlights: ["5,000 hosted pastes", "10 GB storage", "10 API keys + custom URLs", "Webhooks + 200 versions"]
  },
  {
    id: "team",
    name: "Team",
    headline: "Shared administration with a renewable team pass",
    description: "Use a monthly or annual team pass for pooled storage, shared workspaces, custom URLs, and collaboration controls.",
    highlights: ["100 GB pooled storage", "50 pooled API keys", "Member roles + custom URLs", "Team administration"]
  }
];

export function getBillingLinks(): BillingLinks {
  return {
    proUpgradeUrl: env.NEXT_PUBLIC_PRO_UPGRADE_URL ?? null,
    teamUpgradeUrl: env.NEXT_PUBLIC_TEAM_UPGRADE_URL ?? null,
    billingPortalUrl: env.NEXT_PUBLIC_BILLING_PORTAL_URL ?? null
  };
}

export function getBillingOverview(plan: AccountPlanSummary): BillingOverview {
  return {
    currentPlan: plan.plan,
    currentStatus: plan.planStatus,
    effectivePlan: plan.effectivePlan,
    links: getBillingLinks(),
    plans: [...BILLING_PLAN_CARDS]
  };
}

export function getBillingUpgradeUrl(plan: PlanId) {
  const links = getBillingLinks();

  if (plan === "admin") {
    return null;
  }

  if (plan === "pro") {
    return links.proUpgradeUrl;
  }

  if (plan === "team") {
    return links.teamUpgradeUrl;
  }

  return null;
}

export function describeBillingState(plan: AccountPlanSummary) {
  const statusPhrase = plan.planStatus.replace(/_/g, " ");

  if (plan.plan !== plan.effectivePlan) {
    let msg = `${formatPlanName(plan.plan)} billing is ${statusPhrase}; feature access follows ${formatPlanName(plan.effectivePlan)}.`;
    if (plan.quotaPlan !== plan.effectivePlan) {
      msg += ` Personal hosted quotas use ${formatPlanName(plan.quotaPlan)}.`;
    }
    return msg;
  }

  if (plan.quotaPlan !== plan.effectivePlan) {
    return `${formatPlanName(plan.effectivePlan)} billing is ${statusPhrase}. Personal hosted quotas use ${formatPlanName(plan.quotaPlan)} (operator default).`;
  }

  return `${formatPlanName(plan.effectivePlan)} billing is ${statusPhrase}.`;
}
