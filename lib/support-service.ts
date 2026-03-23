import { asc, desc, eq, inArray } from "drizzle-orm";

import { buildSupportTicketCreatedEmail, buildSupportTicketReplyEmail, buildSupportTicketStatusEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mail";
import { db } from "@/lib/db";
import { supportMessages, supportTickets, users } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import type {
  SupportActor,
  SupportTicketAttachment,
  SupportTicketCategory,
  SupportTicketDetail,
  SupportTicketPriority,
  SupportTicketStatus
} from "@/lib/support";

type SupportViewer = {
  id: string;
  role: "user" | "moderator" | "admin";
};

type CreateSupportTicketInput = {
  viewer: SupportViewer;
  subject: string;
  category: SupportTicketCategory;
  relatedPasteSlug?: string | null;
  content: string;
  attachments: SupportTicketAttachment[];
  ip?: string | null;
};

type AddSupportMessageInput = {
  ticketId: string;
  viewer: SupportViewer;
  content: string;
  attachments: SupportTicketAttachment[];
  internalNote?: boolean;
  status?: SupportTicketStatus;
  ip?: string | null;
};

type UpdateSupportTicketOwnerInput = {
  ticketId: string;
  userId: string;
  action: "close" | "reopen";
  ip?: string | null;
};

type UpdateSupportTicketStaffInput = {
  ticketId: string;
  viewer: SupportViewer;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assignedToUserId?: string | null;
  ip?: string | null;
};

type ListStaffSupportTicketInput = {
  q?: string;
  status?: SupportTicketStatus | "all";
};

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: "user" | "moderator" | "admin";
};

type RawTicketRow = {
  id: string;
  userId: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  relatedPasteSlug: string | null;
  assignedToUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};

type RawMessageRow = {
  id: string;
  ticketId: string;
  authorUserId: string | null;
  authorRole: "user" | "moderator" | "admin";
  content: string;
  internalNote: boolean;
  attachments: SupportTicketAttachment[];
  createdAt: Date;
};

export class SupportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function isStaffRole(role: SupportViewer["role"] | UserRow["role"]) {
  return role === "moderator" || role === "admin";
}

function displayActor(row: UserRow | undefined | null): SupportActor | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    label: row.displayName ?? row.username ?? row.email ?? "Unknown user",
    username: row.username,
    email: row.email
  };
}

async function getUserMap(userIds: Iterable<string | null | undefined>) {
  const ids = Array.from(new Set(Array.from(userIds).filter((value): value is string => Boolean(value))));
  if (ids.length === 0) {
    return new Map<string, UserRow>();
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role
    })
    .from(users)
    .where(inArray(users.id, ids));

  return new Map(rows.map((row) => [row.id, row]));
}

async function getMessageRowsForTickets(ticketIds: string[]) {
  if (ticketIds.length === 0) {
    return [] as RawMessageRow[];
  }

  return db
    .select({
      id: supportMessages.id,
      ticketId: supportMessages.ticketId,
      authorUserId: supportMessages.authorUserId,
      authorRole: supportMessages.authorRole,
      content: supportMessages.content,
      internalNote: supportMessages.internalNote,
      attachments: supportMessages.attachments,
      createdAt: supportMessages.createdAt
    })
    .from(supportMessages)
    .where(inArray(supportMessages.ticketId, ticketIds))
    .orderBy(asc(supportMessages.createdAt));
}

