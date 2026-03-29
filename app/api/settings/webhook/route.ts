import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError, planLimitErrorResponse } from "@/lib/http";
import { SafeOutboundError } from "@/lib/safe-outbound";
import { getWebhookSettingsForUser, sendWebhookTestForUser, updateWebhookUrlForUser } from "@/lib/webhooks";
import { webhookSettingsSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const snapshot = await getWebhookSettingsForUser(session.user.id);
  return NextResponse.json(snapshot);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = webhookSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid webhook payload.");
  }

  try {
    const snapshot = await updateWebhookUrlForUser(session.user.id, parsed.data.webhookUrl.trim() || null);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof SafeOutboundError) {
      return jsonError(error.message, error.status);
    }
    return planLimitErrorResponse(error) ?? jsonError("Could not update webhook settings.", 500);
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const result = await sendWebhookTestForUser(session.user.id);
  if (!result.delivered) {
    return jsonError("Webhook test delivery failed.", 400, {
      reason: "reason" in result ? result.reason : "unknown"
    });
  }

  return NextResponse.json(result);
}
