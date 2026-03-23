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
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  supportPriorityTone,
  supportStatusTone,
  type SupportTicketAttachment,
  type SupportTicketDetail
} from "@/lib/support";

type Props = {
  initialTickets: SupportTicketDetail[];
  initialSearch: string;
  initialStatus: string;
  viewerUserId: string;
};

function sortTickets(tickets: SupportTicketDetail[]) {
  return [...tickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

function upsertTicket(tickets: SupportTicketDetail[], ticket: SupportTicketDetail) {
  const next = tickets.filter((item) => item.id !== ticket.id);
  next.unshift(ticket);
  return sortTickets(next);
}

export function SupportDashboard({ initialTickets, initialSearch, initialStatus, viewerUserId }: Props) {
  const orderedInitialTickets = sortTickets(initialTickets);
  const [tickets, setTickets] = useState(() => orderedInitialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(orderedInitialTickets[0]?.id ?? null);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [priority, setPriority] = useState<(typeof SUPPORT_TICKET_PRIORITIES)[number]>(orderedInitialTickets[0]?.priority ?? "normal");
  const [status, setStatus] = useState<(typeof SUPPORT_TICKET_STATUSES)[number]>(orderedInitialTickets[0]?.status ?? "open");
  const [saveMetaLoading, setSaveMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaStatus, setMetaStatus] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<SupportTicketAttachment[]>([]);
  const [replyStatus, setReplyStatus] = useState<(typeof SUPPORT_TICKET_STATUSES)[number] | "">("");
  const [internalNote, setInternalNote] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyStatusMessage, setReplyStatusMessage] = useState<string | null>(null);
  const [replyPickerKey, setReplyPickerKey] = useState(0);

  const selectedTicket = useMemo(() => tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null, [selectedTicketId, tickets]);

  function syncTicketControls(ticket: SupportTicketDetail | null) {
    if (!ticket) {
      return;
    }
    setPriority(ticket.priority);
    setStatus(ticket.status);
    setMetaError(null);
    setMetaStatus(null);
    setReplyError(null);
    setReplyStatusMessage(null);
  }

  function handleSelectTicket(ticketId: string) {
    const ticket = tickets.find((item) => item.id === ticketId) ?? null;
    setSelectedTicketId(ticketId);
    syncTicketControls(ticket);
  }

  async function loadTickets(nextSearch = search, nextStatus = statusFilter) {
    setLoadingList(true);
    setListError(null);

    const params = new URLSearchParams();
    if (nextSearch.trim()) {
      params.set("q", nextSearch.trim());
    }
    if (nextStatus && nextStatus !== "all") {
      params.set("status", nextStatus);
    }

    const response = await fetch(`/api/staff/support/tickets?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as { error?: string; tickets?: SupportTicketDetail[] } | null;
    if (!response.ok || !payload?.tickets) {
      setListError(payload?.error ?? "Could not load support tickets.");
      setLoadingList(false);
      return;
    }

    const sorted = sortTickets(payload.tickets);
    const nextSelected = sorted.find((ticket) => ticket.id === selectedTicketId)?.id ?? sorted[0]?.id ?? null;
    setTickets(sorted);
    setSelectedTicketId(nextSelected);
    syncTicketControls(sorted.find((ticket) => ticket.id === nextSelected) ?? null);
    setLoadingList(false);
  }

  async function handleAttachmentInput(event: ChangeEvent<HTMLInputElement>) {
    try {
      const attachments = await filesToSupportAttachments(event.target.files);
      setReplyAttachments(attachments);
      setReplyError(null);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : "Could not load selected image.");
    }
  }

  async function handleMetaSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) {
      return;
    }

    setSaveMetaLoading(true);
    setMetaError(null);
    setMetaStatus(null);

    const response = await fetch(`/api/staff/support/tickets/${selectedTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        priority,
        assignedToUserId: selectedTicket.assignee?.id === viewerUserId ? viewerUserId : selectedTicket.assignee?.id ?? null
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setMetaError(payload?.error ?? "Could not update ticket.");
      setSaveMetaLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    syncTicketControls(payload.ticket);
    setMetaStatus("Ticket updated.");
    setSaveMetaLoading(false);
  }

  async function handleAssign(assignToSelf: boolean) {
    if (!selectedTicket) {
      return;
    }

    setSaveMetaLoading(true);
    setMetaError(null);
    setMetaStatus(null);

    const response = await fetch(`/api/staff/support/tickets/${selectedTicket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedToUserId: assignToSelf ? viewerUserId : null
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setMetaError(payload?.error ?? "Could not update assignee.");
      setSaveMetaLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    syncTicketControls(payload.ticket);
    setMetaStatus(assignToSelf ? "Assigned to you." : "Unassigned.");
    setSaveMetaLoading(false);
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) {
      return;
    }

    setReplyLoading(true);
    setReplyError(null);
    setReplyStatusMessage(null);

    const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: replyBody,
        attachments: replyAttachments,
        internalNote,
        status: replyStatus || undefined
      })
    });

    const payload = (await response.json().catch(() => null)) as { error?: string; ticket?: SupportTicketDetail } | null;
    if (!response.ok || !payload?.ticket) {
      setReplyError(payload?.error ?? "Could not send support reply.");
      setReplyLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    syncTicketControls(payload.ticket);
    setReplyBody("");
    setReplyAttachments([]);
    setReplyStatus("");
    setInternalNote(false);
    setReplyPickerKey((value) => value + 1);
    setReplyStatusMessage("Reply sent.");
    setReplyLoading(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Staff support</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Support dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Search by subject, ticket ID, user email, username, or paste slug. Staff replies can include screenshots and
              internal notes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Admin dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={(event) => void (event.preventDefault(), loadTickets())}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-staff-search">
                    Search
                  </label>
                  <Input
                    id="support-staff-search"
                    placeholder="Subject, ticket ID, email, username, paste slug"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-staff-status">
                    Status
                  </label>
                  <select
                    id="support-staff-status"
                    className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                    value={statusFilter}
                    onChange={(event) => {
                      const next = event.target.value;
                      setStatusFilter(next);
                      void loadTickets(search, next);
                    }}
                  >
                    <option value="all">All statuses</option>
                    {SUPPORT_TICKET_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {SUPPORT_STATUS_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button disabled={loadingList} type="submit">
                  {loadingList ? "Loading…" : "Refresh queue"}
                </Button>
              </form>

              {listError ? <p className="text-sm text-destructive">{listError}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Queue</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sorted by latest activity.</p>
                </div>
                <Badge>{tickets.length}</Badge>
              </div>
              {tickets.length ? (
                <SupportTicketList tickets={tickets} selectedTicketId={selectedTicket?.id ?? null} onSelect={handleSelectTicket} />
              ) : (
                <p className="text-sm text-muted-foreground">No matching tickets.</p>
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
                      #{selectedTicket.id.slice(0, 8).toUpperCase()} from {selectedTicket.owner?.label ?? "Unknown user"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={supportStatusTone(selectedTicket.status)}>{SUPPORT_STATUS_LABELS[selectedTicket.status]}</Badge>
                    <Badge className={supportPriorityTone(selectedTicket.priority)}>
                      {SUPPORT_PRIORITY_LABELS[selectedTicket.priority]}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">User</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.owner?.label ?? "Unknown user"}</p>
                    <p className="text-xs text-muted-foreground">{selectedTicket.owner?.email ?? "No email"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Assignee</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.assignee?.label ?? "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Paste</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.relatedPasteSlug ?? "None"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Last update</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{formatSupportTimestamp(selectedTicket.lastMessageAt)}</p>
                  </div>
                </div>

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleMetaSave(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">Ticket controls</p>
                    <p className="mt-1 text-sm text-muted-foreground">Adjust queue status and urgency without leaving the thread.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-ticket-status">
                        Status
                      </label>
                      <select
                        id="staff-ticket-status"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as (typeof SUPPORT_TICKET_STATUSES)[number])}
                      >
                        {SUPPORT_TICKET_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {SUPPORT_STATUS_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-ticket-priority">
                        Priority
                      </label>
                      <select
                        id="staff-ticket-priority"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={priority}
                        onChange={(event) => setPriority(event.target.value as (typeof SUPPORT_TICKET_PRIORITIES)[number])}
                      >
                        {SUPPORT_TICKET_PRIORITIES.map((value) => (
                          <option key={value} value={value}>
                            {SUPPORT_PRIORITY_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={saveMetaLoading} type="submit">
                      {saveMetaLoading ? "Saving…" : "Save controls"}
                    </Button>
                    <Button
                      disabled={saveMetaLoading}
                      type="button"
                      variant="outline"
                      onClick={() => void handleAssign(selectedTicket.assignee?.id !== viewerUserId)}
                    >
                      {selectedTicket.assignee?.id === viewerUserId ? "Unassign from me" : "Assign to me"}
                    </Button>
                  </div>

                  {metaError ? <p className="text-sm text-destructive">{metaError}</p> : null}
                  {metaStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{metaStatus}</p> : null}
                </form>

                <SupportThread ticket={selectedTicket} viewerIsStaff viewerUserId={viewerUserId} />

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleReply(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">Staff reply</p>
                    <p className="mt-1 text-sm text-muted-foreground">Reply publicly to the user, or mark the update as an internal note.</p>
                  </div>

                  <Textarea placeholder="Write your reply…" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-reply-status">
                        Reply status
                      </label>
                      <select
                        id="staff-reply-status"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={replyStatus}
                        onChange={(event) => setReplyStatus(event.target.value as (typeof SUPPORT_TICKET_STATUSES)[number] | "")}
                      >
                        <option value="">Automatic</option>
                        {SUPPORT_TICKET_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {SUPPORT_STATUS_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground">
                        <input checked={internalNote} type="checkbox" onChange={(event) => setInternalNote(event.target.checked)} />
                        Internal note only
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="staff-reply-images">
                      Attach images
                    </label>
                    <Input
                      key={replyPickerKey}
                      accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp"
                      id="staff-reply-images"
                      multiple
                      type="file"
                      onChange={(event) => void handleAttachmentInput(event)}
                    />
                  </div>

                  <SupportAttachmentPreview
                    attachments={replyAttachments}
                    onRemove={(index) => setReplyAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />

                  {replyError ? <p className="text-sm text-destructive">{replyError}</p> : null}
                  {replyStatusMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{replyStatusMessage}</p> : null}

                  <Button disabled={replyLoading} type="submit">
                    {replyLoading ? "Sending…" : internalNote ? "Save internal note" : "Send staff reply"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
                <p className="text-lg font-medium text-foreground">Select a support ticket</p>
                <p className="mt-2 text-sm text-muted-foreground">Ticket detail, thread history, and controls appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
