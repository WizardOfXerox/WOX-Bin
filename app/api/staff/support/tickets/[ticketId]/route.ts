import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isStaffSession } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { SupportError, updateSupportTicketForStaff } from "@/lib/support-service";
import { supportTicketStaffUpdateSchema } from "@/lib/validators";

type Context = {
  params: Promise<{ ticketId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!isStaffSession(session)) {
    return jsonError("Staff access required.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = supportTicketStaffUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid support ticket update.");
  }

  const { ticketId } = await context.params;

  try {
    const ticket = await updateSupportTicketForStaff({
      ticketId,
      viewer: {
        id: session.user.id,
        role: session.user.role
      },
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedToUserId:
        parsed.data.assignedToUserId === undefined
          ? undefined
          : parsed.data.assignedToUserId === ""
            ? null
            : parsed.data.assignedToUserId,
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