function buildSummariesFromRows(
  ticketRows: RawTicketRow[],
  messageRows: RawMessageRow[],
  userMap: Map<string, UserRow>,
  includeInternalNotes: boolean
) {
  const messagesByTicket = new Map<string, RawMessageRow[]>();
  for (const row of messageRows) {
    if (!includeInternalNotes && row.internalNote) {
      continue;
    }
    const bucket = messagesByTicket.get(row.ticketId) ?? [];
    bucket.push(row);
    messagesByTicket.set(row.ticketId, bucket);
  }

  const details: SupportTicketDetail[] = ticketRows.map((ticket) => {
    const visibleMessages = messagesByTicket.get(ticket.id) ?? [];
    const lastMessage = visibleMessages[visibleMessages.length - 1] ?? null;
    const renderedMessages = visibleMessages.map((message) => ({
      id: message.id,
      author: displayActor(message.authorUserId ? userMap.get(message.authorUserId) : null),
      authorRole: message.authorRole,
      content: message.content,
      internalNote: message.internalNote,
      attachments: message.attachments ?? [],
      createdAt: message.createdAt.toISOString()
    }));

    return {
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      relatedPasteSlug: ticket.relatedPasteSlug,
      owner: displayActor(userMap.get(ticket.userId)),
      assignee: displayActor(ticket.assignedToUserId ? userMap.get(ticket.assignedToUserId) : null),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      messageCount: renderedMessages.length,
      lastMessagePreview: lastMessage ? lastMessage.content.slice(0, 180) : null,
      messages: renderedMessages
    };
  });

  return details;
}

async function loadTicketDetails(ticketRows: RawTicketRow[], includeInternalNotes: boolean): Promise<SupportTicketDetail[]> {
  if (ticketRows.length === 0) {
    return [];
  }

  const ticketIds = ticketRows.map((ticket) => ticket.id);
  const messageRows = await getMessageRowsForTickets(ticketIds);
  const userMap = await getUserMap([
    ...ticketRows.map((ticket) => ticket.userId),
    ...ticketRows.map((ticket) => ticket.assignedToUserId),
    ...messageRows.map((message) => message.authorUserId)
  ]);

  return buildSummariesFromRows(ticketRows, messageRows, userMap, includeInternalNotes);
}

function applyTicketStatusDates(
  status: SupportTicketStatus,
  now: Date,
  current?: { resolvedAt?: Date | null; closedAt?: Date | null }
) {
  return {
    resolvedAt: status === "resolved" ? now : status === "closed" ? current?.resolvedAt ?? null : null,
    closedAt: status === "closed" ? now : null
  };
}

async function sendSupportMail(
  userId: string,
  builder:
    | ReturnType<typeof buildSupportTicketCreatedEmail>
    | ReturnType<typeof buildSupportTicketReplyEmail>
    | ReturnType<typeof buildSupportTicketStatusEmail>
) {
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.email) {
    return;
  }

  await sendMail({
    to: user.email,
    subject: builder.subject,
    text: builder.text,
    html: builder.html
  });
}

function requireStaff(viewer: SupportViewer) {
  if (!isStaffRole(viewer.role)) {
    throw new SupportError("Staff access required.", 403);
  }
}

async function getRawTicket(ticketId: string) {
  const [ticket] = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      relatedPasteSlug: supportTickets.relatedPasteSlug,
      assignedToUserId: supportTickets.assignedToUserId,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      lastMessageAt: supportTickets.lastMessageAt
    })
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  return ticket ?? null;
}

export async function listSupportTicketsForUser(userId: string) {
  const ticketRows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      relatedPasteSlug: supportTickets.relatedPasteSlug,
      assignedToUserId: supportTickets.assignedToUserId,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      lastMessageAt: supportTickets.lastMessageAt
    })
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(100);

  return loadTicketDetails(ticketRows, false);
}

export async function getSupportTicketDetail(ticketId: string, viewer: SupportViewer) {
  const ticket = await getRawTicket(ticketId);
  if (!ticket) {
    return null;
  }
  if (!isStaffRole(viewer.role) && ticket.userId !== viewer.id) {
    throw new SupportError("Ticket not found.", 404);
  }

  const [detail] = await loadTicketDetails([ticket], isStaffRole(viewer.role));
  return detail ?? null;
}

