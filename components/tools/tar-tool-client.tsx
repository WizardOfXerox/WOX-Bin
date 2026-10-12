"use client";

import {
  Archive,
  Check,
  Copy,
  Download,
  Eye,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileText,
  Folder,
  Loader2,
  RefreshCw,
  Search,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import {
  createZipFromTarEntries,
  parseTarArchive,
  type TarArchiveInfo,
  type TarEntry
} from "@/lib/tools/tar";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime()) || date.getTime() === 0) {
    return "--";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function getFileIcon(entry: TarEntry) {
  if (entry.type === "directory") {
    return <Folder className="size-4 shrink-0 text-amber-400" />;
  }

  const name = entry.name.toLowerCase();
  if (name.match(/\.(png|jpe?g|webp|svg|gif|bmp|ico)$/)) {
    return <FileImage className="size-4 shrink-0 text-sky-400" />;
  }
  if (name.match(/\.(js|jsx|ts|tsx|py|rs|go|c|cpp|h|css|html|json|yml|yaml|toml|sh|sql)$/)) {
    return <FileCode className="size-4 shrink-0 text-emerald-400" />;
  }
  if (name.match(/\.(txt|md|log|csv|tsv|rtf)$/)) {
    return <FileText className="size-4 shrink-0 text-indigo-400" />;
  }
  if (name.match(/\.(zip|tar|gz|tgz|bz2|xz|7z|rar)$/)) {
    return <FileArchive className="size-4 shrink-0 text-orange-400" />;
  }
  return <File className="size-4 shrink-0 text-muted-foreground" />;
}

function isPreviewableImage(name: string): boolean {
  return !!name.toLowerCase().match(/\.(png|jpe?g|webp|svg|gif|bmp|ico)$/);
}

function isPreviewableText(name: string): boolean {
  return !!name
    .toLowerCase()
    .match(
      /\.(txt|md|json|js|jsx|ts|tsx|css|html|xml|yml|yaml|toml|csv|tsv|sh|bash|py|rs|go|c|cpp|h|sql|env|gitignore|dockerfile)$/i
    );
}

function getImageMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "gif") return "image/gif";
  if (ext === "ico") return "image/x-icon";
  return "image/png";
}

