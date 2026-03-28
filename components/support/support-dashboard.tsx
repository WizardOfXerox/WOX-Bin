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
  SUPPORT_TICKET_PRIORITIES,
  SUPPORT_TICKET_STATUSES,
  supportPriorityTone,
  supportStatusTone,
  type SupportTicketAttachment,
  type SupportTicketDetail
} from "@/lib/support";
import { SUPPORT_CENTER_COPY } from "@/lib/support-page-copy";

const STAFF_SUPPORT_COPY: Record<
  UiLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
    adminDashboardCta: string;
    searchLabel: string;
    searchPlaceholder: string;
    statusLabel: string;
    allStatuses: string;
    refreshQueue: string;
    loadingQueue: string;
    loadTicketsError: string;
    queueTitle: string;
    queueDescription: string;
    noMatchingTickets: string;
    ticketEyebrow: string;
    fromOwner: (id: string, owner: string) => string;
    userLabel: string;
    noEmail: string;
    assigneeLabel: string;
    unassigned: string;
    pasteLabel: string;
    controlsTitle: string;
    controlsDescription: string;
    priorityLabel: string;
    saveControls: string;
    savingControls: string;
    assignToMe: string;
    unassignFromMe: string;
    updateTicketError: string;
    updateAssigneeError: string;
    ticketUpdated: string;
    assignedToYou: string;
    unassignedStatus: string;
    staffReplyTitle: string;
    staffReplyDescription: string;
    replyPlaceholder: string;
    replyStatusLabel: string;
    automatic: string;
    internalNoteOnly: string;
    sendStaffReply: string;
    saveInternalNote: string;
    sendingReply: string;
    noTicketTitle: string;
    noTicketDescription: string;
  }