export async function listSupportTicketsForStaff(input: ListStaffSupportTicketInput) {
  const ticketRows = await db
    .select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      category: supportTickets.category,
      priority: supportTickets.priority,
      status: supportTickets.status,
      relatedPasteSlug: supportTickets.relatedPasteSlug,
      assignedToUserId: supportTickets.assignedToUserId,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      lastMessageAt: supportTickets.lastMessageAt
    })
    .from(supportTickets)
    .where(input.status && input.status !== "all" ? eq(supportTickets.status, input.status) : undefined)
    .orderBy(desc(supportTickets.lastMessageAt))
    .limit(300);

  const summaries = await loadTicketDetails(ticketRows, true);
  const q = input.q?.trim().toLowerCase();
  if (!q) {
    return summaries;
  }

  return summaries.filter((ticket) => {
    const haystack = [
      ticket.id,
      ticket.subject,
      ticket.relatedPasteSlug,
      ticket.owner?.label,
      ticket.owner?.email,
      ticket.owner?.username,
      ticket.lastMessagePreview
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  const now = new Date();
  const relatedPasteSlug = input.relatedPasteSlug?.trim() || null;
  const ticket = await db.transaction(async (tx) => {
    const [createdTicket] = await tx
      .insert(supportTickets)
      .values({
        userId: input.viewer.id,
        subject: input.subject.trim(),
        category: input.category,
        relatedPasteSlug,
        status: "open",
        priority: "normal",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now
      })
      .returning({
        id: supportTickets.id
      });

    await tx.insert(supportMessages).values({
      ticketId: createdTicket.id,
      authorUserId: input.viewer.id,
      authorRole: input.viewer.role,
      content: input.content.trim(),
      attachments: input.attachments,
      internalNote: false,
      createdAt: now
    });

    return createdTicket;
  });

  await logAudit({
    actorUserId: input.viewer.id,
    action: "support.ticket.created",
    targetType: "support_ticket",
    targetId: ticket.id,
    ip: input.ip,
    metadata: {
      category: input.category,
      relatedPasteSlug,
      attachmentCount: input.attachments.length
    }
  });

  await sendSupportMail(
    input.viewer.id,
    buildSupportTicketCreatedEmail({
      ticketId: ticket.id,
      subject: input.subject.trim(),
      status: "open",
      details: [
        relatedPasteSlug ? `Related paste: ${relatedPasteSlug}` : "",
        input.attachments.length ? `Attachments: ${input.attachments.length} image(s)` : ""
      ]
    })
  );

  return getSupportTicketDetail(ticket.id, input.viewer);
}

export async function addSupportTicketMessage(input: AddSupportMessageInput) {
  const ticket = await getRawTicket(input.ticketId);
  if (!ticket) {
    throw new SupportError("Ticket not found.", 404);
  }

  const viewerIsStaff = isStaffRole(input.viewer.role);
  if (!viewerIsStaff && ticket.userId !== input.viewer.id) {
    throw new SupportError("Ticket not found.", 404);
  }
  if (input.internalNote && !viewerIsStaff) {
    throw new SupportError("Internal notes require staff access.", 403);
  }

  const now = new Date();
  const nextStatus = (() => {
    if (viewerIsStaff) {
      if (input.internalNote) {
        return input.status ?? ticket.status;
      }
      return input.status ?? "waiting_on_user";
    }
    if (ticket.status === "closed" || ticket.status === "resolved" || ticket.status === "waiting_on_user") {
      return "open" as const;
    }
    return "open" as const;
  })();

  const dates = applyTicketStatusDates(nextStatus, now);

  await db.transaction(async (tx) => {
    await tx.insert(supportMessages).values({
      ticketId: ticket.id,
      authorUserId: input.viewer.id,
      authorRole: input.viewer.role,
      content: input.content.trim(),
      attachments: input.attachments,
      internalNote: Boolean(input.internalNote),
      createdAt: now
    });

    await tx
      .update(supportTickets)
      .set({
        status: nextStatus,
        updatedAt: now,
        lastMessageAt: now,
        resolvedAt: dates.resolvedAt,
        closedAt: dates.closedAt
      })
      .where(eq(supportTickets.id, ticket.id));
  });

  await logAudit({
    actorUserId: input.viewer.id,
    action: viewerIsStaff
      ? input.internalNote
        ? "support.ticket.internal_note_added"
        : "support.ticket.staff_replied"
      : "support.ticket.user_replied",
    targetType: "support_ticket",
    targetId: ticket.id,
    ip: input.ip,
    metadata: {
      status: nextStatus,
      attachmentCount: input.attachments.length,
      internalNote: Boolean(input.internalNote)
    }
  });

  if (viewerIsStaff && !input.internalNote) {
    await sendSupportMail(
      ticket.userId,
      buildSupportTicketReplyEmail({
        ticketId: ticket.id,
        subject: ticket.subject,
        status: nextStatus,
        details: [
          input.attachments.length ? `Staff attached ${input.attachments.length} image(s).` : "",
          nextStatus !== ticket.status ? `Status updated to ${nextStatus.replace(/_/g, " ")}.` : ""
        ]
      })
    );
  }

  const detail = await getSupportTicketDetail(ticket.id, input.viewer);
  if (!detail) {
    throw new SupportError("Ticket not found.", 404);
  }
  return detail;
}

export async function updateSupportTicketForOwner(input: UpdateSupportTicketOwnerInput) {
  const ticket = await getRawTicket(input.ticketId);
  if (!ticket || ticket.userId !== input.userId) {
    throw new SupportError("Ticket not found.", 404);
  }

  const now = new Date();
  const nextStatus = input.action === "close" ? "closed" : "open";
  const dates = applyTicketStatusDates(nextStatus, now);

  await db
    .update(supportTickets)
    .set({
      status: nextStatus,
      updatedAt: now,
      resolvedAt: dates.resolvedAt,
      closedAt: dates.closedAt
    })
    .where(eq(supportTickets.id, ticket.id));

  await logAudit({
    actorUserId: input.userId,
    action: input.action === "close" ? "support.ticket.closed_by_user" : "support.ticket.reopened_by_user",
    targetType: "support_ticket",
    targetId: ticket.id,
    ip: input.ip,
    metadata: {
      status: nextStatus
    }
  });

  const detail = await getSupportTicketDetail(ticket.id, { id: input.userId, role: "user" });
  if (!detail) {
    throw new SupportError("Ticket not found.", 404);
  }
  return detail;
}

export async function updateSupportTicketForStaff(input: UpdateSupportTicketStaffInput) {
  requireStaff(input.viewer);

  const ticket = await getRawTicket(input.ticketId);
  if (!ticket) {
    throw new SupportError("Ticket not found.", 404);
  }

  let assignedToUserId = ticket.assignedToUserId;
  if (input.assignedToUserId !== undefined) {
    assignedToUserId = input.assignedToUserId || null;
    if (assignedToUserId) {
      const [assignee] = await db
        .select({
          id: users.id,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, assignedToUserId))
        .limit(1);

      if (!assignee || !isStaffRole(assignee.role)) {
        throw new SupportError("Assignee must be an existing moderator or admin.", 400);
      }
    }
  }

  const nextStatus = input.status ?? ticket.status;
  const now = new Date();
  const dates = applyTicketStatusDates(nextStatus, now);

  await db
    .update(supportTickets)
    .set({
      status: nextStatus,
      priority: input.priority ?? ticket.priority,
      assignedToUserId,
      updatedAt: now,
      resolvedAt: dates.resolvedAt,
      closedAt: dates.closedAt
    })
    .where(eq(supportTickets.id, ticket.id));

  await logAudit({
    actorUserId: input.viewer.id,
    action: "support.ticket.staff_updated",
    targetType: "support_ticket",
    targetId: ticket.id,
    ip: input.ip,
    metadata: {
      status: nextStatus,
      priority: input.priority ?? ticket.priority,
      assignedToUserId
    }
  });

  if (input.status && input.status !== ticket.status) {
    await sendSupportMail(
      ticket.userId,
      buildSupportTicketStatusEmail({
        ticketId: ticket.id,
        subject: ticket.subject,
        status: nextStatus,
        details: [`Status changed from ${ticket.status.replace(/_/g, " ")} to ${nextStatus.replace(/_/g, " ")}.`]
      })
    );
  }

  const detail = await getSupportTicketDetail(ticket.id, input.viewer);
  if (!detail) {
    throw new SupportError("Ticket not found.", 404);
  }
  return detail;
}
