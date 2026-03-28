"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UiLanguage } from "@/lib/i18n";
import {
  filesToSupportAttachments,
  formatSupportTimestamp,
  SupportAttachmentPreview,
  SupportThread,
  SupportTicketList
} from "@/components/support/support-shared";
import {
  SUPPORT_TICKET_CATEGORIES,
  supportStatusTone,
  type SupportTicketAttachment,
  type SupportTicketDetail
} from "@/lib/support";
import { SUPPORT_CENTER_COPY } from "@/lib/support-page-copy";

type Props = {
  initialTickets: SupportTicketDetail[];
  initialSelectedTicketId?: string | null;
  viewerUserId: string;
  viewerIsStaff: boolean;
  language: UiLanguage;
};

function sortTickets(tickets: SupportTicketDetail[]) {
  return [...tickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

function upsertTicket(tickets: SupportTicketDetail[], ticket: SupportTicketDetail) {
  const next = tickets.filter((item) => item.id !== ticket.id);
  next.unshift(ticket);
  return sortTickets(next);
}

export function SupportCenter({ initialTickets, initialSelectedTicketId, viewerUserId, viewerIsStaff, language }: Props) {
  const copy = SUPPORT_CENTER_COPY[language];
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
      const attachments = await filesToSupportAttachments(event.target.files, language);
      setter(attachments);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : copy.attachmentGenericError);
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
      setCreateError(payload?.error ?? copy.createError);
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
    setCreateStatus(copy.createdTicket);
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
      setReplyError(payload?.error ?? copy.replyError);
      setReplyLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    setReplyBody("");
    setReplyAttachments([]);
    setReplyPickerKey((value) => value + 1);
    setReplyStatus(copy.replySent);
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
      setActionError(payload?.error ?? copy.actionError);
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
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{copy.eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{copy.description}</p>
          </div>
          {viewerIsStaff ? (
            <Button asChild variant="outline">
              <Link href="/support/manage">{copy.staffDashboardCta}</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">{copy.newTicketTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.newTicketDescription}</p>
              </div>

              <form className="space-y-4" onSubmit={(event) => void handleCreateTicket(event)}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-subject">
                    {copy.subjectLabel}
                  </label>
                  <Input
                    id="support-subject"
                    maxLength={140}
                    placeholder={copy.subjectPlaceholder}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-category">
                    {copy.categoryLabel}
                  </label>
                  <select
                    id="support-category"
                    className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as (typeof SUPPORT_TICKET_CATEGORIES)[number])}
                  >
                    {SUPPORT_TICKET_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {copy.categoryLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-related-paste">
                    {copy.relatedPasteLabel}
                  </label>
                  <Input
                    id="support-related-paste"
                    maxLength={128}
                    placeholder={copy.relatedPastePlaceholder}
                    value={relatedPasteSlug}
                    onChange={(event) => setRelatedPasteSlug(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-body">
                    {copy.detailsLabel}
                  </label>
                  <Textarea
                    id="support-body"
                    placeholder={copy.detailsPlaceholder}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-images">
                    {copy.screenshotsLabel}
                  </label>
                  <Input
                    key={createPickerKey}
                    accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                    id="support-images"
                    multiple
                    type="file"
                    onChange={(event) => void handleAttachmentInput(event, setCreateAttachments, setCreateError)}
                  />
                  <p className="text-xs text-muted-foreground">{copy.screenshotsHint}</p>
                </div>

                <SupportAttachmentPreview
                  attachments={createAttachments}
                  language={language}
                  onRemove={(index) => setCreateAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                />

                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
                {createStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{createStatus}</p> : null}

                <Button disabled={createLoading} type="submit">
                  {createLoading ? copy.creatingTicket : copy.createTicket}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{copy.yourTicketsTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.yourTicketsDescription}</p>
                </div>
                <Badge>{tickets.length}</Badge>
              </div>
              {tickets.length ? (
                <SupportTicketList language={language} tickets={tickets} selectedTicketId={selectedTicketId} onSelect={setSelectedTicketId} />
              ) : (
                <p className="text-sm text-muted-foreground">{copy.noTickets}</p>
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
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{copy.ticketEyebrow}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">{selectedTicket.subject}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {copy.openedAt(selectedTicket.id.slice(0, 8).toUpperCase(), formatSupportTimestamp(selectedTicket.createdAt, language))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={supportStatusTone(selectedTicket.status)}>{copy.statusLabels[selectedTicket.status]}</Badge>
                    <Badge>{copy.categoryLabels[selectedTicket.category]}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.ownerLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.owner?.label ?? copy.unknownOwner}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.lastUpdateLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatSupportTimestamp(selectedTicket.lastMessageAt, language)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.messagesLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.messageCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.relatedPasteMetaLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.relatedPasteSlug ?? copy.none}</p>
                  </div>
                </div>

                {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

                <div className="flex flex-wrap gap-3">
                  {selectedTicket.status === "closed" ? (
                    <Button disabled={actionLoading} type="button" variant="outline" onClick={() => void handleTicketAction("reopen")}>
                      {actionLoading ? copy.updatingTicket : copy.reopenTicket}
                    </Button>
                  ) : (
                    <Button disabled={actionLoading} type="button" variant="outline" onClick={() => void handleTicketAction("close")}>
                      {actionLoading ? copy.updatingTicket : copy.closeTicket}
                    </Button>
                  )}
                </div>

                <SupportThread language={language} ticket={selectedTicket} viewerIsStaff={viewerIsStaff} viewerUserId={viewerUserId} />

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleReply(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.replyTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.replyDescription}</p>
                  </div>

                  <Textarea placeholder={copy.replyPlaceholder} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="support-reply-images">
                      {copy.attachImagesLabel}
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
                    language={language}
                    onRemove={(index) => setReplyAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />

                  {replyError ? <p className="text-sm text-destructive">{replyError}</p> : null}
                  {replyStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{replyStatus}</p> : null}

                  <Button disabled={replyLoading} type="submit">
                    {replyLoading ? copy.sendingReply : copy.sendReply}
                  </Button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
                <p className="text-lg font-medium text-foreground">{copy.selectTicketTitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">{copy.selectTicketDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
