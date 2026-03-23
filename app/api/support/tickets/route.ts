import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getRequestIp } from "@/lib/request";
import { createSupportTicket, listSupportTicketsForUser, SupportError } from "@/lib/support-service";
import { jsonError } from "@/lib/http";
import { supportTicketCreateSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Not signed in.", 401);
  }

  const tickets = await listSupportTicketsForUser(session.user.id);
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return jsonError("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = supportTicketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid support ticket payload.");
  }

  try {
    const ticket = await createSupportTicket({
      viewer: {
        id: session.user.id,
        role: session.user.role
      },
      subject: parsed.data.subject,
      category: parsed.data.category,
      relatedPasteSlug: parsed.data.relatedPasteSlug,
      content: parsed.data.content,
      attachments: parsed.data.attachments,
      ip: getRequestIp(request)
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof SupportError) {
      return jsonError(error.message, error.status);
    }
    throw error;
  }
}