export default function TarToolClient({ className }: { className?: string }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [archiveInfo, setArchiveInfo] = useState<TarArchiveInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "files" | "dirs">("all");

  // File Preview Modal state
  const [previewEntry, setPreviewEntry] = useState<TarEntry | null>(null);
  const [previewContent, setPreviewContent] = useState<{
    type: "image" | "text" | "binary";
    url?: string;
    text?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Clean up preview blob URLs
  useEffect(() => {
    return () => {
      if (previewContent?.url) {
        URL.revokeObjectURL(previewContent.url);
      }
    };
  }, [previewContent]);

  const loadArchive = useCallback(async (selectedFile: File) => {
    setLoading(true);
    setError(null);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const rawBytes = new Uint8Array(buffer);
      const parsed = parseTarArchive(rawBytes);
      setArchiveInfo(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse archive.");
      setArchiveInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onFileInput = useCallback(
    (files: File[]) => {
      const selected = files[0];
      if (!selected) return;
      void loadArchive(selected);
    },
    [loadArchive]
  );

  const clearArchive = useCallback(() => {
    setFile(null);
    setArchiveInfo(null);
    setError(null);
    setSearchQuery("");
    setPreviewEntry(null);
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!archiveInfo) return [];

    let list = archiveInfo.entries;

    if (filterType === "files") {
      list = list.filter((e) => e.type !== "directory");
    } else if (filterType === "dirs") {
      list = list.filter((e) => e.type === "directory");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    return list;
  }, [archiveInfo, filterType, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!archiveInfo) return null;
    let fileCount = 0;
    let dirCount = 0;
    for (const e of archiveInfo.entries) {
      if (e.type === "directory") dirCount++;
      else fileCount++;
    }
    return { fileCount, dirCount };
  }, [archiveInfo]);

  // Download single file
  const handleDownloadSingle = useCallback((entry: TarEntry) => {
    const filename = entry.name.split("/").pop() || "extracted-file";
    const blob = new Blob([new Uint8Array(entry.data)], {
      type: "application/octet-stream"
    });
    downloadBlob(blob, filename);
  }, []);

  // Download all files as ZIP
  const handleDownloadAllZip = useCallback(() => {
    if (!archiveInfo || archiveInfo.entries.length === 0) return;
    try {
      const zipBytes = createZipFromTarEntries(archiveInfo.entries);
      const baseName = file?.name
        ? file.name.replace(/\.(tar\.gz|tgz|tar)$/i, "")
        : "extracted-archive";
      const blob = new Blob([new Uint8Array(zipBytes)], { type: "application/zip" });
      downloadBlob(blob, `${baseName}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bundle files into ZIP.");
    }
  }, [archiveInfo, file]);

  // Open Preview Modal
  const handleOpenPreview = useCallback(
    (entry: TarEntry) => {
      if (entry.type === "directory") return;

      // Clean old url
      if (previewContent?.url) {
        URL.revokeObjectURL(previewContent.url);
      }

      setPreviewEntry(entry);
      setCopied(false);

      if (isPreviewableImage(entry.name)) {
        const mime = getImageMime(entry.name);
        const blob = new Blob([new Uint8Array(entry.data)], { type: mime });
        const url = URL.createObjectURL(blob);
        setPreviewContent({ type: "image", url });
      } else if (isPreviewableText(entry.name) && entry.data.byteLength <= 1024 * 1024) {
        try {
          const text = new TextDecoder("utf-8").decode(entry.data);
          setPreviewContent({ type: "text", text });
        } catch {
          setPreviewContent({ type: "binary" });
        }
      } else {
        setPreviewContent({ type: "binary" });
      }
    },
    [previewContent]
  );

  const handleCopyText = useCallback(() => {
    if (previewContent?.text) {
      void navigator.clipboard.writeText(previewContent.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [previewContent]);

  return (
    <div className={cn(TOOLS_CLIENT_WIDE, className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">TAR & compressed TAR</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Browser · no upload
          </Badge>
          <Badge className="bg-primary/10 text-primary border-primary/20">
            .tar · .tar.gz · .tgz
          </Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          TAR & Compressed TAR Archive Reader
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Inspect, explore, and extract standard POSIX USTAR <span className="font-mono text-xs text-foreground">.tar</span>,{" "}
          <span className="font-mono text-xs text-foreground">.tar.gz</span>, and{" "}
          <span className="font-mono text-xs text-foreground">.tgz</span> archives entirely in your browser. Download single files or re-pack to ZIP.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive sm:text-sm">
          {error}
        </div>
      ) : null}

      {!archiveInfo ? (
        <FileDropSurface
          className="glass-panel min-h-[220px] rounded-2xl p-6 text-center sm:min-h-[260px] sm:p-10"
          onFiles={onFileInput}
          overlayMessage="Drop .tar, .tar.gz, or .tgz here"
        >
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border/80 bg-background/50 shadow-sm backdrop-blur-sm">
              {loading ? (
                <Loader2 className="size-7 animate-spin text-primary" />
              ) : (
                <Archive className="size-7 text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                {loading ? "Reading and unpacking archive..." : "Drop your TAR archive here, or browse"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Supports uncompressed .tar, as well as gzip-compressed .tar.gz and .tgz files.
              </p>
            </div>
            <label
              className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              htmlFor={inputId}
            >
              Choose archive
              <Input
                accept=".tar,.tar.gz,.tgz,application/x-tar,application/gzip,application/x-gzip"
                className="hidden"
                disabled={loading}
                id={inputId}
                onChange={(e) => {
                  if (e.target.files) onFileInput(Array.from(e.target.files));
                }}
                type="file"
              />
            </label>
          </div>
        </FileDropSurface>
      ) : (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="glass-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Archive className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{file?.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {archiveInfo.isCompressed ? "GZIP-compressed TAR" : "Uncompressed TAR"}
                    </span>
                    <span>·</span>
                    <span>
                      {stats?.fileCount} file{stats?.fileCount === 1 ? "" : "s"}
                      {stats?.dirCount ? `, ${stats.dirCount} folder${stats.dirCount === 1 ? "" : "s"}` : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="size-8 p-0"
                  onClick={clearArchive}
                  size="sm"
                  title="Close archive"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                </Button>
                <label
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border/80 bg-background/50 px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  htmlFor={inputId}
                >
                  <RefreshCw className="mr-1.5 size-3.5" />
                  Replace
                  <Input
                    accept=".tar,.tar.gz,.tgz,application/x-tar,application/gzip,application/x-gzip"
                    className="hidden"
                    id={inputId}
                    onChange={(e) => {
                      if (e.target.files) onFileInput(Array.from(e.target.files));
                    }}
                    type="file"
                  />
                </label>
              </div>
            </div>

            {/* Size & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Archive Size: </span>
                  <span className="font-mono font-medium">{formatBytes(archiveInfo.compressedSize)}</span>
                </div>
                {archiveInfo.isCompressed ? (
                  <div>
                    <span className="text-muted-foreground">Uncompressed: </span>
                    <span className="font-mono font-medium">
                      {formatBytes(archiveInfo.uncompressedSize)}
                    </span>
                  </div>
                ) : null}
              </div>

              <Button
                className="w-full sm:w-auto text-xs"
                disabled={archiveInfo.entries.length === 0}
                onClick={handleDownloadAllZip}
                type="button"
              >
                <Download className="mr-1.5 size-4" />
                Download all as ZIP
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-9 text-xs"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file path or name..."
                value={searchQuery}
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/40 p-1 text-xs">
              <button
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  filterType === "all" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFilterType("all")}
                type="button"
              >
                All ({archiveInfo.entries.length})
              </button>
              <button
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  filterType === "files" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFilterType("files")}
                type="button"
              >
                Files ({stats?.fileCount})
              </button>
              <button
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  filterType === "dirs" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFilterType("dirs")}
                type="button"
              >
                Folders ({stats?.dirCount})
              </button>
            </div>
          </div>

          {/* Entries Table */}
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="max-h-[560px] overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No matching files or directories found.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border/60 bg-card/90 backdrop-blur-md text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3">Name / Path</th>
                      <th className="hidden px-3 py-2.5 sm:table-cell">Size</th>
                      <th className="hidden px-3 py-2.5 md:table-cell">Modified</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredEntries.map((entry, idx) => {
                      const isDir = entry.type === "directory";
                      const canPreview =
                        !isDir && (isPreviewableImage(entry.name) || isPreviewableText(entry.name));

                      return (
                        <tr
                          className="group transition-colors hover:bg-muted/40"
                          key={`${entry.name}-${idx}`}
                        >
                          <td className="py-2 pl-4 pr-3 font-mono text-[11px] sm:text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(entry)}
                              <span className="truncate text-foreground" title={entry.name}>
                                {entry.name}
                              </span>
                            </div>
                          </td>
                          <td className="hidden px-3 py-2 font-mono text-[11px] text-muted-foreground sm:table-cell whitespace-nowrap">
                            {isDir ? "--" : formatBytes(entry.size)}
                          </td>
                          <td className="hidden px-3 py-2 text-[11px] text-muted-foreground md:table-cell whitespace-nowrap">
                            {formatDate(entry.mtime)}
                          </td>
                          <td className="py-2 pl-3 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {canPreview ? (
                                <Button
                                  className="size-7 p-0"
                                  onClick={() => handleOpenPreview(entry)}
                                  size="sm"
                                  title="Preview content"
                                  variant="ghost"
                                >
                                  <Eye className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                                </Button>
                              ) : null}
                              {!isDir ? (
                                <Button
                                  className="size-7 p-0"
                                  onClick={() => handleDownloadSingle(entry)}
                                  size="sm"
                                  title="Download file"
                                  variant="ghost"
                                >
                                  <Download className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Dialog */}
      <Dialog onOpenChange={(open) => !open && setPreviewEntry(null)} open={!!previewEntry}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate font-mono text-sm sm:text-base">
              {previewEntry?.name.split("/").pop()}
            </DialogTitle>
            <DialogDescription className="truncate font-mono text-[11px] text-muted-foreground">
              {previewEntry?.name} · {previewEntry ? formatBytes(previewEntry.size) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-border/60 bg-background/50 p-3">
            {previewContent?.type === "image" && previewContent.url ? (
              <div
                className="flex min-h-[160px] items-center justify-center rounded-lg p-2"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%)",
                  backgroundSize: "16px 16px"
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={previewEntry?.name}
                  className="max-h-[50vh] max-w-full rounded object-contain shadow-sm"
                  src={previewContent.url}
                />
              </div>
            ) : previewContent?.type === "text" && previewContent.text !== undefined ? (
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground select-text whitespace-pre-wrap break-all">
                {previewContent.text}
              </pre>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Binary or unsupported format for inline preview. Use the download button below.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {previewContent?.type === "text" && (
                <Button onClick={handleCopyText} size="sm" type="button" variant="outline">
                  {copied ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" />
                      Copy text
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {previewEntry ? (
                <Button
                  onClick={() => handleDownloadSingle(previewEntry)}
                  size="sm"
                  type="button"
                >
                  <Download className="mr-1.5 size-3.5" />
                  Download file
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
