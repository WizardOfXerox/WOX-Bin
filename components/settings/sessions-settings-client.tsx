"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, LogOut, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  userAgent: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  current: boolean;
};

export function SessionsSettingsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/sessions", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as
        | { sessions?: Row[]; currentId?: string | null; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not load sessions.");
      }
      setRows(data?.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeOne(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/settings/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not revoke session.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeOthers() {
    setRevokingOthers(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/sessions/revoke-others", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not revoke other sessions.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setRevokingOthers(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Active browser sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign out ends this device. Revoke others if you don&apos;t recognize a session.
            </p>
          </div>
          <Button disabled={revokingOthers || rows.length <= 1} onClick={() => void revokeOthers()} type="button" variant="outline">
            {revokingOthers ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking…
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Revoke all others
              </>
            )}
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sessions…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions recorded.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={r.id}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}…</span>
                    {r.current ? <Badge className="border-primary/30 bg-primary/10 text-xs text-primary">This device</Badge> : null}
                  </div>
                  <p className="truncate text-sm text-foreground">{r.userAgent || "Unknown client"}</p>
                  <p className="text-xs text-muted-foreground">
                    Last seen {r.lastSeenAt ? formatDate(r.lastSeenAt) : "—"} · Started{" "}
                    {r.createdAt ? formatDate(r.createdAt) : "—"}
                  </p>
                </div>
                {!r.current ? (
                  <Button
                    className="inline-flex items-center gap-2"
                    disabled={busyId === r.id}
                    onClick={() => void revokeOne(r.id)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
