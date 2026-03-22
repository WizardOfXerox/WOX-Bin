"use client";

import { Archive, Download, FileArchive, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { unzipSync, zipSync } from "fflate";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function ZipLabClient({ className }: { className?: string }) {
  const packInputId = useId();
  const [mode, setMode] = useState<"pack" | "unpack">("pack");
  const [packFiles, setPackFiles] = useState<File[]>([]);
  const [unpackFile, setUnpackFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<{ name: string; data: Uint8Array }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPackFiles = useCallback((files: File[]) => {
    setPackFiles((prev) => [...prev, ...files]);
    setErr(null);
  }, []);

  const createZip = useCallback(async () => {
    if (packFiles.length === 0) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const record: Record<string, Uint8Array> = {};
      for (const f of packFiles) {
        record[f.name] = new Uint8Array(await f.arrayBuffer());
      }
      const zipped = zipSync(record, { level: 6 });
      downloadBlob(new Blob([new Uint8Array(zipped)], { type: "application/zip" }), "archive.zip");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ZIP failed");
    } finally {
      setBusy(false);
    }
  }, [packFiles]);

  const readZip = useCallback(async () => {
    if (!unpackFile) {
      return;
    }
    setBusy(true);
    setErr(null);
    setEntries([]);
    try {
      const buf = new Uint8Array(await unpackFile.arrayBuffer());
      const out = unzipSync(buf);
      const list = Object.entries(out).map(([name, data]) => ({ name, data }));
      setEntries(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read ZIP");
    } finally {
      setBusy(false);
    }
  }, [unpackFile]);

  return (
    <div className={cn(TOOLS_CLIENT_NARROW, className)}>
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
        <span className="font-medium text-foreground">ZIP</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">Browser · no upload</p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">ZIP pack & unpack</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Build a .zip from multiple files or list entries from a .zip and download each file. Uses <span className="font-mono text-xs">fflate</span>{" "}
          (store/deflate). Not a full archiver — no RAR/7z.
        </p>
      </header>

      <div className="glass-panel flex flex-col gap-2 p-3 touch-manipulation sm:flex-row sm:items-center">
        <Button className="min-h-10 w-full justify-center sm:min-h-9 sm:w-auto" onClick={() => setMode("pack")} type="button" variant={mode === "pack" ? "default" : "secondary"}>
          <Archive className="mr-2 size-4" />
          Create ZIP
        </Button>
        <Button className="min-h-10 w-full justify-center sm:min-h-9 sm:w-auto" onClick={() => setMode("unpack")} type="button" variant={mode === "unpack" ? "default" : "secondary"}>
          <FileArchive className="mr-2 size-4" />
          Extract ZIP
        </Button>
      </div>

      {mode === "pack" ? (
        <FileDropSurface
          className="glass-panel min-h-[min(160px,30dvh)] rounded-xl p-4 sm:min-h-[180px] sm:p-6"
          onFiles={onPackFiles}
          overlayMessage="Drop files to zip"
        >
          <div className="space-y-4">
            <label htmlFor={packInputId}>
              <span className="sr-only">Add files</span>
              <Input
                className="max-w-md cursor-pointer"
                id={packInputId}
                multiple
                onChange={(e) => e.target.files && onPackFiles([...e.target.files])}
                type="file"
              />
            </label>
            {packFiles.length > 0 ? (
              <ul className="text-muted-foreground max-h-40 list-inside list-disc text-xs">
                {packFiles.map((f) => (
                  <li key={f.name + f.size}>{f.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Add one or more files, then download .zip</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={packFiles.length === 0 || busy} onClick={() => void createZip()} type="button">
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
                Download ZIP
              </Button>
              <Button disabled={packFiles.length === 0} onClick={() => setPackFiles([])} type="button" variant="ghost">
                Clear list
              </Button>
            </div>
          </div>
        </FileDropSurface>
      ) : (
        <section className="glass-panel space-y-4 p-4 sm:p-6">
          <Input
            accept=".zip,application/zip"
            onChange={(e) => setUnpackFile(e.target.files?.[0] ?? null)}
            type="file"
          />
          <Button disabled={!unpackFile || busy} onClick={() => void readZip()} type="button">
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            List files
          </Button>
          {entries.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {entries.map((e) => (
                <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2" key={e.name}>
                  <span className="font-mono text-xs">{e.name}</span>
                  <Button
                    onClick={() => {
                      const blob = new Blob([new Uint8Array(e.data)], { type: "application/octet-stream" });
                      downloadBlob(blob, e.name.split("/").pop() || "file.bin");
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {err ? <p className="text-destructive text-sm">{err}</p> : null}
    </div>
  );
}
