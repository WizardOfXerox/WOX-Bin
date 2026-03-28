"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
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
  Printer,
  Share2,
  Star
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/site/site-header";
import { Textarea } from "@/components/ui/textarea";
import { PasteLineageBanner } from "@/components/paste-lineage-banner";
import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";
import { PrismLineMap } from "@/components/workspace/prism-line-map";
import { buildThreadedComments, commentAuthorLabel } from "@/lib/comment-thread";
import { getPasteShareUrl } from "@/lib/paste-links";
import { rememberViewedPaste } from "@/lib/paste-view-history";
import {
  readHtmlViewPref,
  readLineGuidesPref,
  readLineNumbersPref,
  readMarkdownViewPref,
  readWordWrapPref,
  writeHtmlViewPref,
  writeLineGuidesPref,
  writeLineNumbersPref,
  writeMarkdownViewPref,
  writeWordWrapPref,
  type PublicPasteHtmlView,
  type PublicPasteMdView
} from "@/lib/public-paste-view-prefs";
import type { UiLanguage } from "@/lib/i18n";
import { dataUrlFromPasteFile, isPasteFileMedia } from "@/lib/paste-file-media";
import { pasteBodyDownloadFilename, safeDownloadBasename } from "@/lib/paste-download";
import { PUBLIC_PASTE_COPY } from "@/lib/public-paste-copy";
import type { PasteFileDraft, PublicPasteRecord } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

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

const ShareAnywhereDialog = dynamic(
  () => import("@/components/share/share-anywhere").then((mod) => mod.ShareAnywhereDialog),
  { loading: () => null }
);

const CodeImageDialog = dynamic(
  () => import("@/components/workspace/code-image-dialog").then((mod) => mod.CodeImageDialog),
  { loading: () => null }
);

function SandboxedHtmlPreviewFrame({
  html,
  className,
  title,
  body,
  footer
}: {
  html: string;
  className?: string;
  title: string;
  body: string;
  footer: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-muted/30 dark:bg-black/20",
        className
      )}
    >
      <div className="border-b border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50">
        <strong className="font-semibold">{title}</strong> {body}
      </div>
      <iframe
        className="h-[min(70vh,900px)] w-full border-0 bg-white dark:bg-zinc-950"
        title="HTML preview (scripts enabled)"
        sandbox={RISKY_HTML_PREVIEW_SANDBOX}
        referrerPolicy="no-referrer"
        srcDoc={html}
      />
      <p className="border-t border-border/80 px-3 py-2 text-[11px] leading-snug text-muted-foreground">{footer}</p>
    </div>
  );
}

function MarkupAttachmentViewer({
  file,
  showLineNumbers,
  showLineSeparators,
  wrapLongLines,
  sourceLabel,
  previewLabel,
  riskTitle,
  riskBody,
  riskFooter
}: {
  file: PasteFileDraft;
  showLineNumbers: boolean;
  showLineSeparators: boolean;
  wrapLongLines: boolean;
  sourceLabel: string;
  previewLabel: string;
  riskTitle: string;
  riskBody: string;
  riskFooter: string;
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
          {sourceLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "preview" ? "secondary" : "ghost"}
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setView("preview")}
        >
          <AppWindow className="h-3.5 w-3.5" />
          {previewLabel}
        </Button>
      </div>
      {view === "preview" ? (
        <SandboxedHtmlPreviewFrame
          body={riskBody}
          footer={riskFooter}
          html={file.content}
          title={riskTitle}
        />
      ) : (
        <PrismLineMap
          content={file.content}
          language={file.language}
          linkifyUrls
          showLineNumbers={showLineNumbers}
          showLineSeparators={showLineSeparators}
          wrapLongLines={wrapLongLines}
        />
      )}
    </div>
  );
}

type Props = {
  initialPaste: PublicPasteRecord;
  initialComments: CommentRecord[];
  initialLocked: boolean;
  initialAccessRequirement: "password" | "captcha" | null;
  signedIn: boolean;
  language: UiLanguage;
};

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null;
}

