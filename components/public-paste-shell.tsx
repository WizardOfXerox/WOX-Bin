"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AppWindow,
  BookOpen,
  Code2,
  Copy,
  Download,
  FileDown,
  Flag,
  GitFork,
  Image as ImageIcon,
  LockKeyhole,
  MessageSquare,
  MessageSquareReply,
  Printer,
  Share2,
  Star
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PasteLineageBanner } from "@/components/paste-lineage-banner";
import { CodeImageDialog } from "@/components/workspace/code-image-dialog";
import { PrismLineMap } from "@/components/workspace/prism-line-map";
import { parseUserMarkdown } from "@/lib/markdown/parse-user-markdown";
import {
  readHtmlViewPref,
  readLineGuidesPref,
  readLineNumbersPref,
  readMarkdownViewPref,
  writeHtmlViewPref,
  writeLineGuidesPref,
  writeLineNumbersPref,
  writeMarkdownViewPref,
  type PublicPasteHtmlView,
  type PublicPasteMdView
} from "@/lib/public-paste-view-prefs";
import { dataUrlFromPasteFile, isPasteFileMedia } from "@/lib/paste-file-media";
import { pasteBodyDownloadFilename, safeDownloadBasename } from "@/lib/paste-download";
import type { PasteFileDraft, PublicPasteRecord } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadPasteFile(file: PasteFileDraft) {
  const name = safeDownloadBasename(file.filename, "attachment");
  if (file.mediaKind === "image" || file.mediaKind === "video") {
    const mime = file.mimeType?.trim() || "application/octet-stream";
    const compact = file.content.replace(/\s/g, "");
    try {
      const binary = atob(compact);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      triggerDownloadBlob(new Blob([bytes], { type: mime }), name);
    } catch {
      return;
    }
    return;
  }
  triggerDownloadBlob(new Blob([file.content], { type: "text/plain;charset=utf-8" }), name);
}

type CommentRecord = {
  id: number;
  content: string;
  parentId: number | null;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

/**
 * Permissive iframe so demos / SPAs work. **Dangerous:** pasted HTML runs with `allow-scripts` +
 * `allow-same-origin` (same origin as this site), so it can access this origin’s cookies/session and
 * call your APIs. Only preview pastes you trust.
 */
const RISKY_HTML_PREVIEW_SANDBOX =
  [
    "allow-downloads",
    "allow-forms",
    "allow-modals",
    "allow-pointer-lock",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-presentation",
    "allow-same-origin",
    "allow-scripts",
    "allow-storage-access-by-user-activation",
    "allow-top-navigation-by-user-activation"
  ].join(" ");

function SandboxedHtmlPreviewFrame({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-muted/30 dark:bg-black/20",
        className
      )}
    >
      <div className="border-b border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
        <strong className="font-semibold">Untrusted HTML risk.</strong> This preview allows scripts, forms, popups, and
        same-origin access — malicious pastes could phish or use your session. Use only for content you trust.
      </div>
      <iframe
        className="h-[min(70vh,900px)] w-full border-0 bg-white dark:bg-zinc-950"
        title="HTML preview (scripts enabled)"
        sandbox={RISKY_HTML_PREVIEW_SANDBOX}
        referrerPolicy="no-referrer"
        srcDoc={html}
      />
      <p className="border-t border-border/80 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        Top-level navigation is limited to user gestures; other sandbox escapes may still be possible — treat every paste
        as code you are executing.
      </p>
    </div>
  );
}

