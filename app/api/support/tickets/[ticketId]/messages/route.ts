import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/http";
import { getRequestIp } from "@/lib/request";
import { addSupportTicketMessage, SupportError } from "@/lib/support-service";
import { supportTicketReplySchema } from "@/lib/validators";

type Context = {
  params: Promise<{ ticketId: string }>;
};

export async function POST(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = supportTicketReplySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid support reply payload.");
  }

  const { ticketId } = await context.params;

  try {
    const ticket = await addSupportTicketMessage({
      ticketId,
      viewer: {
        id: session.user.id,
        role: session.user.role
      },
      content: parsed.data.content,
      attachments: parsed.data.attachments,
      internalNote: parsed.data.internalNote,
      status: parsed.data.status,
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
