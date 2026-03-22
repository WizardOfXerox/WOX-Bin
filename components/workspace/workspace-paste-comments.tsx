"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buildThreadedComments, commentAuthorLabel } from "@/lib/comment-thread";
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
  const [replyToId, setReplyToId] = useState<number | null>(null);

  const threadedComments = useMemo(() => buildThreadedComments(comments), [comments]);
  const replyTarget = replyToId != null ? comments.find((comment) => comment.id === replyToId) ?? null : null;

  const load = useCallback(async () => {
    if (!slug) {
      setComments([]);
      setReplyToId(null);
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
        body: JSON.stringify({
          content: draft.trim(),
          parentId: replyTarget?.id ?? null
        })
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not post comment.");
      }
      setDraft("");
      setReplyToId(null);
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
        ) : threadedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="max-h-48 space-y-3 overflow-y-auto pr-1 workspace-scrollbar-hide">
            {threadedComments.map((c) => (
              <li
                className="rounded-lg border border-border bg-muted/50 p-3 text-sm dark:bg-black/20"
                key={c.id}
                style={{ marginLeft: `${c.depth * 16}px` }}
              >
                <p className="text-xs text-muted-foreground">{commentAuthorLabel(c) + " · " + formatDate(c.createdAt)}</p>
                {c.parentAuthor ? (
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Replying to {c.parentAuthor}
                  </p>
                ) : null}
                <p className="mt-1 whitespace-pre-wrap text-foreground">{c.content}</p>
                {signedIn ? (
                  <div className="mt-2 flex">
                    <Button
                      onClick={() => setReplyToId((current) => (current === c.id ? null : c.id))}
                      size="sm"
                      type="button"
                      variant={replyToId === c.id ? "secondary" : "ghost"}
                    >
                      {replyToId === c.id ? "Cancel reply" : "Reply"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {signedIn ? (
          <form className="space-y-2" onSubmit={(e) => void handleSubmit(e)}>
            {replyTarget ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-black/20">
                Replying to <span className="font-medium text-foreground">{commentAuthorLabel(replyTarget)}</span>
              </div>
            ) : null}
            <Textarea
              onChange={(e) => setDraft(e.target.value)}
              placeholder={replyTarget ? `Reply to ${commentAuthorLabel(replyTarget)}…` : "Write a comment…"}
              rows={3}
              value={draft}
            />
            <Button disabled={posting || !draft.trim()} size="sm" type="submit">
              {posting ? "Posting…" : replyTarget ? "Post reply" : "Post comment"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to post comments on this paste.</p>
        )}
      </CardContent>
    </Card>
  );
}
