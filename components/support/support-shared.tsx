"use client";

import Image from "next/image";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UiLanguage } from "@/lib/i18n";
import { parseDataUrl } from "@/lib/paste-file-media";
import {
  supportPriorityTone,
  supportStatusTone,
  SUPPORT_ATTACHMENT_MAX_COUNT,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  type SupportTicketAttachment,
  type SupportTicketDetail,
  type SupportTicketMessage,
  type SupportTicketSummary
} from "@/lib/support";
import { SUPPORT_CENTER_COPY } from "@/lib/support-page-copy";

function supportLocale(language: UiLanguage) {
  switch (language) {
    case "fil":
      return "fil-PH";
    case "ja":
      return "ja-JP";
    case "es":
      return "es-ES";
    default:
      return "en-US";
  }
}

export function formatSupportTimestamp(value: string, language: UiLanguage = "en") {
  return new Intl.DateTimeFormat(supportLocale(language), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export async function filesToSupportAttachments(
  fileList: FileList | null,
  language: UiLanguage = "en"
): Promise<SupportTicketAttachment[]> {
  if (!fileList || fileList.length === 0) {
    return [];
  }

  const copy = SUPPORT_CENTER_COPY[language];
  const files = Array.from(fileList).slice(0, SUPPORT_ATTACHMENT_MAX_COUNT);
  return Promise.all(
    files.map(
      (file) =>
        new Promise<SupportTicketAttachment>((resolve, reject) => {
          if (!file.type.startsWith("image/")) {
            reject(new Error(copy.unsupportedFileType(file.name)));
            return;
          }
          if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
            reject(new Error(copy.fileTooLarge(file.name)));
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => reject(new Error(copy.fileReadError(file.name)));
          reader.onload = () => {
            const parsed = typeof reader.result === "string" ? parseDataUrl(reader.result) : null;
            if (!parsed) {
              reject(new Error(copy.fileParseError(file.name)));
              return;
            }
            resolve({
              filename: file.name,
              mimeType: parsed.mimeType,
              content: parsed.base64,
              sizeBytes: file.size
            });
          };
          reader.readAsDataURL(file);
        })
    )
  );
}

export function SupportAttachmentPreview({
  attachments,
  onRemove,
  language = "en"
}: {
  attachments: SupportTicketAttachment[];
  onRemove?: (index: number) => void;
  language?: UiLanguage;
}) {
  const copy = SUPPORT_CENTER_COPY[language];

  if (!attachments.length) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {attachments.map((attachment, index) => (
        <div key={`${attachment.filename}-${index}`} className="rounded-2xl border border-border bg-muted/20 p-3">
          <Image
            alt={attachment.filename}
            className="h-36 w-full rounded-xl object-cover"
            height={320}
            src={`data:${attachment.mimeType};base64,${attachment.content}`}
            unoptimized
            width={480}
          />
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{attachment.filename}</p>
              <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB</p>
            </div>
            {onRemove ? (
              <Button size="sm" type="button" variant="ghost" onClick={() => onRemove(index)}>
                {copy.removeAttachment}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function messageTone(message: SupportTicketMessage, viewerUserId: string) {
  if (message.internalNote) {
    return "border-amber-500/30 bg-amber-500/10";
  }
  return message.author?.id === viewerUserId ? "border-primary/25 bg-primary/10" : "border-border bg-card/70";
}

export function SupportThread({
  ticket,
  viewerUserId,
  viewerIsStaff,
  language
}: {
  ticket: SupportTicketDetail;
  viewerUserId: string;
  viewerIsStaff: boolean;
  language: UiLanguage;
}) {
  const copy = SUPPORT_CENTER_COPY[language];

  return (
    <div className="space-y-4">
      {ticket.messages.map((message) => (
        <article key={message.id} className={`rounded-2xl border p-4 ${messageTone(message, viewerUserId)}`}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{message.author?.label ?? copy.deletedUser}</p>
            <Badge className="border-border bg-background/60 text-muted-foreground">
              {message.authorRole === "admin"
                ? copy.adminRole
                : message.authorRole === "moderator"
                  ? copy.moderatorRole
                  : copy.userRole}
            </Badge>
            {message.internalNote && viewerIsStaff ? (
              <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-100">{copy.internalNote}</Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatSupportTimestamp(message.createdAt, language)}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{message.content}</p>
          {message.attachments.length ? (
            <div className="mt-4">
              <SupportAttachmentPreview attachments={message.attachments} language={language} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function SupportTicketList({
  tickets,
  selectedTicketId,
  onSelect,
  language
}: {
  tickets: SupportTicketSummary[];
  selectedTicketId: string | null;
  onSelect: (ticketId: string) => void;
  language: UiLanguage;
}) {
  const copy = SUPPORT_CENTER_COPY[language];
  const orderedTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [tickets]
  );

  return (
    <div className="space-y-3">
      {orderedTickets.map((ticket) => {
        const active = ticket.id === selectedTicketId;
        return (
          <button
            key={ticket.id}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              active ? "border-primary/40 bg-primary/10" : "border-border bg-card/50 hover:border-primary/20"
            }`}
            type="button"
            onClick={() => onSelect(ticket.id)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">#{ticket.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <Badge className={supportStatusTone(ticket.status)}>{copy.statusLabels[ticket.status]}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{copy.categoryLabels[ticket.category]}</Badge>
              <Badge className={supportPriorityTone(ticket.priority)}>{copy.priorityLabels[ticket.priority]}</Badge>
            </div>
            {ticket.lastMessagePreview ? (
              <p className="mt-3 max-h-12 overflow-hidden text-sm leading-6 text-muted-foreground">{ticket.lastMessagePreview}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{copy.messageCount(ticket.messageCount)}</span>
              <span>{formatSupportTimestamp(ticket.lastMessageAt, language)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