> = {
  en: {
    eyebrow: "Staff support",
    title: "Support dashboard",
    description:
      "Search by subject, ticket ID, user email, username, or paste slug. Staff replies can include screenshots and internal notes.",
    adminDashboardCta: "Admin dashboard",
    searchLabel: "Search",
    searchPlaceholder: "Subject, ticket ID, email, username, paste slug",
    statusLabel: "Status",
    allStatuses: "All statuses",
    refreshQueue: "Refresh queue",
    loadingQueue: "Loading…",
    loadTicketsError: "Could not load support tickets.",
    queueTitle: "Queue",
    queueDescription: "Sorted by latest activity.",
    noMatchingTickets: "No matching tickets.",
    ticketEyebrow: "Ticket",
    fromOwner: (id, owner) => `#${id} from ${owner}`,
    userLabel: "User",
    noEmail: "No email",
    assigneeLabel: "Assignee",
    unassigned: "Unassigned",
    pasteLabel: "Paste",
    controlsTitle: "Ticket controls",
    controlsDescription: "Adjust queue status and urgency without leaving the thread.",
    priorityLabel: "Priority",
    saveControls: "Save controls",
    savingControls: "Saving…",
    assignToMe: "Assign to me",
    unassignFromMe: "Unassign from me",
    updateTicketError: "Could not update ticket.",
    updateAssigneeError: "Could not update assignee.",
    ticketUpdated: "Ticket updated.",
    assignedToYou: "Assigned to you.",
    unassignedStatus: "Unassigned.",
    staffReplyTitle: "Staff reply",
    staffReplyDescription: "Reply publicly to the user, or mark the update as an internal note.",
    replyPlaceholder: "Write your reply…",
    replyStatusLabel: "Reply status",
    automatic: "Automatic",
    internalNoteOnly: "Internal note only",
    sendStaffReply: "Send staff reply",
    saveInternalNote: "Save internal note",
    sendingReply: "Sending…",
    noTicketTitle: "Select a support ticket",
    noTicketDescription: "Ticket detail, thread history, and controls appear here."
  },
  fil: {
    eyebrow: "Staff support",
    title: "Support dashboard",
    description:
      "Maghanap gamit ang subject, ticket ID, user email, username, o paste slug. Maaaring may screenshots at internal notes ang mga reply ng staff.",
    adminDashboardCta: "Admin dashboard",
    searchLabel: "Hanapin",
    searchPlaceholder: "Subject, ticket ID, email, username, paste slug",
    statusLabel: "Status",
    allStatuses: "Lahat ng status",
    refreshQueue: "I-refresh ang queue",
    loadingQueue: "Naglo-load…",
    loadTicketsError: "Hindi ma-load ang support tickets.",
    queueTitle: "Queue",
    queueDescription: "Nakaayos ayon sa pinakahuling activity.",
    noMatchingTickets: "Walang tumugmang tickets.",
    ticketEyebrow: "Ticket",
    fromOwner: (id, owner) => `#${id} mula kay ${owner}`,
    userLabel: "User",
    noEmail: "Walang email",
    assigneeLabel: "Assignee",
    unassigned: "Walang nakatalaga",
    pasteLabel: "Paste",
    controlsTitle: "Ticket controls",
    controlsDescription: "Ayusin ang queue status at urgency nang hindi umaalis sa thread.",
    priorityLabel: "Priority",
    saveControls: "I-save ang controls",
    savingControls: "Sine-save…",
    assignToMe: "Italaga sa akin",
    unassignFromMe: "Tanggalin sa akin",
    updateTicketError: "Hindi ma-update ang ticket.",
    updateAssigneeError: "Hindi ma-update ang assignee.",
    ticketUpdated: "Na-update ang ticket.",
    assignedToYou: "Naitalaga sa iyo.",
    unassignedStatus: "Inalis ang assignment.",
    staffReplyTitle: "Reply ng staff",
    staffReplyDescription: "Sumagot nang pampubliko sa user, o markahan ang update bilang internal note.",
    replyPlaceholder: "Isulat ang reply mo…",
    replyStatusLabel: "Reply status",
    automatic: "Automatic",
    internalNoteOnly: "Internal note lang",
    sendStaffReply: "Ipadala ang staff reply",
    saveInternalNote: "I-save ang internal note",
    sendingReply: "Ipinapadala…",
    noTicketTitle: "Pumili ng support ticket",
    noTicketDescription: "Lalabas dito ang detalye ng ticket, history ng thread, at mga controls."
  },
  ja: {
    eyebrow: "スタッフサポート",
    title: "サポートダッシュボード",
    description:
      "件名、ticket ID、メール、ユーザー名、paste slug で検索できます。スタッフ返信にはスクリーンショットや内部メモを含められます。",
    adminDashboardCta: "管理ダッシュボード",
    searchLabel: "検索",
    searchPlaceholder: "件名、ticket ID、メール、ユーザー名、paste slug",
    statusLabel: "ステータス",
    allStatuses: "すべてのステータス",
    refreshQueue: "キューを更新",
    loadingQueue: "読み込み中…",
    loadTicketsError: "サポートチケットを読み込めませんでした。",
    queueTitle: "キュー",
    queueDescription: "最新のアクティビティ順です。",
    noMatchingTickets: "一致するチケットはありません。",
    ticketEyebrow: "チケット",
    fromOwner: (id, owner) => `#${id} ${owner} から`,
    userLabel: "ユーザー",
    noEmail: "メールなし",
    assigneeLabel: "担当者",
    unassigned: "未割り当て",
    pasteLabel: "ペースト",
    controlsTitle: "チケット操作",
    controlsDescription: "スレッドを離れずにキュー状態と優先度を調整できます。",
    priorityLabel: "優先度",
    saveControls: "操作を保存",
    savingControls: "保存中…",
    assignToMe: "自分に割り当て",
    unassignFromMe: "自分の割り当てを外す",
    updateTicketError: "チケットを更新できませんでした。",
    updateAssigneeError: "担当者を更新できませんでした。",
    ticketUpdated: "チケットを更新しました。",
    assignedToYou: "あなたに割り当てました。",
    unassignedStatus: "割り当てを解除しました。",
    staffReplyTitle: "スタッフ返信",
    staffReplyDescription: "ユーザーへ公開返信するか、更新を内部メモとして保存できます。",
    replyPlaceholder: "返信を書いてください…",
    replyStatusLabel: "返信ステータス",
    automatic: "自動",
    internalNoteOnly: "内部メモのみ",
    sendStaffReply: "スタッフ返信を送信",
    saveInternalNote: "内部メモを保存",
    sendingReply: "送信中…",
    noTicketTitle: "サポートチケットを選択",
    noTicketDescription: "ここにチケット詳細、スレッド履歴、操作が表示されます。"
  },
  es: {
    eyebrow: "Soporte del staff",
    title: "Panel de soporte",
    description:
      "Busca por asunto, ticket ID, correo, nombre de usuario o slug del paste. Las respuestas del staff pueden incluir capturas y notas internas.",
    adminDashboardCta: "Panel admin",
    searchLabel: "Buscar",
    searchPlaceholder: "Asunto, ticket ID, correo, usuario, slug del paste",
    statusLabel: "Estado",
    allStatuses: "Todos los estados",
    refreshQueue: "Actualizar cola",
    loadingQueue: "Cargando…",
    loadTicketsError: "No se pudieron cargar los tickets de soporte.",
    queueTitle: "Cola",
    queueDescription: "Ordenada por actividad más reciente.",
    noMatchingTickets: "No hay tickets coincidentes.",
    ticketEyebrow: "Ticket",
    fromOwner: (id, owner) => `#${id} de ${owner}`,
    userLabel: "Usuario",
    noEmail: "Sin correo",
    assigneeLabel: "Asignado a",
    unassigned: "Sin asignar",
    pasteLabel: "Paste",
    controlsTitle: "Controles del ticket",
    controlsDescription: "Ajusta el estado y la urgencia sin salir del hilo.",
    priorityLabel: "Prioridad",
    saveControls: "Guardar controles",
    savingControls: "Guardando…",
    assignToMe: "Asignarme",
    unassignFromMe: "Quitarme asignación",
    updateTicketError: "No se pudo actualizar el ticket.",
    updateAssigneeError: "No se pudo actualizar el asignado.",
    ticketUpdated: "Ticket actualizado.",
    assignedToYou: "Asignado para ti.",
    unassignedStatus: "Sin asignación.",
    staffReplyTitle: "Respuesta del staff",
    staffReplyDescription: "Responde públicamente al usuario o marca la actualización como nota interna.",
    replyPlaceholder: "Escribe tu respuesta…",
    replyStatusLabel: "Estado de respuesta",
    automatic: "Automático",
    internalNoteOnly: "Solo nota interna",
    sendStaffReply: "Enviar respuesta del staff",
    saveInternalNote: "Guardar nota interna",
    sendingReply: "Enviando…",
    noTicketTitle: "Selecciona un ticket de soporte",
    noTicketDescription: "Aquí aparecerán el detalle del ticket, el historial del hilo y los controles."
  }
};

