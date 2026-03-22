"use client";

import { AlertTriangle, ExternalLink, Loader2, Server } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_NARROW } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

export type WorkerConvertClientProps = {
  /** Canonical pair slug, e.g. mp4-webm */
  pairPath: string;
  pairLabel: string;
  className?: string;
};

type JobCreateResponse = {
  jobId: string;
  publicToken: string;
  uploadUrl?: string;
  maxInputBytes?: number;
  outputExt?: string;
  outputMime?: string;
};

const UPLOAD_VIA = process.env.NEXT_PUBLIC_CONVERT_UPLOAD_VIA === "presign" ? "presign" : "proxy";

type JobStatusResponse = {
  status: string;
  errorMessage: string | null;
};

const POLL_MS = 2000;
const MAX_WAIT_MS = 20 * 60 * 1000;

export default function WorkerConvertClient({ pairPath, pairLabel, className }: WorkerConvertClientProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const cancelPoll = useRef(false);

  const onFiles = useCallback((files: File[]) => {
    setFile(files[0] ?? null);
    setErr(null);
    setHint(null);
  }, []);

  const run = useCallback(async () => {
    if (!file) {
      return;
    }
    cancelPoll.current = false;
    setBusy(true);
    setErr(null);
    setHint(null);

    try {
      const createRes = await fetch("/api/convert/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairPath,
          contentType: file.type || "application/octet-stream",
          originalFilename: file.name,
          declaredInputBytes: file.size
        })
      });

      const createJson = (await createRes.json().catch(() => null)) as Record<string, unknown> | null;

      if (createRes.status === 503 && createJson?.code === "STORAGE_NOT_CONFIGURED") {
        setHint(
          "Set CONVERT_S3_* in .env.local, run MinIO (see docker-compose.yml), then npm run worker:convert. " +
            "Without storage + DB + worker, use the reference link below."
        );
        throw new Error("Server storage for conversions is not configured (CONVERT_S3_*).");
      }

      if (!createRes.ok) {
        throw new Error(
          typeof createJson?.error === "string" ? createJson.error : `Create job failed (${createRes.status})`
        );
      }

      const job = createJson as JobCreateResponse;
      if (!job.jobId || !job.publicToken) {
        throw new Error("Invalid create job response");
      }

      const maxB = job.maxInputBytes ?? 500 * 1024 * 1024;
      if (file.size > maxB) {
        throw new Error(`File too large for this server (max ${Math.round(maxB / (1024 * 1024))} MB).`);
      }

      const contentType = file.type || "application/octet-stream";

      if (UPLOAD_VIA === "presign") {
        const uploadUrl = job.uploadUrl;
        if (!uploadUrl) {
          throw new Error("Server did not return uploadUrl (presign mode).");
        }
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file
        });
        if (!putRes.ok) {
          throw new Error(
            `Direct upload to storage failed (${putRes.status}). For local MinIO, set CONVERT_UPLOAD_VIA=proxy in .env.local or add CORS on the bucket (see docs/VERCEL-CONVERSIONS.md).`
          );
        }
        const commitRes = await fetch(`/api/convert/jobs/${job.jobId}/commit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: job.publicToken })
        });
        if (!commitRes.ok) {
          const cj = (await commitRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(cj?.error || `Commit failed (${commitRes.status})`);
        }
      } else {
        const upFd = new FormData();
        upFd.set("token", job.publicToken);
        upFd.set("file", file);
        const upRes = await fetch(`/api/convert/jobs/${job.jobId}/upload`, {
          method: "POST",
          body: upFd
        });
        if (!upRes.ok) {
          const uj = (await upRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(uj?.error || `Upload failed (${upRes.status})`);
        }
      }

      const started = Date.now();
      let status: JobStatusResponse | null = null;

      while (!cancelPoll.current && Date.now() - started < MAX_WAIT_MS) {
        const sRes = await fetch(`/api/convert/jobs/${job.jobId}?token=${encodeURIComponent(job.publicToken)}`, {
          cache: "no-store"
        });
        if (!sRes.ok) {
          const sj = (await sRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(sj?.error || `Status failed (${sRes.status})`);
        }
        status = (await sRes.json()) as JobStatusResponse;

        if (status.status === "done") {
          const apiDl = `/api/convert/jobs/${job.jobId}/download?token=${encodeURIComponent(job.publicToken)}`;
          window.location.assign(apiDl);
          setHint("Conversion finished — starting download…");
          return;
        }

        if (status.status === "failed") {
          throw new Error(status.errorMessage || "Conversion failed on the worker");
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }

      if (!cancelPoll.current) {
        throw new Error("Timed out waiting for worker — is the convert worker running?");
      }
    } catch (e) {
      if (!cancelPoll.current) {
        setErr(e instanceof Error ? e.message : "Conversion failed");
      }
    } finally {
      setBusy(false);
    }
  }, [file, pairPath]);

  const convertioHref = `https://convertio.co/${pairPath}/`;

  return (
    <div className={cn(TOOLS_CLIENT_NARROW, className)}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools/convert">
          Convert
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">{pairLabel}</span>
      </nav>

      <header className={cn(TOOLS_CLIENT_HEADER, "space-y-3")}>
        <p className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-widest">
          <Server className="size-3.5" />
          Server · FFmpeg worker
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{pairLabel}</h1>
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Files go to your S3-compatible bucket; a separate FFmpeg worker (not Vercel) processes jobs. On Vercel, uploads use{" "}
            <strong>presigned URLs</strong> by default (see <span className="font-mono text-[11px]">docs/VERCEL-CONVERSIONS.md</span>). Local
            dev defaults to proxy upload unless you set <span className="font-mono text-[11px]">CONVERT_UPLOAD_VIA=presign</span>.
          </p>
        </div>
      </header>

      <FileDropSurface
        className="glass-panel min-h-[min(180px,32dvh)] rounded-xl p-4 sm:min-h-[200px] sm:p-6"
        onFiles={onFiles}
        overlayMessage="Drop media file"
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Pair <code className="font-mono text-xs">{pairPath}</code> — output format is chosen by this route. Unsupported codecs may still
            fail on the worker depending on your FFmpeg build.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={inputId}>
              <span className="sr-only">File</span>
              <Input
                accept="video/*,audio/*,.mp4,.webm,.mkv,.mov,.avi,.mp3,.wav,.flac,.ogg,.m4a"
                className="max-w-md cursor-pointer"
                id={inputId}
                onChange={(e) => e.target.files && onFiles([...e.target.files])}
                type="file"
              />
            </label>
            <Button className="min-h-10 touch-manipulation sm:min-h-9" disabled={!file || busy} onClick={() => void run()} type="button">
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Converting…
                </>
              ) : (
                "Convert"
              )}
            </Button>
          </div>
          {err ? <p className="text-destructive text-sm">{err}</p> : null}
          {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
        </div>
      </FileDropSurface>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="gap-2" variant="outline">
          <a href={convertioHref} rel="noopener noreferrer" target="_blank">
            Open on Convertio (reference)
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/tools/convert">Back to hub</Link>
        </Button>
      </div>
    </div>
  );
}
