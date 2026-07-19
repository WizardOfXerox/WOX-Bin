"use client";

import { useState, ChangeEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Clipboard,
  Copy,
  ExternalLink,
  FileLock2,
  HardDriveUpload,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Paperclip,
  Trash2,
  Check,
  FileDown,
} from "lucide-react";

import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site/site-header";
import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { cn } from "@/lib/utils";

type UploadedFile = {
  filename: string;
  content: string; // base64 string
  mimeType: string;
  mediaKind: "image" | "video" | "file" | null;
  sizeBytes: number;
};

type PublishResponse = {
  paste: {
    slug: string;
    secretMode: boolean;
  };
};

export default function FileSharePage() {
  const { data: session } = useSession();
  const { t } = useUiLanguage();
  const signedIn = Boolean(session?.user);

  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("unlisted");
  const [secretMode, setSecretMode] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ slug: string; secretMode: boolean } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function readFileAsBase64(file: File): Promise<{ content: string; mimeType: string; mediaKind: "image" | "video" | "file" }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const comma = result.indexOf(",");
        if (comma < 0) {
          reject(new Error("Invalid file content format."));
          return;
        }
        const mimeType = file.type || "application/octet-stream";
        let mediaKind: "image" | "video" | "file" = "file";
        if (mimeType.startsWith("image/")) {
          mediaKind = "image";
        } else if (mimeType.startsWith("video/")) {
          mediaKind = "video";
        }
        const content = result.slice(comma + 1);
        resolve({ content, mimeType, mediaKind });
      };
      reader.onerror = () => reject(reader.error ?? new Error("File reading failed."));
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(selected: File[]) {
    if (!selected.length) return;
    setError(null);

    const nextFiles = [...files];
    for (const file of selected) {
      if (nextFiles.some((f) => f.filename === file.name)) {
        continue;
      }
      try {
        const { content, mimeType, mediaKind } = await readFileAsBase64(file);
        nextFiles.push({
          filename: file.name,
          content,
          mimeType,
          mediaKind,
          sizeBytes: file.size,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load selected file.");
      }
    }
    setFiles(nextFiles);
    if (!title && nextFiles.length > 0) {
      setTitle(nextFiles[0].filename);
    }
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    await handleFiles(selected);
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    const selected = Array.from(event.dataTransfer.files || []);
    await handleFiles(selected);
  }

  function handleRemoveFile(index: number) {
    const nextFiles = files.filter((_, idx) => idx !== index);
    setFiles(nextFiles);
    if (nextFiles.length === 0) {
      setTitle("");
    } else if (title === files[index]?.filename) {
      setTitle(nextFiles[0].filename);
    }
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Please add at least one file to upload.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessData(null);

    const payload = {
      title: title.trim() || files[0].filename,
      content: `Uploaded files:\n${files.map((f) => `- ${f.filename}`).join("\n")}`,
      language: "markdown",
      visibility: signedIn ? visibility : (secretMode ? "unlisted" : "unlisted"),
      password: password.trim() || null,
      secretMode: !signedIn ? secretMode : false,
      captchaRequired,
      burnAfterRead,
      burnAfterViews: 0,
      tags: ["file-upload"],
      folderName: null,
      category: null,
      files: files.map((f) => ({
        filename: f.filename,
        content: f.content,
        language: "none",
        mediaKind: f.mediaKind,
        mimeType: f.mimeType,
      })),
      turnstileToken: !signedIn ? readTurnstileToken() : undefined,
    };

    try {
      const endpoint = signedIn ? "/api/workspace/pastes" : "/api/public/pastes";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as { error?: string; paste?: { slug: string; secretMode?: boolean } } | null;
      if (!response.ok || !body || !body.paste) {
        setError(body?.error ?? "Could not upload files.");
        return;
      }

      setSuccessData({
        slug: body.paste.slug,
        secretMode: Boolean(body.paste.secretMode),
      });
      setFiles([]);
      setTitle("");
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      resetTurnstileFields();
      setLoading(false);
    }
  }

  function handleCopyText(text: string, type: "all" | number) {
    void navigator.clipboard.writeText(text);
    if (type === "all") {
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2000);
    } else {
      setCopiedIndex(type);
      window.setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-hero-mesh opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <SiteHeader className="mb-8" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-0">
              <div className="border-b border-border/70 bg-gradient-to-br from-teal-500/12 via-transparent to-emerald-500/12 px-6 py-6">
                <Badge className="px-3 py-1 text-xs">File share service</Badge>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Upload attachments and files directly.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  Direct binary or text file sharing. Choose your files, set access controls, and get instant direct links for image viewports, stream layouts, or text downloads.
                </p>
              </div>

              <div className="space-y-5 px-6 pb-6">
                {/* Drag-and-Drop Zone */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Files</label>
                  <label
                    className={cn(
                      "flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed px-4 py-6 text-center transition-all duration-300",
                      isDragging
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-border bg-muted/10 hover:bg-muted/20"
                    )}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <Paperclip className="h-10 w-10 text-muted-foreground/60 mb-3" />
                    <span className="text-sm font-medium">Click to select or drag and drop files</span>
                    <span className="text-xs text-muted-foreground mt-1">Images, videos, text, and other documents</span>
                    <input
                      className="hidden"
                      multiple
                      onChange={(event) => void handleFileSelect(event)}
                      type="file"
                    />
                  </label>
                </div>

                {/* Selected Files List */}
                {files.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Selected Files ({files.length})
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-border p-2">
                      {files.map((file, idx) => (
                        <div
                          key={file.filename}
                          className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 text-sm"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate font-medium">{file.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.sizeBytes / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveFile(idx)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Title / Group Name</label>
                      <Input
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Group files title..."
                        value={title}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Success Outcome */}
                {successData ? (
                  <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                      <Check className="h-5 w-5" />
                      <span>Upload completed successfully!</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Paste page link</p>
                        <div className="flex gap-2 mt-1">
                          <Input
                            readOnly
                            value={`${window.location.origin}/${successData.secretMode ? "s" : "p"}/${successData.slug}`}
                          />
                          <Button
                            onClick={() =>
                              handleCopyText(
                                `${window.location.origin}/${successData.secretMode ? "s" : "p"}/${successData.slug}`,
                                "all"
                              )
                            }
                            variant="outline"
                          >
                            {copiedAll ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Direct download links</p>
                        <div className="rounded-lg bg-black/25 p-3 text-xs font-mono space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase">File 1 link:</p>
                          <p className="text-primary hover:underline break-all">
                            <a
                              href={`${window.location.origin}/file/${successData.slug}/0?download=1`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {window.location.origin}/file/{successData.slug}/0?download=1
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Visibility and Controls */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Visibility</label>
                    <select
                      className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
                      disabled={!signedIn && secretMode}
                      onChange={(event) => setVisibility(event.target.value as "public" | "unlisted" | "private")}
                      value={!signedIn || secretMode ? "unlisted" : visibility}
                    >
                      {signedIn ? (
                        <>
                          <option value="private">Private (Account Only)</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="public">Public</option>
                        </>
                      ) : (
                        <option value="unlisted">Unlisted</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2 rounded-[1.25rem] border border-dashed border-border bg-muted/25 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Quotas & Limits</p>
                    <p className="text-xs leading-6 text-muted-foreground">
                      Each file size limit is 5MB for text and 10MB for common images/videos. Files are stored securely.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {!signedIn ? (
                    <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                      <input
                        checked={secretMode}
                        className="mt-1 size-4 accent-primary"
                        onChange={(event) => {
                          setSecretMode(event.target.checked);
                          if (event.target.checked) {
                            setVisibility("unlisted");
                          }
                        }}
                        type="checkbox"
                      />
                      <span className="leading-snug">
                        Classic secret-mode paste
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Uses `/s/...` and stays out of public indexes.
                        </span>
                      </span>
                    </label>
                  ) : null}
                  <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                    <input
                      checked={captchaRequired}
                      className="mt-1 size-4 accent-primary"
                      onChange={(event) => setCaptchaRequired(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="leading-snug">
                      Require Turnstile
                      <span className="mt-1 block text-xs text-muted-foreground">Adds verification check to downloaders.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3 text-sm">
                    <input
                      checked={burnAfterRead}
                      className="mt-1 size-4 accent-primary"
                      onChange={(event) => setBurnAfterRead(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="leading-snug">
                      Burn after download
                      <span className="mt-1 block text-xs text-muted-foreground">Paste and files are destroyed immediately after retrieval.</span>
                    </span>
                  </label>
                  <div className="space-y-2 rounded-[1.25rem] border border-border bg-muted/35 px-4 py-3">
                    <label className="block text-xs uppercase tracking-[0.24em] text-muted-foreground">Password lock</label>
                    <Input
                      autoComplete="new-password"
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Optional download code"
                      type="password"
                      value={password}
                    />
                  </div>
                </div>

                {!signedIn ? (
                  <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
                ) : null}

                {error ? (
                  <p aria-live="assertive" className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button disabled={loading || files.length === 0} onClick={() => void handleUpload()} type="button">
                    {loading ? "Uploading..." : "Upload & Share Files"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Quick Handoff Tips</h2>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong>Direct Link syntax:</strong> Attachments are served dynamically. For a share containing 3 files, they will map to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                    <li>/file/[slug]/0</li>
                    <li>/file/[slug]/1</li>
                    <li>/file/[slug]/2</li>
                  </ul>
                  <p>
                    Append <code>?download=1</code> to force browser download dialogs. Otherwise, supported formats (images, videos, plain text) will render inline.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
