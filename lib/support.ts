import { normalizeAttachmentMimeType } from "@/lib/paste-file-media";

export const SUPPORT_TICKET_CATEGORIES = ["account", "paste", "billing", "moderation", "bug", "other"] as const;
export const SUPPORT_TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const SUPPORT_TICKET_STATUSES = ["open", "in_progress", "waiting_on_user", "resolved", "closed"] as const;

export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITIES)[number];
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp"
] as const;

export const SUPPORT_ATTACHMENT_MAX_COUNT = 4;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_MAX_BASE64 = 4 * 1024 * 1024;

export function isAllowedSupportImageMime(mime: string) {
  const normalized = normalizeAttachmentMimeType(mime);
  return (SUPPORT_IMAGE_MIME_TYPES as readonly string[]).includes(normalized);
}

export type SupportTicketAttachment = {
  filename: string;
  mimeType: string;
  content: string;
  sizeBytes: number;
};

export type SupportActor = {
  id: string | null;
  role: "user" | "moderator" | "admin" | null;
  label: string;
  username: string | null;
  email: string | null;
};

export type SupportTicketMessage = {
  id: string;
  author: SupportActor | null;
  authorRole: "user" | "moderator" | "admin";
  content: string;
  internalNote: boolean;
  attachments: SupportTicketAttachment[];
  createdAt: string;
};

export type SupportTicketDetail = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  relatedPasteSlug: string | null;
  owner: SupportActor | null;
  assignee: SupportActor | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
  messages: SupportTicketMessage[];
};

export type SupportTicketSummary = Omit<SupportTicketDetail, "messages">;

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  account: "Account",
  paste: "Paste",
  billing: "Billing",
  moderation: "Moderation",
  bug: "Bug",
  other: "Other"
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent"
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_user: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed"
};

export function supportStatusTone(status: SupportTicketStatus) {
  switch (status) {
    case "open":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
    case "in_progress":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    case "waiting_on_user":
      return "border-violet-500/30 bg-violet-500/10 text-violet-100";
    case "resolved":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "closed":
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

export function supportPriorityTone(priority: SupportTicketPriority) {
  switch (priority) {
    case "urgent":
      return "border-red-500/30 bg-red-500/10 text-red-100";
    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-100";
    case "normal":
      return "border-blue-500/30 bg-blue-500/10 text-blue-100";
    case "low":
      return "border-border bg-muted/40 text-muted-foreground";
  }
}
