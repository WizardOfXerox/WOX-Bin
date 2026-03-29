import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { PlanLimitError, formatPlanName } from "@/lib/plans";
import { assertSafePublicUrl, safeFetchPublicUrl, SafeOutboundError } from "@/lib/safe-outbound";
import { getUserPlanSummary } from "@/lib/usage-service";

type UserWebhookEvent =
  | "paste.created"
  | "paste.updated"
  | "paste.deleted"
  | "billing.plan_changed"
  | "team.created"
  | "team.member_added"
  | "team.member_updated"
  | "team.member_removed"
  | "webhook.test";

export async function getWebhookSettingsForUser(userId: string) {
  const [planSummary, user] = await Promise.all([
    getUserPlanSummary(userId),
    db
      .select({
        webhookUrl: users.webhookUrl
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  ]);

  return {
    webhookUrl: user[0]?.webhookUrl ?? null,
    available: planSummary.features.webhooks,
    plan: planSummary
  };
}

export async function updateWebhookUrlForUser(userId: string, webhookUrl: string | null) {
  const planSummary = await getUserPlanSummary(userId);
  if (webhookUrl && !planSummary.features.webhooks) {
    throw new PlanLimitError({
      code: "webhooks",
      feature: "webhooks",
      plan: planSummary.effectivePlan,
      limit: true,
      used: false,
      message: `${formatPlanName(planSummary.effectivePlan)} accounts do not include outgoing webhooks. Upgrade to Pro or Team to enable them.`
    });
  }

  const normalizedWebhookUrl = webhookUrl
    ? (await assertSafePublicUrl(webhookUrl, "Webhook URL")).toString()
    : null;

  await db
    .update(users)
    .set({
      webhookUrl: normalizedWebhookUrl,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  await logAudit({
    actorUserId: userId,
    action: normalizedWebhookUrl ? "webhook.updated" : "webhook.cleared",
    targetType: "user",
    targetId: userId
  });

  return getWebhookSettingsForUser(userId);
}

export async function dispatchUserWebhook(
  userId: string,
  event: UserWebhookEvent,
  data: Record<string, unknown>
) {
  const [planSummary, user] = await Promise.all([
    getUserPlanSummary(userId),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        webhookUrl: users.webhookUrl
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  ]);

  const targetUser = user[0];
  if (!targetUser?.webhookUrl || !planSummary.features.webhooks) {
    return {
      delivered: false,
      reason: !planSummary.features.webhooks ? "feature_unavailable" : "missing_url"
    } as const;
  }

  try {
    const { response } = await safeFetchPublicUrl(targetUser.webhookUrl, {
      method: "POST",
      label: "Webhook URL",
      maxRedirects: 0,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event,
        occurredAt: new Date().toISOString(),
        user: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName
        },
        data
      }),
      signal: AbortSignal.timeout(5000)
    });

    await logAudit({
      actorUserId: userId,
      action: response.ok ? "webhook.delivered" : "webhook.failed",
      targetType: "webhook",
      targetId: targetUser.webhookUrl,
      metadata: {
        event,
        status: response.status
      }
    });

    return {
      delivered: response.ok,
      status: response.status
    } as const;
  } catch (error) {
    const errorMessage = error instanceof SafeOutboundError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Unknown webhook error";
    await logAudit({
      actorUserId: userId,
      action: "webhook.failed",
      targetType: "webhook",
      targetId: targetUser.webhookUrl,
      metadata: {
        event,
        error: errorMessage
      }
    });

    return {
      delivered: false,
      reason: error instanceof SafeOutboundError ? "unsafe_url" : "request_failed"
    } as const;
  }
}

export async function sendWebhookTestForUser(userId: string) {
  return dispatchUserWebhook(userId, "webhook.test", {
    message: "WOX-Bin webhook test event",
    source: "settings"
  });
}
