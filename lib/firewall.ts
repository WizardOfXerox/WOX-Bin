import { checkRateLimit } from "@vercel/firewall";

export type EdgeRateLimitResult = {
  configured: boolean;
  rateLimited: boolean;
};

const DEFAULT_SHARED_EDGE_RATE_LIMIT_RULE_ID = "settings-account";

type RawEdgeRateLimitResult = {
  configured: boolean;
  missing: boolean;
  rateLimited: boolean;
};

function getSharedEdgeRateLimitRuleId() {
  const configuredRuleId = process.env.VERCEL_FIREWALL_SHARED_RULE_ID?.trim();
  return configuredRuleId || DEFAULT_SHARED_EDGE_RATE_LIMIT_RULE_ID;
}

async function runEdgeRateLimitCheck(
  ruleId: string,
  request: Request,
  rateLimitKey?: string | null
): Promise<RawEdgeRateLimitResult> {
  try {
    const result = await checkRateLimit(ruleId, {
      request,
      ...(rateLimitKey ? { rateLimitKey } : {})
    });

    return {
      configured: result.error !== "not-found",
      missing: result.error === "not-found",
      rateLimited: Boolean(result.rateLimited)
    };
  } catch {
    return {
      configured: false,
      missing: false,
      rateLimited: false
    };
  }
}

export async function checkEdgeRateLimit(
  ruleId: string,
  request: Request,
  rateLimitKey?: string | null
): Promise<EdgeRateLimitResult> {
  if (process.env.VERCEL !== "1") {
    return { configured: false, rateLimited: false };
  }

  const primaryResult = await runEdgeRateLimitCheck(ruleId, request, rateLimitKey);
  if (primaryResult.configured) {
    return {
      configured: true,
      rateLimited: primaryResult.rateLimited
    };
  }

  const sharedRuleId = getSharedEdgeRateLimitRuleId();
  if (!primaryResult.missing || sharedRuleId === ruleId) {
    return { configured: false, rateLimited: false };
  }

  const sharedResult = await runEdgeRateLimitCheck(sharedRuleId, request, rateLimitKey);
  if (!sharedResult.configured) {
    return { configured: false, rateLimited: false };
  }

  return {
    configured: true,
    rateLimited: sharedResult.rateLimited
  };
}
