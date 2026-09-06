"use client";

import { useMemo } from "react";
import {
  FileText,
  Key,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
  Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export type AuditLogItem = {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  ipHash: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type Props = {
  logs: AuditLogItem[];
};

function formatActionLabel(action: string): string {
  switch (action) {
    case "auth.signin":
      return "Signed in to account";
    case "auth.signup":
      return "Registered new account";
    case "account.password.updated":
      return "Account password updated";
    case "totp.enabled":
      return "Two-factor authentication (TOTP) enabled";
    case "totp.disabled":
      return "Two-factor authentication (TOTP) disabled";
    case "totp.recovery_codes.regenerated":
      return "Regenerated 2FA recovery codes";
    case "sessions.revoke_others":
      return "Revoked all other active browser sessions";
    case "sessions.revoke":
      return "Revoked browser session";
    case "api_key.created":
      return "Generated new API key";
    case "api_key.deleted":
      return "Revoked API key";
    case "paste.created":
      return "Created new paste";
    case "paste.updated":
      return "Updated paste";
    case "paste.deleted":
      return "Deleted paste";
    case "comment.created":
      return "Posted comment on paste";
    default:
      return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function getActionIcon(action: string) {
  if (action.startsWith("auth.")) return LogIn;
  if (action.includes("password")) return Lock;
  if (action.includes("totp")) return Smartphone;
  if (action.includes("sessions.revoke")) return LogOut;
  if (action.includes("api_key")) return Key;
  if (action.includes("deleted")) return Trash2;
  if (action.includes("paste") || action.includes("comment")) return FileText;
  return ShieldCheck;
}

export function SecurityAuditClient({ logs }: Props) {
  const items = useMemo(() => logs, [logs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security & Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Review recent authentication events, security modifications, and token creations on your account.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-base font-semibold text-foreground">No activity recorded yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Account actions such as sign-ins, password updates, and API key creations will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((log) => {
            const Icon = getActionIcon(log.action);
            const actionLabel = formatActionLabel(log.action);

            return (
              <Card
                key={log.id}
                className="border-border/60 bg-card/60 transition-colors hover:border-border hover:bg-muted/30"
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg border border-border/80 bg-muted/60 p-2 text-foreground/80">
                      <Icon className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{actionLabel}</span>
                        <Badge className="text-[11px] font-mono uppercase tracking-wider">
                          {log.targetType}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Target: {log.targetId.slice(0, 24)}</span>
                        {log.ipHash && (
                          <>
                            <span>•</span>
                            <span className="font-mono">IP: {log.ipHash.slice(0, 12)}…</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                    <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