function MarkupAttachmentViewer({
  file,
  showLineNumbers,
  showLineSeparators
}: {
  file: PasteFileDraft;
  showLineNumbers: boolean;
  showLineSeparators: boolean;
}) {
  const [view, setView] = useState<PublicPasteHtmlView>("source");
  return (
    <div className="space-y-2">
      <div
        className="no-print flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-2 py-1.5 dark:bg-black/15"
        role="group"
        aria-label={`${file.filename} HTML view`}
      >
        <Button
          type="button"
          size="sm"
          variant={view === "source" ? "secondary" : "ghost"}
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setView("source")}
        >
          <Code2 className="h-3.5 w-3.5" />
          Source
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "preview" ? "secondary" : "ghost"}
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setView("preview")}
        >
          <AppWindow className="h-3.5 w-3.5" />
          Preview
        </Button>
      </div>
      {view === "preview" ? (
        <SandboxedHtmlPreviewFrame html={file.content} />
      ) : (
        <PrismLineMap
          content={file.content}
          language={file.language}
          showLineNumbers={showLineNumbers}
          showLineSeparators={showLineSeparators}
        />
      )}
    </div>
  );
}

type Props = {
  initialPaste: PublicPasteRecord;
  initialComments: CommentRecord[];
  initialLocked: boolean;
  signedIn: boolean;
};

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null;
}