export function PublicPasteShell({
  initialPaste,
  initialComments,
  initialLocked,
  initialAccessRequirement,
  signedIn,
  language
}: Props) {
  const copy = PUBLIC_PASTE_COPY[language];
  const [paste, setPaste] = useState(initialPaste);
  const [comments, setComments] = useState(initialComments);
  const [locked, setLocked] = useState(initialLocked);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState(false);
  const [accessRequirement, setAccessRequirement] = useState<"password" | "captcha" | null>(initialAccessRequirement);
  const [pendingStar, setPendingStar] = useState(false);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [pendingComment, setPendingComment] = useState(false);
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(copy.defaultReportReason);
  const [reportNotes, setReportNotes] = useState("");
  const [reportState, setReportState] = useState<string | null>(null);
  const [codeImageOpen, setCodeImageOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showLineSeparators, setShowLineSeparators] = useState(true);
  const [wrapLongLines, setWrapLongLines] = useState(true);
  const [mdView, setMdView] = useState<PublicPasteMdView>("source");
  const [htmlView, setHtmlView] = useState<PublicPasteHtmlView>("source");
  const [viewerPrefsReady, setViewerPrefsReady] = useState(false);
  const [markdownPreviewHtml, setMarkdownPreviewHtml] = useState("");
  const [markdownPreviewPending, setMarkdownPreviewPending] = useState(false);
  const deferredMarkdownPreviewSource = useDeferredValue(
    paste.language === "markdown" && mdView === "preview" ? paste.content : ""
  );

  const threadedComments = useMemo(() => buildThreadedComments(comments), [comments]);
  const replyTarget = replyToId != null ? comments.find((entry) => entry.id === replyToId) ?? null : null;
  const replyPlaceholder = replyTarget
    ? copy.replyPlaceholder.replace("{author}", commentAuthorLabel(replyTarget))
    : copy.commentPlaceholder;

  useEffect(() => {
    void Promise.resolve().then(() => {
      setShowLineNumbers(readLineNumbersPref());
      setShowLineSeparators(readLineGuidesPref());
      setWrapLongLines(readWordWrapPref());
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
    writeWordWrapPref(wrapLongLines);
  }, [wrapLongLines, viewerPrefsReady]);

  useEffect(() => {
    if (locked) {
      return;
    }
    rememberViewedPaste(paste);
  }, [locked, paste]);

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

  useEffect(() => {
    if (paste.language !== "markdown" || mdView !== "preview") {
      setMarkdownPreviewPending(false);
      return;
    }

    const source = deferredMarkdownPreviewSource;
    if (!source.trim()) {
      setMarkdownPreviewHtml("");
      setMarkdownPreviewPending(false);
      return;
    }

    let cancelled = false;
    setMarkdownPreviewPending(true);

    void import("@/lib/markdown/parse-user-markdown")
      .then(({ parseUserMarkdown }) => {
        if (cancelled) {
          return;
        }
        setMarkdownPreviewHtml(parseUserMarkdown(source, { breaks: true }));
        setMarkdownPreviewPending(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setMarkdownPreviewHtml("");
        setMarkdownPreviewPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredMarkdownPreviewSource, mdView, paste.language]);

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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const title = paste.title?.trim() || paste.slug;
    document.title = `${title} — WOX-Bin`;
  }, [paste.slug, paste.title]);

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
        setAccessRequirement(null);
      }
    } else if (pasteResponse.status === 423) {
      const body = await readJson<{ lockReason?: "password" | "captcha"; requiresPassword?: boolean; requiresCaptcha?: boolean }>(pasteResponse);
      setLocked(true);
      setAccessRequirement(body?.lockReason ?? (body?.requiresCaptcha ? "captcha" : body?.requiresPassword ? "password" : null));
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
    try {
      const response = await fetch(`/api/pastes/${paste.slug}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: password.trim() || undefined,
          turnstileToken: readTurnstileToken(event.currentTarget)
        })
      });

      if (!response.ok) {
        const body = await readJson<{
          error?: string;
          lockReason?: "password" | "captcha";
          requiresPassword?: boolean;
          requiresCaptcha?: boolean;
        }>(response);
        const nextRequirement =
          body?.lockReason ?? (body?.requiresCaptcha ? "captcha" : body?.requiresPassword ? "password" : null);

        if (response.status === 423 && nextRequirement) {
          setAccessRequirement(nextRequirement);
          setUnlockError(
            nextRequirement === "password"
              ? copy.unlockCaptchaStepUp
              : body?.error ?? copy.verificationDescription
          );
          return;
        }

        setUnlockError(body?.error ?? copy.unlockGenericError);
        return;
      }

      await refreshPaste();
      setPassword("");
    } finally {
      resetTurnstileFields(event.currentTarget);
      setPendingUnlock(false);
    }
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
        content: comment,
        parentId: replyTarget?.id ?? null
      })
    });

    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      setCommentError(body?.error ?? copy.commentGenericError);
      setPendingComment(false);
      return;
    }

    setComment("");
    setReplyToId(null);
    await refreshPaste();
    setPendingComment(false);
  }

  async function handleReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportState(copy.reportSending);

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
      setReportState(body?.error ?? copy.reportGenericError);
      return;
    }

    setReportNotes("");
    setReportOpen(false);
    setReportState(copy.reportSubmitted);
  }

  async function copyLink(target: "share" | "raw") {
    const href =
      target === "raw"
        ? `${window.location.origin}/raw/${paste.slug}`
        : getPasteShareUrl(window.location.origin, paste.slug, paste.secretMode);

    await navigator.clipboard.writeText(href);
  }

  function handlePrintPaste() {
    if (typeof window === "undefined") {
      return;
    }
    window.print();
  }

  const authorName = paste.author.displayName || paste.author.username || copy.anonymous;
  const authorProfileHref = paste.author.username ? `/u/${encodeURIComponent(paste.author.username)}` : null;
  const forkHref = `/app?fork=${encodeURIComponent(paste.slug)}`;
  const secretMode = paste.secretMode;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = getPasteShareUrl(origin, paste.slug, paste.secretMode);
  const rawUrl = `${origin}/raw/${paste.slug}`;
  const rawDownloadPath = `/raw/${paste.slug}?download=1`;
  const downloadCheckHref = `/download-check?to=${encodeURIComponent(rawDownloadPath)}&label=${encodeURIComponent(
    pasteBodyDownloadFilename(paste)
  )}`;
  const attachmentDownloadHref = (index: number, file: PasteFileDraft) =>
    `/download-check?to=${encodeURIComponent(`/file/${paste.slug}/${index}?download=1`)}&label=${encodeURIComponent(
      safeDownloadBasename(file.filename, "attachment")
    )}`;

  return (
    <main className="wox-public-paste-print-root mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8 md:px-6 md:py-10">
      <SiteHeader className="print:hidden" />
      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.03] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {secretMode ? copy.secretEyebrow : copy.publicEyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {paste.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge>
                  {paste.visibility === "public"
                    ? copy.visibilityBadgePublic
                    : paste.visibility === "unlisted"
                      ? copy.visibilityBadgeUnlisted
                      : copy.visibilityBadgePrivate}
                </Badge>
                <Badge>{paste.language}</Badge>
                {secretMode ? <Badge>{copy.secretModeBadge}</Badge> : null}
                {paste.category ? <Badge>{paste.category}</Badge> : null}
                {paste.requiresPassword ? <Badge>{copy.passwordProtectedBadge}</Badge> : null}
                {paste.requiresCaptcha ? <Badge>{copy.captchaRequiredBadge}</Badge> : null}
                {paste.burnAfterRead ? <Badge>{copy.burnAfterReadBadge}</Badge> : null}
                {paste.burnAfterViews > 0 ? <Badge>{copy.burnAfterViewsBadge(paste.burnAfterViews)}</Badge> : null}
              </div>
              <PasteLineageBanner
                className="mt-4 border-white/10 bg-white/[0.04]"
                forkedFrom={paste.forkedFrom ?? null}
                replyTo={paste.replyTo ?? null}
              />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {authorProfileHref ? (
                  <Link className="text-foreground underline-offset-4 hover:text-primary hover:underline" href={authorProfileHref}>
                    {authorName}
                  </Link>
                ) : (
                  <span className="text-foreground">{authorName}</span>
                )}{" "}
                · {copy.updatedViews(formatDate(paste.updatedAt), paste.viewCount)}
                {secretMode ? ` ${copy.secretLead}` : null}
              </p>
            </div>

            <div className="no-print grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
              <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                {copy.share}
              </Button>
              <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => copyLink("share")}>
                <Copy className="h-4 w-4" />
                {copy.copyLink}
              </Button>
              <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={() => copyLink("raw")}>
                <Copy className="h-4 w-4" />
                {copy.copyRawLink}
              </Button>
              <Button asChild className="w-full sm:w-auto" type="button" variant="outline">
                <Link href={forkHref} prefetch={false} title={copy.forkTitle}>
                  <GitFork className="h-4 w-4" />
                  {copy.fork}
                </Link>
              </Button>
              <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={handlePrintPaste}>
                <Printer className="h-4 w-4" />
                {copy.print}
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={locked}
                type="button"
                variant="outline"
                onClick={() => setCodeImageOpen(true)}
                title={locked ? copy.codeImageLockedTitle : copy.codeImageReadyTitle}
              >
                <ImageIcon className="h-4 w-4" />
                {copy.codeImage}
              </Button>
              {locked ? (
                <Button className="w-full sm:w-auto" disabled type="button" variant="outline">
                  <Download className="h-4 w-4" />
                  {copy.download}
                </Button>
              ) : (
                <Button asChild className="w-full sm:w-auto" type="button" variant="outline">
                  <Link href={downloadCheckHref} prefetch={false}>
                    <Download className="h-4 w-4" />
                    {copy.download}
                  </Link>
                </Button>
              )}
              {locked ? (
                <Button className="w-full sm:w-auto" disabled type="button" variant="outline">
                  <FileDown className="h-4 w-4" />
                  {copy.downloadRaw}
                </Button>
              ) : (
                <Button asChild className="w-full sm:w-auto" type="button" variant="outline">
                  <Link href={downloadCheckHref} prefetch={false}>
                    <FileDown className="h-4 w-4" />
                    {copy.downloadRaw}
                  </Link>
                </Button>
              )}
              <Button asChild className="w-full sm:w-auto" type="button" variant="outline">
                <Link href={`/raw/${paste.slug}`} prefetch={false}>
                  <Code2 className="h-4 w-4" />
                  {copy.raw}
                </Link>
              </Button>
              {!secretMode ? (
                <Button
                  className="col-span-2 w-full sm:col-auto sm:w-auto"
                  disabled={!signedIn || pendingStar || locked}
                  onClick={handleStar}
                  type="button"
                  variant="secondary"
                >
                  <Star className="h-4 w-4" />
                  {paste.starredByViewer ? copy.starred : copy.star} ({paste.stars})
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <ShareAnywhereDialog
          onOpenChange={setShareOpen}
          open={shareOpen}
          rawUrl={rawUrl}
          text={copy.shareDialogText(secretMode ? copy.secretEyebrow : copy.publicEyebrow)}
          title={paste.title}
          url={shareUrl}
        />

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {locked ? (
            <Card className="border-amber-400/20 bg-amber-400/5">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-400/10 p-3 text-amber-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {accessRequirement === "captcha" ? copy.verificationRequired : copy.passwordRequired}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {accessRequirement === "captcha"
                        ? copy.verificationDescription
                        : copy.passwordDescription}
                    </p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleUnlock}>
                  {accessRequirement === "captcha" ? (
                    <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
                  ) : (
                    <Input
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      type="password"
                      value={password}
                    />
                  )}
                  {unlockError ? <p className="text-sm text-destructive">{unlockError}</p> : null}
                  <Button disabled={pendingUnlock} type="submit">
                    {pendingUnlock
                      ? accessRequirement === "captcha"
                        ? copy.verifying
                        : copy.unlocking
                      : accessRequirement === "captcha"
                        ? copy.verifyAndContinue
                        : copy.unlockPaste}
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
                <div className="no-print flex flex-col gap-3 rounded-[1rem] border border-border/80 bg-muted/30 px-3 py-2 dark:bg-black/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  {paste.language === "markdown" ? (
                    <div
                      className="flex w-full items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5 sm:w-auto"
                      role="group"
                      aria-label={copy.codeView}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={mdView === "source" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setMdView("source")}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        {copy.source}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mdView === "preview" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setMdView("preview")}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {copy.preview}
                      </Button>
                    </div>
                  ) : paste.language === "markup" ? (
                    <div
                      className="flex w-full items-center gap-0.5 rounded-lg border border-border bg-background/80 p-0.5 sm:w-auto"
                      role="group"
                      aria-label={copy.codeView}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={htmlView === "source" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setHtmlView("source")}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        {copy.source}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={htmlView === "preview" ? "secondary" : "ghost"}
                        className="h-8 gap-1.5 px-2.5"
                        onClick={() => setHtmlView("preview")}
                      >
                        <AppWindow className="h-3.5 w-3.5" />
                        {copy.preview}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{copy.codeView}</span>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={showLineNumbers}
                        onChange={(e) => setShowLineNumbers(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                        aria-label={copy.lineNumbers}
                      />
                      {copy.lineNumbers}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={showLineSeparators}
                        onChange={(e) => setShowLineSeparators(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                        aria-label={copy.lineGuides}
                      />
                      {copy.lineGuides}
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 select-none">
                      <input
                        type="checkbox"
                        checked={wrapLongLines}
                        onChange={(e) => setWrapLongLines(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary"
                        aria-label={copy.wordWrap}
                      />
                      {copy.wordWrap}
                    </label>
                  </div>
                </div>

                {paste.language === "markdown" && mdView === "preview" ? (
                  <div
                    aria-busy={markdownPreviewPending}
                    className="wox-user-markdown wox-markdown-preview min-h-[50vh] overflow-auto rounded-[1.25rem] border border-border bg-muted/60 p-4 text-sm leading-relaxed text-foreground dark:bg-black/30"
                    dangerouslySetInnerHTML={{
                      __html: markdownPreviewPending
                        ? `<p class="text-muted-foreground">${copy.renderingPreview}</p>`
                        : markdownPreviewHtml || `<p class="text-muted-foreground">${copy.nothingToPreview}</p>`
                    }}
                  />
                ) : paste.language === "markup" && htmlView === "preview" ? (
                  <SandboxedHtmlPreviewFrame
                    body={copy.untrustedHtmlRiskBody}
                    footer={copy.untrustedHtmlRiskFooter}
                    html={paste.content}
                    title={copy.untrustedHtmlRiskTitle}
                  />
                ) : (
                  <PrismLineMap
                    content={paste.content}
                    language={paste.language}
                    linkifyUrls
                    showLineNumbers={showLineNumbers}
                    showLineSeparators={showLineSeparators}
                    wrapLongLines={wrapLongLines}
                  />
                )}
              </div>

                {paste.files.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">{copy.attachedFiles}</h2>
                    <p className="text-sm text-muted-foreground">{copy.attachedFilesDescription}</p>
                  </div>
                  {paste.files.map((file, index) => {
                    const isMedia = isPasteFileMedia(file);
                    const mediaSrc = isMedia ? dataUrlFromPasteFile(file) : null;
                    return (
                      <div key={`${file.filename}-${file.language}-${file.mediaKind ?? "text"}`} className="space-y-3">
                        <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{file.filename}</p>
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                              {isMedia ? (
                                <span className="capitalize">
                                  {file.mediaKind === "image" ? copy.imageKind : copy.videoKind}
                                </span>
                              ) : (
                                file.language
                              )}
                              {file.mimeType ? (
                                <span className="normal-case text-muted-foreground/80"> · {file.mimeType}</span>
                              ) : null}
                            </p>
                          </div>
                          <Button asChild className="w-full sm:w-auto" size="sm" type="button" variant="outline">
                            <Link href={attachmentDownloadHref(index, file)} prefetch={false}>
                              <Download className="h-4 w-4" />
                              Download
                            </Link>
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
                          <p className="text-sm text-destructive">{copy.attachmentDisplayError}</p>
                        ) : file.language === "markup" ? (
                          <MarkupAttachmentViewer
                            file={file}
                            riskBody={copy.untrustedHtmlRiskBody}
                            riskFooter={copy.untrustedHtmlRiskFooter}
                            riskTitle={copy.untrustedHtmlRiskTitle}
                            showLineNumbers={showLineNumbers}
                            showLineSeparators={showLineSeparators}
                            sourceLabel={copy.source}
                            previewLabel={copy.preview}
                            wrapLongLines={wrapLongLines}
                          />
                        ) : (
                          <PrismLineMap
                            content={file.content}
                            language={file.language}
                            linkifyUrls
                            showLineNumbers={showLineNumbers}
                            showLineSeparators={showLineSeparators}
                            wrapLongLines={wrapLongLines}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{copy.discussionEyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold">{copy.commentsTitle}</h2>
              </div>
              <Badge>{copy.messages(comments.length)}</Badge>
            </div>
            <Separator />
            {secretMode ? (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                {copy.secretNoComments}
              </div>
            ) : locked ? (
              <p className="text-sm text-muted-foreground">{copy.unlockToComments}</p>
            ) : threadedComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.noComments}</p>
            ) : (
              <div className="space-y-4">
                {threadedComments.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4"
                    style={{ marginLeft: `${entry.depth * 16}px` }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-medium text-foreground">{commentAuthorLabel(entry)}</div>
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    {entry.parentAuthor ? (
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {copy.replyingTo(entry.parentAuthor)}
                      </p>
                    ) : null}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                      {entry.content}
                    </p>
                    {signedIn ? (
                      <div className="mt-3 flex">
                        <Button
                          onClick={() => setReplyToId((current) => (current === entry.id ? null : entry.id))}
                          size="sm"
                          type="button"
                          variant={replyToId === entry.id ? "secondary" : "ghost"}
                        >
                          {replyToId === entry.id ? copy.cancelReply : copy.reply}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {!locked && !secretMode ? (
              signedIn ? (
                <form className="space-y-4" onSubmit={handleComment}>
                  {replyTarget ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-muted-foreground">
                      {copy.replyingTo(commentAuthorLabel(replyTarget))}
                    </div>
                  ) : null}
                  <Textarea
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={replyPlaceholder}
                    value={comment}
                  />
                  {commentError ? <p className="text-sm text-destructive">{commentError}</p> : null}
                  <Button disabled={pendingComment || !comment.trim()} type="submit">
                    <MessageSquare className="h-4 w-4" />
                    {pendingComment ? copy.postingComment : replyTarget ? copy.postReply : copy.postComment}
                  </Button>
                </form>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-black/10 p-4 text-sm text-muted-foreground">
                  {copy.signInToJoin}
                </div>
              )
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{copy.metadataEyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold">{copy.shareDetailsTitle}</h2>
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
                <p className="font-medium text-foreground">{copy.slugLabel}</p>
                <p className="mt-2 font-mono text-xs">{paste.slug}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-foreground">{copy.visibilityLabel}</p>
                  <p className="mt-2">
                    {secretMode
                      ? copy.visibilitySecret
                      : paste.visibility === "public"
                        ? copy.visibilityPublic
                    : paste.visibility === "unlisted"
                        ? copy.visibilityUnlisted
                        : copy.visibilityPrivate}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-medium text-foreground">{copy.activityLabel}</p>
                <p className="mt-2">
                  {secretMode
                    ? copy.activitySecret(paste.viewCount)
                    : copy.activityPublic(paste.commentsCount, paste.stars)}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{copy.moderationEyebrow}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{copy.moderationBody}</p>
                </div>
                <Button onClick={() => setReportOpen((value) => !value)} type="button" variant="outline">
                  <Flag className="h-4 w-4" />
                  {reportOpen ? copy.hideReportForm : copy.report}
                </Button>
              </div>

              {reportOpen ? (
                <form className="space-y-4" onSubmit={handleReport}>
                  <Input
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder={copy.reasonPlaceholder}
                    value={reportReason}
                  />
                  <Textarea
                    onChange={(event) => setReportNotes(event.target.value)}
                    placeholder={copy.notesPlaceholder}
                    value={reportNotes}
                  />
                  <Button type="submit" variant="destructive">
                    {copy.submitReport}
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
