"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SearchUser = {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  role: "user" | "moderator" | "admin";
  emailVerified: string | null;
  accountStatus: "active" | "suspended" | "banned";
};

type SearchPaste = {
  id: string;
  slug: string;
  title: string;
  status: "active" | "hidden" | "deleted";
  visibility: string;
  ownerUserId: string | null;
  ownerUsername: string | null;
  ownerEmail: string | null;
};

export function AdminSearchPanel() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [pastes, setPastes] = useState<SearchPaste[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debouncedQ) {
      return;
    }

    let cancelled = false;
    async function runSearch() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQ)}`);
        const body = (await res.json()) as { users?: SearchUser[]; pastes?: SearchPaste[]; error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? "Search failed");
        }
        if (!cancelled) {
          setUsers(body.users ?? []);
          setPastes(body.pastes ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Search failed");
          setUsers([]);
          setPastes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Global admin search</p>
          <Input
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search user, email, paste title, or slug…"
            value={q}
          />
          <p className="text-xs text-muted-foreground">
            Search across accounts and pastes from one place.
            {loading ? " Loading…" : ""}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}

        {debouncedQ ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Users</p>
                <Badge>{users.length}</Badge>
              </div>
              <div className="space-y-2">
                {users.length ? (
                  users.map((user) => (
                    <Link
                      className="block rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 hover:bg-white/[0.04]"
                      href={`/admin/users/${user.id}`}
                      key={user.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{user.displayName || user.username || user.email || user.id}</div>
                          <div className="truncate text-xs text-muted-foreground">{user.email ?? user.id}</div>
                          {user.username ? <div className="text-xs text-muted-foreground">@{user.username}</div> : null}
                        </div>
                        <div className="text-right">
                          <Badge className={user.emailVerified ? "text-emerald-300" : "text-amber-200/90"}>
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                          <div className="mt-1 flex justify-end gap-1">
                            <Badge
                              className={
                                user.accountStatus === "active"
                                  ? "text-emerald-300"
                                  : user.accountStatus === "suspended"
                                    ? "text-amber-200/90"
                                    : "text-destructive-foreground"
                              }
                            >
                              {user.accountStatus}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{user.role}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No users matched.</p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Pastes</p>
                <Badge>{pastes.length}</Badge>
              </div>
              <div className="space-y-2">
                {pastes.length ? (
                  pastes.map((paste) => (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3" key={paste.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link className="line-clamp-1 font-medium hover:underline" href={`/admin/pastes?q=${encodeURIComponent(paste.slug)}`}>
                            {paste.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">/p/{paste.slug}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {paste.ownerUserId ? (
                              <Link className="hover:text-foreground hover:underline" href={`/admin/users/${paste.ownerUserId}`}>
                                {paste.ownerUsername ? `@${paste.ownerUsername}` : paste.ownerEmail ?? paste.ownerUserId}
                              </Link>
                            ) : (
                              "Anonymous"
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge>{paste.status}</Badge>
                          <div className="mt-1 text-xs text-muted-foreground">{paste.visibility}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No pastes matched.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