export function PublicPasteShell({
  initialPaste,
  initialComments,
  initialLocked,
  signedIn
}: Props) {
  const [paste, setPaste] = useState(initialPaste);
  const [comments, setComments] = useState(initialComments);
  const [locked, setLocked] = useState(initialLocked);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [pendingStar, setPendingStar] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportNotes, setReportNotes] = useState("");
  const [reportState, setReportState] = useState<string | null>(null);
  const [codeImageOpen, setCodeImageOpen] = useState(false);

  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showLineSeparators, setShowLineSeparators] = useState(true);
  const [mdView, setMdView] = useState<PublicPasteMdView>("source");
  const [htmlView, setHtmlView] = useState<PublicPasteHtmlView>("source");
  const [viewerPrefsReady, setViewerPrefsReady] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setShowLineNumbers(readLineNumbersPref());
      setShowLineSeparators(readLineGuidesPref());
      setMdView(readMarkdownViewPref());
      setHtmlView(readHtmlViewPref());
      setViewerPrefsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!viewerPrefsReady) {
      return;
    }
    writeLineNumbersPref(showLineNumbers);
  }, [showLineNumbers, viewerPrefsReady]);

  useEffect(() => {
    if (!viewerPrefsReady) {
      return;
    }
    writeLineGuidesPref(showLineSeparators);
  }, [showLineSeparators, viewerPrefsReady]);

  useEffect(() => {
    if (!viewerPrefsReady) {
      return;
    }
    writeMarkdownViewPref(mdView);
  }, [mdView, viewerPrefsReady]);

  useEffect(() => {
    if (!viewerPrefsReady) {
      return;
    }
    writeHtmlViewPref(htmlView);
  }, [htmlView, viewerPrefsReady]);

  const markdownPreviewHtml = useMemo(() => {
    if (paste.language !== "markdown") {
      return "";
    }
    return parseUserMarkdown(paste.content, { breaks: true });
  }, [paste.language, paste.content]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw || !raw.startsWith("line-")) {
      return;
    }
    const el = document.getElementById(raw);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [paste.slug, paste.content]);

  async function refreshPaste() {
    const [pasteResponse, commentsResponse] = await Promise.all([
      fetch(`/api/pastes/${paste.slug}`, { cache: "no-store" }),
      fetch(`/api/pastes/${paste.slug}/comments`, { cache: "no-store" })
    ]);

    if (pasteResponse.ok) {
      const nextPaste = await readJson<PublicPasteRecord>(pasteResponse);
      if (nextPaste) {
        setPaste(nextPaste);
        setLocked(false);
      }
    }

    if (commentsResponse.ok) {
      const data = await readJson<{ comments: CommentRecord[] }>(commentsResponse);
      setComments(data?.comments ?? []);
    }
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingUnlock(true);
    setUnlockError(null);

    const response = await fetch(`/api/pastes/${paste.slug}/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      setUnlockError(body?.error ?? "Could not unlock paste.");
      setPendingUnlock(false);
      return;
    }

    await refreshPaste();
    setPassword("");
    setPendingUnlock(false);
  }

  async function handleStar() {
    setPendingStar(true);
    const response = await fetch(`/api/pastes/${paste.slug}/star`, {
      method: "POST"
    });

    if (response.ok) {
      const body = await readJson<{ stars: number; starredByViewer?: boolean; starred?: boolean }>(response);
      setPaste((current) => ({
        ...current,
        stars: body?.stars ?? current.stars,
        starredByViewer: body?.starredByViewer ?? body?.starred ?? !current.starredByViewer
      }));
    }

    setPendingStar(false);
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingComment(true);
    setCommentError(null);

    const response = await fetch(`/api/pastes/${paste.slug}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: comment
      })
    });

    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      setCommentError(body?.error ?? "Could not post comment.");
      setPendingComment(false);
      return;
    }

    setComment("");
    await refreshPaste();
    setPendingComment(false);
  }

  async function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportState("Sending report...");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pasteSlug: paste.slug,
        reason: reportReason,
        notes: reportNotes
      })
    });

    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      setReportState(body?.error ?? "Could not submit report.");
      return;
    }

    setReportNotes("");
    setReportOpen(false);
    setReportState("Report submitted. Thanks for helping keep the feed clean.");
  }

  async function copyLink(target: "share" | "raw") {
    const href =
      target === "raw"
        ? `${window.location.origin}/raw/${paste.slug}`
        : `${window.location.origin}/p/${paste.slug}`;

    await navigator.clipboard.writeText(href);
  }

  function downloadMainPaste() {
    if (locked) {
      return;
    }
    const filename = pasteBodyDownloadFilename(paste);
    triggerDownloadBlob(new Blob([paste.content], { type: "text/plain;charset=utf-8" }), filename);
  }

  function handlePrintPaste() {
    if (typeof window === "undefined") {
      return;
    }
    window.print();
  }

  const authorName = paste.author.displayName || paste.author.username || "Anonymous";
  const forkHref = `/app?fork=${encodeURIComponent(paste.slug)}`;
  const replyHref = `/app?reply=${encodeURIComponent(paste.slug)}`;

  return (
    <main className="wox-public-paste-print-root mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.03] px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Public paste</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {paste.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge>{paste.visibility}</Badge>
                <Badge>{paste.language}</Badge>
                {paste.category ? <Badge>{paste.category}</Badge> : null}
                {paste.requiresPassword ? <Badge>Password protected</Badge> : null}
                {paste.burnAfterRead ? <Badge>Burn after read</Badge> : null}
                {paste.burnAfterViews > 0 ? <Badge>Burn after {paste.burnAfterViews} views</Badge> : null}
              </div>
              <PasteLineageBanner
                className="mt-4 border-white/10 bg-white/[0.04]"
                forkedFrom={paste.forkedFrom ?? null}
                replyTo={paste.replyTo ?? null}
              />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Posted by <span className="text-foreground">{authorName}</span> on {formatDate(paste.createdAt)}.
                Updated {formatDate(paste.updatedAt)}.
              </p>
            </div>

            <div className="no-print flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => copyLink("share")}>
                <Share2 className="h-4 w-4" />
                Copy link
              </Button>
              <Button type="button" variant="outline" onClick={() => copyLink("raw")}>
                <Copy className="h-4 w-4" />
                Copy raw URL
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={forkHref} prefetch={false} title="Open workspace with a fork of this paste">
                  <GitFork className="h-4 w-4" />
                  Fork
                </Link>
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={replyHref} prefetch={false} title="Open workspace with a reply draft">
                  <MessageSquareReply className="h-4 w-4" />
                  Reply
                </Link>
              </Button>
              <Button type="button" variant="outline" onClick={handlePrintPaste}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                disabled={locked}
                type="button"
                variant="outline"
                onClick={() => setCodeImageOpen(true)}
                title={locked ? "Unlock the paste to export code as an image" : "Export code as an image"}
              >
                <ImageIcon className="h-4 w-4" />
                Code image
              </Button>
              <Button disabled={locked} onClick={downloadMainPaste} type="button" variant="outline">
                <Download className="h-4 w-4" />
                Download
              </Button>
              {locked ? (
                <Button disabled type="button" variant="outline">
                  <FileDown className="h-4 w-4" />
                  Download raw
                </Button>
              ) : (
                <Button asChild type="button" variant="outline">
                  <Link href={`/raw/${paste.slug}?download=1`} prefetch={false}>
                    <FileDown className="h-4 w-4" />
                    Download raw
                  </Link>
                </Button>
              )}
              <Button asChild type="button" variant="ghost">
                <Link href={`/raw/${paste.slug}`}>Raw</Link>
              </Button>
              <Button disabled={!signedIn || pendingStar || locked} onClick={handleStar} type="button" variant="secondary">
                <Star className="h-4 w-4" />
                {paste.starredByViewer ? "Starred" : "Star"} ({paste.stars})
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {locked ? (
            <Card className="border-amber-400/20 bg-amber-400/5">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-400/10 p-3 text-amber-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Password required</h2>
                    <p className="text-sm text-muted-foreground">
                      This paste is protected. Enter the password to view the content and comments.
                    </p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleUnlock}>
                  <Input
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Paste password"
                    type="password"
                    value={password}
                  />
                  {unlockError ? <p className="text-sm text-destructive">{unlockError}</p> : null}
                  <Button disabled={pendingUnlock} type="submit">
                    {pendingUnlock ? "Unlocking..." : "Unlock paste"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {paste.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {paste.tags.map((tag) => (
                    <Badge key={tag}>#{tag}</Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-border/80 bg-muted/30 px-3 py-2 dark:bg-black/20">
                  {paste.language === "markdown" ? (
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5"
                      role="group"
                      aria-label="Markdown view"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={mdView === "source" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setMdView("source")}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        Source
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mdView === "preview" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setMdView("preview")}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </div>
                  ) : paste.language === "markup" ? (
                    <div
                      className="flex items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5"
                      role="group"
                      aria-label="HTML view"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={htmlView === "source" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setHtmlView("source")}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        Source
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={htmlView === "preview" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setHtmlView("preview")}
                      >
                        <AppWindow className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Code view</span>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={showLineNumbers}
                        onChange={(e) => setShowLineNumbers(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                        aria-label="Show line numbers"
                      />
                      Line numbers
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={showLineSeparators}
                        onChange={(e) => setShowLineSeparators(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                        aria-label="Show horizontal line guides"
                      />
                      Line guides
                    </label>
                  </div>
                </div>

                {paste.language === "markdown" && mdView === "preview" ? (
                  <div
                    className="wox-user-markdown wox-markdown-preview min-h-[50vh] overflow-auto rounded-[1.25rem] border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground dark:bg-black/30"
                    dangerouslySetInnerHTML={{
                      __html: markdownPreviewHtml || "<p class=\"text-muted-foreground\">Nothing to preview.</p>"
                    }}
                  />
                ) : paste.language === "markup" && htmlView === "preview" ? (
                  <SandboxedHtmlPreviewFrame html={paste.content} />
                ) : (
                  <PrismLineMap
                    content={paste.content}
                    language={paste.language}
                    showLineNumbers={showLineNumbers}
                    showLineSeparators={showLineSeparators}
                  />
                )}
              </div>

              {paste.files.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Attached files</h2>
                    <p className="text-sm text-muted-foreground">
                      Multi-file pastes stay grouped together so shared snippets keep their context.
                    </p>
                  </div>
                  {paste.files.map((file) => {
                    const isMedia = isPasteFileMedia(file);
                    const mediaSrc = isMedia ? dataUrlFromPasteFile(file) : null;
                    return (
                      <div key={`${file.filename}-${file.language}-${file.mediaKind ?? "text"}`} className="space-y-3">
                        <div className="no-print flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{file.filename}</p>
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                              {isMedia ? (
                                <span className="capitalize">{file.mediaKind}</span>
                              ) : (
                                file.language
                              )}
                              {file.mimeType ? (
                                <span className="normal-case text-muted-foreground/80"> · {file.mimeType}</span>
                              ) : null}
                            </p>
                          </div>
                          <Button
                            onClick={() => downloadPasteFile(file)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                        {isMedia && mediaSrc ? (
                          <div className="overflow-hidden rounded-[1rem] border border-border bg-muted/30">
                            {file.mediaKind === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt="" className="max-h-[min(80vh,640px)] w-full object-contain" src={mediaSrc} />
                            ) : (
                              <video
                                className="max-h-[min(80vh,640px)] w-full"
                                controls
                                preload="metadata"
                                src={mediaSrc}
                              />
                            )}
                          </div>
                        ) : isMedia ? (
                          <p className="text-sm text-destructive">This attachment could not be displayed.</p>
                        ) : file.language === "markup" ? (
                          <MarkupAttachmentViewer
                            file={file}
                            showLineNumbers={showLineNumbers}
                            showLineSeparators={showLineSeparators}
                          />
                        ) : (
                          <PrismLineMap
                            content={file.content}
                            language={file.language}
                            showLineNumbers={showLineNumbers}
                            showLineSeparators={showLineSeparators}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="no-print grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Discussion</p>
                <h2 className="mt-2 text-2xl font-semibold">Comments</h2>
              </div>
              <Badge>{comments.length} messages</Badge>
            </div>
            <Separator />
            {locked ? (
              <p className="text-sm text-muted-foreground">Unlock the paste to read or post comments.</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comments yet. The first reply usually sets the tone.
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((entry) => (
                  <div key={entry.id} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-medium text-foreground">
                        {entry.displayName || entry.username}
                      </div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!locked ? (
              signedIn ? (
                <form className="space-y-4" onSubmit={handleComment}>
                  <Textarea
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add a thoughtful comment"
                    value={comment}
                  />
                  {commentError ? <p className="text-sm text-destructive">{commentError}</p> : null}
                  <Button disabled={pendingComment || !comment.trim()} type="submit">
                    <MessageSquare className="h-4 w-4" />
                    {pendingComment ? "Posting..." : "Post comment"}
                  </Button>
                </form>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                  Sign in to join the discussion or star this paste.
                </div>
              )
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Metadata</p>
              <h2 className="mt-2 text-2xl font-semibold">Share details</h2>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              {paste.forkedFrom || paste.replyTo ? (
                <PasteLineageBanner
                  className="border-white/10 bg-white/[0.03]"
                  forkedFrom={paste.forkedFrom ?? null}
                  replyTo={paste.replyTo ?? null}
                />
              ) : null}
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-foreground">Slug</p>
                <p className="mt-2 font-mono text-xs">{paste.slug}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-foreground">Visibility</p>
                <p className="mt-2">
                  {paste.visibility === "public"
                    ? "Listed in the public feed."
                    : paste.visibility === "unlisted"
                      ? "Available by direct link only."
                      : "Visible only to the owner and moderators."}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-foreground">Activity</p>
                <p className="mt-2">{paste.commentsCount} comments and {paste.stars} stars.</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Moderation</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Flag content that should be reviewed by moderators.
                  </p>
                </div>
                <Button onClick={() => setReportOpen((value) => !value)} type="button" variant="outline">
                  <Flag className="h-4 w-4" />
                  {reportOpen ? "Hide form" : "Report"}
                </Button>
              </div>

              {reportOpen ? (
                <form className="space-y-4" onSubmit={handleReport}>
                  <Input
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="Reason"
                    value={reportReason}
                  />
                  <Textarea
                    onChange={(event) => setReportNotes(event.target.value)}
                    placeholder="Optional notes for moderators"
                    value={reportNotes}
                  />
                  <Button type="submit" variant="destructive">
                    Submit report
                  </Button>
                </form>
              ) : null}

              {reportState ? <p className="text-sm text-muted-foreground">{reportState}</p> : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <CodeImageDialog
        open={codeImageOpen}
        onOpenChange={setCodeImageOpen}
        content={paste.content}
        language={paste.language}
        exportBasename={paste.title}
      />
    </main>
  );
}