type Props = {
  initialTickets: SupportTicketDetail[];
  initialSearch: string;
  initialStatus: string;
  viewerUserId: string;
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

export function SupportDashboard({ initialTickets, initialSearch, initialStatus, viewerUserId, language }: Props) {
  const copy = STAFF_SUPPORT_COPY[language];
  const sharedCopy = SUPPORT_CENTER_COPY[language];
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
      setListError(payload?.error ?? copy.loadTicketsError);
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
      const attachments = await filesToSupportAttachments(event.target.files, language);
      setReplyAttachments(attachments);
      setReplyError(null);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : sharedCopy.attachmentGenericError);
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
      setMetaError(payload?.error ?? copy.updateTicketError);
      setSaveMetaLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    syncTicketControls(payload.ticket);
    setMetaStatus(copy.ticketUpdated);
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
      setMetaError(payload?.error ?? copy.updateAssigneeError);
      setSaveMetaLoading(false);
      return;
    }

    setTickets((current) => upsertTicket(current, payload.ticket as SupportTicketDetail));
    syncTicketControls(payload.ticket);
    setMetaStatus(assignToSelf ? copy.assignedToYou : copy.unassignedStatus);
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
      setReplyError(payload?.error ?? sharedCopy.replyError);
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
    setReplyStatusMessage(sharedCopy.replySent);
    setReplyLoading(false);
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
          <Button asChild variant="outline">
            <Link href="/admin">{copy.adminDashboardCta}</Link>
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
                    {copy.searchLabel}
                  </label>
                  <Input
                    id="support-staff-search"
                    placeholder={copy.searchPlaceholder}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="support-staff-status">
                    {copy.statusLabel}
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
                    <option value="all">{copy.allStatuses}</option>
                    {SUPPORT_TICKET_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {sharedCopy.statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button disabled={loadingList} type="submit">
                  {loadingList ? copy.loadingQueue : copy.refreshQueue}
                </Button>
              </form>

              {listError ? <p className="text-sm text-destructive">{listError}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{copy.queueTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.queueDescription}</p>
                </div>
                <Badge>{tickets.length}</Badge>
              </div>
              {tickets.length ? (
                <SupportTicketList
                  language={language}
                  tickets={tickets}
                  selectedTicketId={selectedTicket?.id ?? null}
                  onSelect={handleSelectTicket}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{copy.noMatchingTickets}</p>
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
                      {copy.fromOwner(
                        selectedTicket.id.slice(0, 8).toUpperCase(),
                        selectedTicket.owner?.label ?? sharedCopy.unknownOwner
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={supportStatusTone(selectedTicket.status)}>{sharedCopy.statusLabels[selectedTicket.status]}</Badge>
                    <Badge className={supportPriorityTone(selectedTicket.priority)}>
                      {sharedCopy.priorityLabels[selectedTicket.priority]}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.userLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {selectedTicket.owner?.label ?? sharedCopy.unknownOwner}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedTicket.owner?.email ?? copy.noEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.assigneeLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedTicket.assignee?.label ?? copy.unassigned}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{copy.pasteLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {selectedTicket.relatedPasteSlug ?? sharedCopy.none}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{sharedCopy.lastUpdateLabel}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatSupportTimestamp(selectedTicket.lastMessageAt, language)}
                    </p>
                  </div>
                </div>

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleMetaSave(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.controlsTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.controlsDescription}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-ticket-status">
                        {copy.statusLabel}
                      </label>
                      <select
                        id="staff-ticket-status"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as (typeof SUPPORT_TICKET_STATUSES)[number])}
                      >
                        {SUPPORT_TICKET_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {sharedCopy.statusLabels[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-ticket-priority">
                        {copy.priorityLabel}
                      </label>
                      <select
                        id="staff-ticket-priority"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={priority}
                        onChange={(event) => setPriority(event.target.value as (typeof SUPPORT_TICKET_PRIORITIES)[number])}
                      >
                        {SUPPORT_TICKET_PRIORITIES.map((value) => (
                          <option key={value} value={value}>
                            {sharedCopy.priorityLabels[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={saveMetaLoading} type="submit">
                      {saveMetaLoading ? copy.savingControls : copy.saveControls}
                    </Button>
                    <Button
                      disabled={saveMetaLoading}
                      type="button"
                      variant="outline"
                      onClick={() => void handleAssign(selectedTicket.assignee?.id !== viewerUserId)}
                    >
                      {selectedTicket.assignee?.id === viewerUserId ? copy.unassignFromMe : copy.assignToMe}
                    </Button>
                  </div>

                  {metaError ? <p className="text-sm text-destructive">{metaError}</p> : null}
                  {metaStatus ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{metaStatus}</p> : null}
                </form>

                <SupportThread language={language} ticket={selectedTicket} viewerIsStaff viewerUserId={viewerUserId} />

                <form className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4" onSubmit={(event) => void handleReply(event)}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{copy.staffReplyTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.staffReplyDescription}</p>
                  </div>

                  <Textarea placeholder={copy.replyPlaceholder} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="staff-reply-status">
                        {copy.replyStatusLabel}
                      </label>
                      <select
                        id="staff-reply-status"
                        className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm text-foreground"
                        value={replyStatus}
                        onChange={(event) => setReplyStatus(event.target.value as (typeof SUPPORT_TICKET_STATUSES)[number] | "")}
                      >
                        <option value="">{copy.automatic}</option>
                        {SUPPORT_TICKET_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {sharedCopy.statusLabels[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-foreground">
                        <input checked={internalNote} type="checkbox" onChange={(event) => setInternalNote(event.target.checked)} />
                        {copy.internalNoteOnly}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="staff-reply-images">
                      {sharedCopy.attachImagesLabel}
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
                    language={language}
                    onRemove={(index) => setReplyAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  />

                  {replyError ? <p className="text-sm text-destructive">{replyError}</p> : null}
                  {replyStatusMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{replyStatusMessage}</p> : null}

                  <Button disabled={replyLoading} type="submit">
                    {replyLoading ? copy.sendingReply : internalNote ? copy.saveInternalNote : copy.sendStaffReply}
                  </Button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-8 text-center">
                <p className="text-lg font-medium text-foreground">{copy.noTicketTitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">{copy.noTicketDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
