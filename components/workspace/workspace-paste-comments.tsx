"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

type CommentRow = {
  id: number;
  content: string;
  parentId: number | null;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

type Props = {
  slug: string | null;
  signedIn: boolean;
};

export function WorkspacePasteComments({ slug, signedIn }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!slug) {
      setComments([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${encodeURIComponent(slug)}/comments`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { comments?: CommentRow[] } | null;
      if (!res.ok) {
        setComments([]);
        setError("Could not load comments (paste may be private or not synced yet).");
        return;
      }
      setComments(data?.comments ?? []);
    } catch {
      setComments([]);
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug || !signedIn || !draft.trim()) {
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft.trim() })
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not post comment.");
      }
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed.");
    } finally {
      setPosting(false);
    }
  }

  if (!slug) {
    return (
      <Card className="border-border bg-card/90">
        <CardContent className="space-y-2 py-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquare className="h-4 w-4" />
            Comments
          </div>
          <p className="text-sm text-muted-foreground">
            Save this paste to your account (with public or unlisted visibility) to enable share comments here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/90">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquare className="h-4 w-4" />
            Comments
          </div>
          <Button disabled={loading} onClick={() => void load()} size="sm" type="button" variant="ghost">
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="max-h-48 space-y-3 overflow-y-auto pr-1 workspace-scrollbar-hide">
            {comments.map((c) => (
              <li className="rounded-lg border border-border bg-muted/50 p-3 text-sm dark:bg-black/20" key={c.id}>
                <p className="text-xs text-muted-foreground">
                  {(c.displayName || c.username || "User") + " · " + formatDate(c.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {signedIn ? (
          <form className="space-y-2" onSubmit={(e) => void handleSubmit(e)}>
            <Textarea
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              rows={3}
              value={draft}
            />
            <Button disabled={posting || !draft.trim()} size="sm" type="submit">
              {posting ? "Posting…" : "Post comment"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to post comments on this paste.</p>
        )}
      </CardContent>
    </Card>
  );
}
