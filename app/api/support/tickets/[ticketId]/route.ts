import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { getSupportTicketDetail, SupportError, updateSupportTicketForOwner } from "@/lib/support-service";
import { supportTicketOwnerActionSchema } from "@/lib/validators";

type Context = {
  params: Promise<{ ticketId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Not signed in.", 401);
  }

  const { ticketId } = await context.params;

  try {
    const ticket = await getSupportTicketDetail(ticketId, {
      id: session.user.id,
      role: session.user.role
    });

    if (!ticket) {
      return jsonError("Ticket not found.", 404);
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof SupportError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = supportTicketOwnerActionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid support ticket action.");
  }

  const { ticketId } = await context.params;

  try {
    const ticket = await updateSupportTicketForOwner({
      ticketId,
      userId: session.user.id,
      action: parsed.data.action,
      ip: getRequestIp(request)
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof SupportError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
