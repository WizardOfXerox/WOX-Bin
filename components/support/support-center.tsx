"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  filesToSupportAttachments,
  formatSupportTimestamp,
  SupportAttachmentPreview,
  SupportThread,
  SupportTicketList
} from "@/components/support/support-shared";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_STATUS_LABELS,
  supportStatusTone,
  type SupportTicketAttachment,
  type SupportTicketDetail
} from "@/lib/support";

type Props = {
  initialTickets: SupportTicketDetail[];
  initialSelectedTicketId?: string | null;
  viewerUserId: string;
  viewerIsStaff: boolean;
};

function sortTickets(tickets: SupportTicketDetail[]) {
  return [...tickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

function upsertTicket(tickets: SupportTicketDetail[], ticket: SupportTicketDetail) {
  const next = tickets.filter((item) => item.id !== ticket.id);
  next.unshift(ticket);
  return sortTickets(next);
}

export function SupportCenter({ initialTickets, initialSelectedTicketId, viewerUserId, viewerIsStaff }: Props) {
  const [tickets, setTickets] = useState(() => sortTickets(initialTickets));
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialSelectedTicketId && initialTickets.some((ticket) => ticket.id === initialSelectedTicketId)
      ? initialSelectedTicketId
      : initialTickets[0]?.id ?? null
  );

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof SUPPORT_TICKET_CATEGORIES)[number]>("account");
  const [relatedPasteSlug, setRelatedPasteSlug] = useState("");
  const [body, setBody] = useState("");
  const [createAttachments, setCreateAttachments] = useState<SupportTicketAttachment[]>([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createPickerKey, setCreatePickerKey] = useState(0);

  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<SupportTicketAttachment[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const [replyPickerKey, setReplyPickerKey] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets]
  );

  async function handleAttachmentInput(
    event: ChangeEvent<HTMLInputElement>,
    setter: (attachments: SupportTicketAttachment[]) => void,
    onError: (message: string | null) => void
  ) {
    try {
      const attachments = await filesToSupportAttachments(event.target.files);
      setter(attachments);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not load selected image.");
    }
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateStatus(null);

    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        category,
        relatedPasteSlug: relatedPasteSlug.trim() || null,
        content: body,
        attachments: createAttachments
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setCreateError(payload?.error ?? "Could not create support ticket.");
      setCreateLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    setSelectedTicketId(payload.ticket.id);
    setSubject("");
    setCategory("account");
    setRelatedPasteSlug("");
    setBody("");
    setCreateAttachments([]);
    setCreatePickerKey((value) => value + 1);
    setCreateStatus("Support ticket created.");
    setCreateLoading(false);
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) {
      return;
    }

    setReplyLoading(true);
    setReplyError(null);
    setReplyStatus(null);

    const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: replyBody,
        attachments: replyAttachments
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setReplyError(payload?.error ?? "Could not send support reply.");
      setReplyLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    setReplyBody("");
    setReplyAttachments([]);
    setReplyPickerKey((value) => value + 1);
    setReplyStatus("Reply sent.");
    setReplyLoading(false);
  }

  async function handleTicketAction(action: "close" | "reopen") {
    if (!selectedTicket) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const response = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setActionError(payload?.error ?? "Could not update ticket.");
      setActionLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    setActionLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Support</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Internal ticketing</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Open a ticket for account problems, moderation disputes, paste issues, or bugs. Every reply stays attached to
              the same thread, and image attachments are supported for screenshots.
            </p>
          </div>
          {viewerIsStaff ? (
            <Button asChild variant="outline">
              <Link href="/support/manage">Open staff dashboard</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">New ticket</p>
                <p className="mt-1 text-sm text-muted-foreground">Start with the issue summary, then add details and screenshots.</p>
              </div>

              <form className="space-y-4" onSubmit={(event) => void handleCreateTicket(event)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-subject">
                    Subject
                  </label>
                  <Input
                    id="support-subject"
                    maxLength={140}
                    placeholder="Example: Sign-in loop after password reset"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-category">
                    Category
                  </label>
                  <select
                    id="support-category"
                    className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as (typeof SUPPORT_TICKET_CATEGORIES)[number])}
                  >
                    {SUPPORT_TICKET_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {SUPPORT_CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-related-paste">
                    Related paste slug
                  </label>
                  <Input
                    id="support-related-paste"
                    maxLength={128}
                    placeholder="Optional"
                    value={relatedPasteSlug}
                    onChange={(event) => setRelatedPasteSlug(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-body">
                    Details
                  </label>
                  <Textarea
                    id="support-body"
                    placeholder="Describe the issue, what you expected, what happened instead, and the exact error text if you have it."
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-images">
                    Screenshots
                  </label>
                  <Input
                    key={createPickerKey}
                    accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                    id="support-images"
                    multiple
                    type="file"
                    onChange={(event) => void handleAttachmentInput(event, setCreateAttachments, setCreateError)}
                  />
                  <p className="text-xs text-muted-foreground">Up to 4 images. Max 3 MB each.</p>
                </div>

                <SupportAttachmentPreview
                  attachments={createAttachments}
                  onRemove={(index) => setCreateAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                />

                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
                {createStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{createStatus}</p> : null}

                <Button disabled={createLoading} type="submit">
                  {createLoading ? "Creating…" : "Create ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Your tickets</p>
                  <p className="mt-1 text-sm text-muted-foreground">Open, resolved, and closed threads stay here.</p>
                </div>
                <Badge>{tickets.length}</Badge>
              </div>
              {tickets.length ? (
                <SupportTicketList tickets={tickets} selectedTicketId={selectedTicketId} onSelect={setSelectedTicketId} />
              ) : (
                <p className="text-sm text-muted-foreground">No tickets yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardContent className="space-y-5">
            {selectedTicket ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Ticket</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">{selectedTicket.subject}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      #{selectedTicket.id.slice(0, 8).toUpperCase()} opened {formatSupportTimestamp(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={supportStatusTone(selectedTicket.status)}>
                      {SUPPORT_STATUS_LABELS[selectedTicket.status]}
                    </Badge>
                    <Badge>{SUPPORT_CATEGORY_LABELS[selectedTicket.category]}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Owner</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.owner?.label ?? "Unknown user"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last update</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatSupportTimestamp(selectedTicket.lastMessageAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Messages</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.messageCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Related paste</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.relatedPasteSlug ?? "None"}</p>
                  </div>
                </div>

                {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

                <div className="flex flex-wrap gap-3">
                  {selectedTicket.status === "closed" ? (
                    <Button disabled={actionLoading} type="button" variant="outline" onClick={() => void handleTicketAction("reopen")}>
                      {actionLoading ? "Updating…" : "Reopen ticket"}
                    </Button>
                  ) : (
                    <Button disabled={actionLoading} type="button" variant="outline" onClick={() => void handleTicketAction("close")}>
                      {actionLoading ? "Updating…" : "Close ticket"}
                    </Button>
                  )}
                </div>

                <SupportThread ticket={selectedTicket} viewerIsStaff={viewerIsStaff} viewerUserId={viewerUserId} />

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleReply(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">Reply</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add context, follow-up details, or screenshots.</p>
                  </div>

                  <Textarea
                    placeholder="Write your reply…"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="support-reply-images">
                      Attach images
                    </label>
                    <Input
                      key={replyPickerKey}
                      accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                      id="support-reply-images"
                      multiple
                      type="file"
                      onChange={(event) => void handleAttachmentInput(event, setReplyAttachments, setReplyError)}
                    />
                  </div>

                  <SupportAttachmentPreview
                    attachments={replyAttachments}
                    onRemove={(index) => setReplyAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />

                  {replyError ? <p className="text-sm text-destructive">{replyError}</p> : null}
                  {replyStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{replyStatus}</p> : null}

                  <Button disabled={replyLoading} type="submit">
                    {replyLoading ? "Sending…" : "Send reply"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
                <p className="text-lg font-medium text-foreground">Select a ticket</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your message thread, screenshots, and ticket status will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
