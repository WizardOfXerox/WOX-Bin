"use client";

import Link from "next/link";
import {
  ArrowUp,
  Download,
  ExternalLink,
  FilePlus2,
  Folder,
  HardDriveDownload,
  HardDriveUpload,
  KeyRound,
  Link2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Lock,
  Unlock,
  Plus,
  Globe,
  Activity,
  Check,
  ArrowRight
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  type BookmarkFsVaultAnalytics,
  type BookmarkFsVaultEntry,
  type BookmarkFsVaultFile,
  downloadBookmarkFsFile,
  formatBookmarkFsBytes,
  inferVisibleVaultEntries,
  joinBookmarkFsPath,
  normalizeBookmarkFsPath
} from "@/lib/bookmarkfs-sync";

type BridgeReadyMessage = {
  source: "bookmarkfs-extension";
  target: "woxbin-bookmarkfs-page";
  type: "bookmarkfs-ready";
};

type BridgeResponseMessage = {
  source: "bookmarkfs-extension";
  target: "woxbin-bookmarkfs-page";
  type: "bookmarkfs-response";
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string | null;
};

type VaultListResponse = {
  entries: BookmarkFsVaultEntry[];
  analytics: BookmarkFsVaultAnalytics;
  rootName: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: number;
};

const PAGE_SOURCE = "woxbin-bookmarkfs-page";
const EXTENSION_SOURCE = "bookmarkfs-extension";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function textToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function textDataUrl(value: string, mimeType: string) {
  return `data:${mimeType};base64,${textToBase64(value)}`;
}

type Profile = {
  id: string;
  label: string;
  baseUrl: string;
  apiKey?: string;
  encryptedSecret?: {
    cipherText: string;
    salt: string;
    iv: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export function BookmarkFsSyncClient() {
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const bridgeReadySeenRef = useRef(false);
  const [bridgeState, setBridgeState] = useState<"checking" | "ready" | "missing">("checking");
  const [bridgeVersion, setBridgeVersion] = useState<string | null>(null);
  const [vaultRootName, setVaultRootName] = useState("bookmarkfs");
  const [entries, setEntries] = useState<BookmarkFsVaultEntry[]>([]);
  const [analytics, setAnalytics] = useState<BookmarkFsVaultAnalytics | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<BookmarkFsVaultFile | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [search, setSearch] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [editorText, setEditorText] = useState("");
  const [renamePath, setRenamePath] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [newFileMime, setNewFileMime] = useState("text/plain;charset=utf-8");

  // Profile Management States
  const [activeTab, setActiveTab] = useState<"vault" | "profiles">("vault");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileLabel, setProfileLabel] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [profileApiKey, setProfileApiKey] = useState("");
  const [profilePassphrase, setProfilePassphrase] = useState("");
  const [unlockPassphraseMap, setUnlockPassphraseMap] = useState<Record<string, string>>({});
  const [pendingProfileSave, setPendingProfileSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingRead, setPendingRead] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pendingMap = pendingRef.current;

    function handleMessage(event: MessageEvent<BridgeReadyMessage | BridgeResponseMessage>) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }
      const data = event.data;
      if (!data || data.target !== PAGE_SOURCE || data.source !== EXTENSION_SOURCE) {
        return;
      }
      if (data.type === "bookmarkfs-ready") {
        bridgeReadySeenRef.current = true;
        setBridgeState("ready");
        return;
      }
      if (data.type !== "bookmarkfs-response") {
        return;
      }
      const pending = pendingMap.get(data.id);
      if (!pending) {
        return;
      }
      window.clearTimeout(pending.timeout);
      pendingMap.delete(data.id);
      if (data.ok) {
        pending.resolve(data.data);
      } else {
        pending.reject(new Error(data.error || "BookmarkFS bridge request failed."));
      }
    }

    window.addEventListener("message", handleMessage as EventListener);
    return () => {
      window.removeEventListener("message", handleMessage as EventListener);
      pendingMap.forEach((pending) => window.clearTimeout(pending.timeout));
      pendingMap.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const sendHandshake = () => {
      window.postMessage(
        {
          source: PAGE_SOURCE,
          target: EXTENSION_SOURCE,
          type: "bookmarkfs-handshake"
        },
        window.location.origin
      );
    };

    // Kick once immediately, then keep probing while we are not connected.
    sendHandshake();
    const timer = window.setInterval(() => {
      if (bridgeReadySeenRef.current) {
        return;
      }
      sendHandshake();
    }, 1200);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const callBridge = useCallback(async <T,>(action: string, payload: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") {
      throw new Error("BookmarkFS bridge is only available in the browser.");
    }

    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `bookmarkfs-${Math.random().toString(36).slice(2)}`;

    return new Promise<T>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        pendingRef.current.delete(id);
        reject(new Error("BookmarkFS extension bridge timed out."));
      }, 12000);

      pendingRef.current.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout
      });

      window.postMessage(
        {
          source: PAGE_SOURCE,
          target: EXTENSION_SOURCE,
          type: "bookmarkfs-request",
          id,
          action,
          payload
        },
        window.location.origin
      );
    });
  }, []);

  const refreshVault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await callBridge<VaultListResponse>("vault.list");
      setEntries(result.entries || []);
      setAnalytics(result.analytics || null);
      setVaultRootName(result.rootName || "bookmarkfs");
      if (selectedName && !(result.entries || []).some((entry) => entry.fullName === selectedName)) {
        setSelectedName(null);
        setSelectedFile(null);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not read the local vault.");
    } finally {
      setLoading(false);
    }
  }, [callBridge, selectedName]);

  const refreshProfiles = useCallback(async () => {
    try {
      const result = await callBridge<{ profiles: Profile[]; selectedProfileId: string | null }>("profile.list");
      if (result) {
        setProfiles(result.profiles || []);
        setSelectedProfileId(result.selectedProfileId || null);
      }
    } catch (nextError) {
      console.warn("Could not load companion profiles:", nextError);
    }
  }, [callBridge]);

  const probeBridge = useCallback(async () => {
    setBridgeState("checking");
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const result = await callBridge<{ version: string; rootName: string }>("ping");
        setBridgeState("ready");
        setBridgeVersion(result.version || null);
        setVaultRootName(result.rootName || "bookmarkfs");
        await Promise.all([refreshVault(), refreshProfiles()]);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          // Give MV3 service worker + content script bridge a moment to wake up.
          await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }
    setBridgeState("missing");
    if (lastError instanceof Error) {
      setError(lastError.message);
    }
  }, [callBridge, refreshVault, refreshProfiles]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void probeBridge();
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [probeBridge]);

  useEffect(() => {
    if (bridgeState !== "ready" || loading || entries.length > 0) {
      return;
    }
    void refreshVault();
  }, [bridgeState, loading, entries.length, refreshVault]);

  async function loadVaultFile(fullName: string) {
    setPendingRead(true);
    setError(null);
    setStatus(null);
    try {
      const file = await callBridge<BookmarkFsVaultFile>("vault.read", {
        fullName,
        passphrase
      });
      setSelectedName(fullName);
      setSelectedFile(file);
      setEditorText(file.textContent || "");
      setRenamePath(file.fullName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not read the selected vault file.");
      setSelectedName(null);
      setSelectedFile(null);
      setEditorText("");
      setRenamePath("");
    } finally {
      setPendingRead(false);
    }
  }

  async function saveSelectedTextFile() {
    if (!selectedFile) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      await callBridge("vault.writeDataUrl", {
        fullName: selectedFile.fullName,
        dataUrl: textDataUrl(editorText, selectedFile.mimeType || "text/plain;charset=utf-8"),
        passphrase
      });
      setStatus("Saved back into the local vault.");
      await refreshVault();
      await loadVaultFile(selectedFile.fullName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save the vault file.");
    } finally {
      setPendingSave(false);
    }
  }

  async function renameSelectedFile() {
    if (!selectedFile) {
      return;
    }
    const nextPath = normalizeBookmarkFsPath(renamePath);
    if (!nextPath || nextPath === selectedFile.fullName) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      const result = await callBridge<{ fullName: string }>("vault.rename", {
        fromName: selectedFile.fullName,
        toName: nextPath
      });
      setStatus("Vault path updated.");
      await refreshVault();
      await loadVaultFile(result.fullName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not rename the vault file.");
    } finally {
      setPendingSave(false);
    }
  }

  async function deleteSelectedFile() {
    if (!selectedFile || !window.confirm(`Delete "${selectedFile.fullName}" from the local vault?`)) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      await callBridge("vault.delete", { fullName: selectedFile.fullName });
      setSelectedFile(null);
      setSelectedName(null);
      setRenamePath("");
      setEditorText("");
      setStatus("Vault file deleted.");
      await refreshVault();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete the vault file.");
    } finally {
      setPendingSave(false);
    }
  }

  async function createTextFile() {
    if (!newFileName.trim()) {
      setError("File name is required.");
      return;
    }
    const fullName = joinBookmarkFsPath(currentPath, newFileName.trim());
    const exists = entries.some((entry) => entry.fullName === fullName);
    if (exists && !window.confirm(`A file named "${fullName}" already exists. Overwrite?`)) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      await callBridge("vault.writeDataUrl", {
        fullName,
        dataUrl: textDataUrl(newFileContent, newFileMime),
        passphrase
      });
      setStatus("Created a new local-vault text file.");
      setNewFileName("");
      setNewFileContent("");
      await refreshVault();
      await loadVaultFile(fullName);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not create the new text file.");
    } finally {
      setPendingSave(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setError(null);
    setStatus(null);

    const filesToUpload: Array<{ file: File; fullName: string }> = [];
    for (const file of files) {
      const fullName = joinBookmarkFsPath(currentPath, file.name);
      const exists = entries.some((entry) => entry.fullName === fullName);
      if (exists) {
        if (window.confirm(`File "${file.name}" already exists in this folder. Overwrite it?`)) {
          filesToUpload.push({ file, fullName });
        }
      } else {
        filesToUpload.push({ file, fullName });
      }
    }

    if (!filesToUpload.length) {
      event.target.value = "";
      return;
    }

    setPendingSave(true);
    try {
      for (const item of filesToUpload) {
        const dataUrl = await readFileAsDataUrl(item.file);
        await callBridge("vault.writeDataUrl", {
          fullName: item.fullName,
          dataUrl,
          passphrase
        });
      }
      setStatus(`Imported ${filesToUpload.length} file${filesToUpload.length === 1 ? "" : "s"} into the local vault.`);
      await refreshVault();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not upload to the local vault.");
    } finally {
      setPendingSave(false);
      event.target.value = "";
    }
  }

  async function exportBackup() {
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      const result = await callBridge<{ count: number; json: string }>("vault.exportBackup");
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bookmarkfs-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${result.count} vault item${result.count === 1 ? "" : "s"}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not export the local vault.");
    } finally {
      setPendingSave(false);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      const text = await file.text();
      const result = await callBridge<{ total: number; renamed: number }>("vault.importBackup", {
        text
      });
      setStatus(
        `Imported ${result.total} backup item${result.total === 1 ? "" : "s"}${result.renamed ? ` (${result.renamed} renamed)` : ""}.`
      );
      await refreshVault();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not import the backup file.");
    } finally {
      setPendingSave(false);
      event.target.value = "";
    }
  }

  async function rebuildIndex() {
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      const result = await callBridge<VaultListResponse>("vault.rebuildIndex");
      setEntries(result.entries || []);
      setAnalytics(result.analytics || null);
      setStatus("Vault index rebuilt from bookmark metadata.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not rebuild the local-vault index.");
    } finally {
      setPendingSave(false);
    }
  }

  async function syncSelectedToWorkspace() {
    if (!selectedFile) {
      return;
    }
    setPendingSave(true);
    setError(null);
    setStatus(null);
    try {
      let payload: Record<string, unknown>;

      if (selectedFile.previewKind === "text") {
        payload = {
          title: selectedFile.displayName,
          content: editorText,
          language: selectedFile.language || "none",
          folderName: "BookmarkFS Sync",
          category: null,
          tags: ["bookmarkfs"],
          visibility: "private",
          password: null,
          secretMode: false,
          captchaRequired: false,
          burnAfterRead: false,
          burnAfterViews: 0,
          pinned: false,
          favorite: false,
          archived: false,
          template: false,
          forkedFromId: null,
          replyToId: null,
          expiresAt: null,
          files: []
        };
      } else if (selectedFile.previewKind === "image" || selectedFile.previewKind === "video") {
        payload = {
          title: selectedFile.displayName,
          content: `Imported from BookmarkFS local vault.\n\nSource: ${selectedFile.fullName}`,
          language: "markdown",
          folderName: "BookmarkFS Sync",
          category: null,
          tags: ["bookmarkfs"],
          visibility: "private",
          password: null,
          secretMode: false,
          captchaRequired: false,
          burnAfterRead: false,
          burnAfterViews: 0,
          pinned: false,
          favorite: false,
          archived: false,
          template: false,
          forkedFromId: null,
          replyToId: null,
          expiresAt: null,
          files: [
            {
              filename: selectedFile.displayName,
              content: selectedFile.dataBase64,
              language: "none",
              mediaKind: selectedFile.previewKind,
              mimeType: selectedFile.mimeType
            }
          ]
        };
      } else {
        throw new Error("Only text, image, and video vault files can sync into the hosted workspace right now.");
      }

      const response = await fetch("/api/workspace/pastes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const body = (await response.json().catch(() => null)) as { error?: string; paste?: { slug: string } } | null;
      if (!response.ok || !body?.paste?.slug) {
        throw new Error(body?.error || "Could not push the vault file into the workspace.");
      }
      setStatus(`Created workspace paste ${body.paste.slug} from the local vault.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not sync into the workspace.");
    } finally {
      setPendingSave(false);
    }
  }

  const visible = useMemo(() => inferVisibleVaultEntries(entries, currentPath, search), [entries, currentPath, search]);

  const breadcrumbs = useMemo(() => normalizeBookmarkFsPath(currentPath).split("/").filter(Boolean), [currentPath]);

  if (bridgeState === "missing") {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="px-3 py-1 text-xs">Extension required</Badge>
              <Badge className="border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">/bookmarkfs/sync</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">BookmarkFS sync page</h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                This page talks to the BookmarkFS extension over a page bridge. Without the extension loaded, the hosted app cannot read
                the bookmark-backed local vault.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setError(null);
                  void probeBridge();
                }}
                variant="secondary"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry bridge check
              </Button>
              <Button asChild>
                <a href="https://github.com/WizardOfXerox/WOX-Bin/tree/main/bookmarkfs" rel="noopener noreferrer" target="_blank">
                  Open extension source
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/bookmarkfs">Back to BookmarkFS page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="px-3 py-1 text-xs">BookmarkFS sync</Badge>
                <Badge className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-foreground">
                  {bridgeState === "ready" ? "Extension connected" : "Checking bridge"}
                </Badge>
                {bridgeVersion ? (
                  <Badge className="border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                    v{bridgeVersion}
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Local vault sync for the hosted WOX-Bin app</h1>
                <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
                  This page is the browser-side bridge between the Vercel app and the BookmarkFS extension. It reads the
                  bookmark-backed vault through the extension, displays it here, and lets you push selected vault items into
                  the hosted workspace.
                </p>
              </div>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vault passphrase</label>
              <div className="flex gap-2">
                <Input
                  autoComplete="new-password"
                  onChange={(event) => setPassphrase(event.target.value)}
                  placeholder="Only needed for encrypted vault files"
                  type="password"
                  value={passphrase}
                />
                <Button onClick={() => void refreshVault()} type="button" variant="outline">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {passphrase.trim() ? (
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    🔒 New files/uploads will be encrypted using this passphrase
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    🔓 New files/uploads will be stored in plaintext (no encryption)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Vault root</p>
              <p className="mt-2 text-sm font-medium">{vaultRootName}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Files</p>
              <p className="mt-2 text-sm font-medium">{analytics?.itemCount ?? 0}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Indexed</p>
              <p className="mt-2 text-sm font-medium">{analytics?.indexedCount ?? 0}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Stored size</p>
              <p className="mt-2 text-sm font-medium">{formatBookmarkFsBytes(analytics?.storedBytes ?? 0)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button className="w-full sm:w-auto" disabled={pendingSave} onClick={() => void exportBackup()} type="button" variant="outline">
              <HardDriveDownload className="h-4 w-4" />
              Export backup
            </Button>
            <label className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-[1rem] border border-border bg-card px-4 py-2 text-sm">
              <HardDriveUpload className="h-4 w-4" />
              Import backup
              <input accept="application/json" className="hidden" onChange={(event) => void importBackup(event)} type="file" />
            </label>
            <label className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-[1rem] border border-border bg-card px-4 py-2 text-sm">
              <Download className="h-4 w-4" />
              Upload into vault
              <input className="hidden" multiple onChange={(event) => void handleUpload(event)} type="file" />
            </label>
            <Button className="w-full sm:w-auto" disabled={pendingSave} onClick={() => void rebuildIndex()} type="button" variant="outline">
              <ShieldCheck className="h-4 w-4" />
              Rebuild index
            </Button>
          </div>

          {status ? <p className="text-sm text-emerald-500">{status}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {/* Tab Switcher */}
      <div className="flex justify-center border-b border-border/40 pb-4">
        <div className="inline-flex rounded-full bg-muted/30 p-1 border border-border/40 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("vault")}
            type="button"
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === "vault"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📂 Local Vault Explorer
          </button>
          <button
            onClick={() => setActiveTab("profiles")}
            type="button"
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === "profiles"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ⚡ Companion Profiles
          </button>
        </div>
      </div>

      {activeTab === "vault" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Vault browser</p>
                <h2 className="mt-2 text-xl font-semibold">Browse the bookmark-backed local vault</h2>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={!currentPath}
                  onClick={() => {
                    const parts = normalizeBookmarkFsPath(currentPath).split("/").filter(Boolean);
                    parts.pop();
                    setCurrentPath(parts.join("/"));
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowUp className="h-4 w-4" />
                  Up
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)]">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} value={search} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current path</label>
                <Input onChange={(event) => setCurrentPath(normalizeBookmarkFsPath(event.target.value))} value={currentPath} />
              </div>
            </div>

            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 text-xs text-muted-foreground w-full scrollbar-thin scrollbar-thumb-muted-foreground">
              <span>Path:</span>
              <button className="rounded-full border border-border px-3 py-1 text-foreground shrink-0" onClick={() => setCurrentPath("")} type="button">
                /
              </button>
              {breadcrumbs.map((segment, index) => {
                const nextPath = breadcrumbs.slice(0, index + 1).join("/");
                return (
                  <button
                    className="rounded-full border border-border px-3 py-1 text-foreground shrink-0"
                    key={nextPath}
                    onClick={() => setCurrentPath(nextPath)}
                    type="button"
                  >
                    {segment}
                  </button>
                );
              })}
            </div>

            <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
              {visible.folders.length ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Folders</p>
                  {visible.folders.map((folder) => (
                    <button
                      className="flex w-full items-center justify-between rounded-[1.1rem] border border-border/70 bg-background/80 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-card"
                      key={folder}
                      onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folder}` : folder)}
                      type="button"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Folder className="h-4 w-4 text-primary" />
                        {folder}
                      </span>
                      <ArrowUp className="h-4 w-4 rotate-90 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Files</p>
                {visible.files.length ? (
                  visible.files.map((entry) => (
                    <button
                      className={`w-full rounded-[1.1rem] border px-4 py-3 text-left transition ${
                        selectedName === entry.fullName
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/70 bg-background/80 hover:border-primary/30 hover:bg-card"
                      }`}
                      key={entry.fullName}
                      onClick={() => void loadVaultFile(entry.fullName)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{entry.displayName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.type || "application/octet-stream"}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <p>{formatBookmarkFsBytes(entry.sizeOriginal ?? entry.sizeStored)}</p>
                          <p>{entry.dateISO ? new Date(entry.dateISO).toLocaleDateString() : "—"}</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[1.1rem] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                    {loading ? "Loading vault contents..." : "No vault files matched this path and search."}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Selected vault file</p>
                <h2 className="mt-2 text-xl font-semibold">{selectedFile ? selectedFile.displayName : "Nothing selected yet"}</h2>
              </div>

              {selectedFile ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1rem] border border-border/70 bg-background/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Path</p>
                      <p className="mt-2 break-all text-sm">{selectedFile.fullName}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Type</p>
                      <p className="mt-2 text-sm">{selectedFile.mimeType}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Size</p>
                      <p className="mt-2 text-sm">{formatBookmarkFsBytes(selectedFile.sizeBytes)}</p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</p>
                      <p className="mt-2 text-sm">{selectedFile.encrypted ? "Encrypted" : "No passphrase"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      className="w-full sm:w-auto"
                      disabled={pendingSave || pendingRead}
                      onClick={() => downloadBookmarkFsFile(selectedFile.displayName, selectedFile.dataBase64, selectedFile.mimeType)}
                      type="button"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button className="w-full sm:w-auto" disabled={pendingSave || pendingRead} onClick={() => void syncSelectedToWorkspace()} type="button">
                      <Link2 className="h-4 w-4" />
                      Push to workspace
                    </Button>
                    <Button className="w-full sm:w-auto" disabled={pendingSave || pendingRead} onClick={() => void deleteSelectedFile()} type="button" variant="destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Rename path</label>
                    <div className="flex gap-2">
                      <Input onChange={(event) => setRenamePath(event.target.value)} value={renamePath} />
                      <Button disabled={pendingSave || pendingRead} onClick={() => void renameSelectedFile()} type="button" variant="outline">
                        Rename
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {selectedFile.previewKind === "text" ? (
                    <div className="space-y-3">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Edit text content</label>
                      <Textarea
                        className="min-h-[20rem] font-mono text-sm"
                        onChange={(event) => setEditorText(event.target.value)}
                        value={editorText}
                      />
                      <div className="flex gap-3">
                        <Button disabled={pendingSave || pendingRead} onClick={() => void saveSelectedTextFile()} type="button">
                          Save to vault
                        </Button>
                        <Button
                          disabled={pendingRead}
                          onClick={() => {
                            if (selectedFile) {
                              setEditorText(selectedFile.textContent || "");
                            }
                          }}
                          type="button"
                          variant="outline"
                        >
                          Reset editor
                        </Button>
                      </div>
                    </div>
                  ) : selectedFile.previewKind === "image" ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Preview</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={selectedFile.displayName}
                        className="max-h-[28rem] w-full rounded-[1.25rem] border border-border/70 bg-background/70 object-contain"
                        src={`data:${selectedFile.mimeType};base64,${selectedFile.dataBase64}`}
                      />
                    </div>
                  ) : selectedFile.previewKind === "video" ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Preview</p>
                      <video
                        className="max-h-[28rem] w-full rounded-[1.25rem] border border-border/70 bg-background/70"
                        controls
                        src={`data:${selectedFile.mimeType};base64,${selectedFile.dataBase64}`}
                      />
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                      This vault file can be downloaded here, but only text, image, and video files currently have rich preview or
                      workspace-sync handling in the hosted app.
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/70 p-5 text-sm text-muted-foreground">
                  Select a vault file from the left to inspect it here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Create text file</p>
                <h2 className="mt-2 text-xl font-semibold">Write directly into the local vault from the hosted page</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.85fr)]">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">File name</label>
                  <Input onChange={(event) => setNewFileName(event.target.value)} placeholder="notes/today.md" value={newFileName} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Mime type</label>
                  <Input onChange={(event) => setNewFileMime(event.target.value)} value={newFileMime} />
                </div>
              </div>
              <Textarea
                className="min-h-[12rem] font-mono text-sm"
                onChange={(event) => setNewFileContent(event.target.value)}
                placeholder="This note is stored through the extension bridge inside the bookmark-backed local vault."
                value={newFileContent}
              />
              <div className="flex flex-wrap gap-3">
                <Button disabled={pendingSave} onClick={() => void createTextFile()} type="button">
                  <FilePlus2 className="h-4 w-4" />
                  Create file
                </Button>
                <p className="self-center text-sm text-muted-foreground">
                  New files are written under the current path:
                  <span className="ml-2 rounded-full border border-border px-3 py-1 font-mono text-xs text-foreground">
                    /{currentPath || ""}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-primary" />
                Extension-only local vault
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                The hosted page is only a client. The actual bookmark-backed vault still lives inside the extension and Chrome bookmark
                storage. This page becomes useful only when the BookmarkFS extension is installed and active on the same browser.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm" variant="secondary">
                  <Link href="/bookmarkfs">Back to BookmarkFS page</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="https://github.com/WizardOfXerox/WOX-Bin/tree/main/bookmarkfs" rel="noopener noreferrer" target="_blank">
                    Extension source
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          {/* Left Column: Saved Profiles list */}
          <Card>
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Companion Profiles</p>
                <h2 className="mt-2 text-xl font-semibold">Saved profiles inside your browser companion</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The extension can connect to multiple different WOX-Bin sites or workspaces. Select which profile is active.
                </p>
              </div>

              {!profiles.length ? (
                <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No saved profiles inside the browser extension yet. Make sure the extension is installed and active.
                </div>
              ) : (
                <div className="space-y-4">
                  {profiles.map((prof) => {
                    const isActive = prof.id === selectedProfileId;
                    const isLocked = Boolean(prof.encryptedSecret) && !prof.apiKey;
                    return (
                      <div
                        className={`rounded-[1.25rem] border p-5 transition ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border/70 bg-background/50 hover:bg-card"
                        }`}
                        key={prof.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-base">{prof.label}</span>
                              {isActive ? (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                                  Active
                                </span>
                              ) : null}
                              {isLocked ? (
                                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/20">
                                  Locked
                                </span>
                              ) : (
                                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                                  Ready
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{prof.baseUrl}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await callBridge("profile.select", { profileId: prof.id });
                                  await refreshProfiles();
                                }}
                              >
                                Use profile
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/15"
                              onClick={async () => {
                                if (confirm(`Delete the profile "${prof.label}" from the extension?`)) {
                                  await callBridge("profile.delete", { profileId: prof.id });
                                  await refreshProfiles();
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {isLocked ? (
                          <div className="mt-4 rounded-xl bg-muted/20 border border-border/50 p-4 space-y-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5" />
                              This profile's API key is encrypted. Enter the passphrase to unlock it.
                            </p>
                            <div className="flex gap-2">
                              <Input
                                type="password"
                                placeholder="Enter passphrase to unlock"
                                value={unlockPassphraseMap[prof.id] || ""}
                                onChange={(e) =>
                                  setUnlockPassphraseMap({
                                    ...unlockPassphraseMap,
                                    [prof.id]: e.target.value
                                  })
                                }
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  const passphraseInput = unlockPassphraseMap[prof.id]?.trim() || "";
                                  if (!passphraseInput) {
                                    alert("Please enter a passphrase.");
                                    return;
                                  }
                                  const res = await callBridge<{ ok: boolean }>("profile.unlock", {
                                    profileId: prof.id,
                                    passphrase: passphraseInput
                                  });
                                  if (res?.ok) {
                                    await refreshProfiles();
                                  } else {
                                    alert("Wrong passphrase. Try again.");
                                  }
                                }}
                              >
                                Unlock
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Setup Profile Form & Auto Sync */}
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Setup profile</p>
                  <h2 className="mt-2 text-xl font-semibold">Add / edit profile manually</h2>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Label</label>
                    <Input
                      placeholder="e.g. Production, Staging, Local"
                      value={profileLabel}
                      onChange={(e) => setProfileLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Base URL</label>
                    <Input
                      placeholder="e.g. https://wox-bin.vercel.app"
                      value={profileUrl}
                      onChange={(e) => setProfileUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">API Key</label>
                    <Input
                      type="password"
                      placeholder="Bearer token (optional if editing only label/URL)"
                      value={profileApiKey}
                      onChange={(e) => setProfileApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Encrypt Key (Device Passphrase)
                    </label>
                    <Input
                      type="password"
                      placeholder="Optional passphrase to protect key on this device"
                      value={profilePassphrase}
                      onChange={(e) => setProfilePassphrase(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Button
                    disabled={pendingProfileSave}
                    onClick={async () => {
                      if (!profileUrl.trim()) {
                        alert("Base URL is required.");
                        return;
                      }
                      setPendingProfileSave(true);
                      try {
                        await callBridge("profile.save", {
                          label: profileLabel,
                          baseUrl: profileUrl.trim(),
                          apiKey: profileApiKey,
                          passphrase: profilePassphrase.trim()
                        });
                        setProfileLabel("");
                        setProfileUrl("");
                        setProfileApiKey("");
                        setProfilePassphrase("");
                        await refreshProfiles();
                        alert("Profile saved successfully!");
                      } catch (err) {
                        alert(err instanceof Error ? err.message : String(err));
                      } finally {
                        setPendingProfileSave(false);
                      }
                    }}
                  >
                    Save profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/10">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-primary" />
                  One-click Auto-Sync
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Instantly link this active WOX-Bin browser session. It will generate a new API key named "BookmarkFS Companion Sync" and configure the companion extension automatically.
                </p>
                <Button
                  className="w-full justify-center"
                  disabled={pendingProfileSave}
                  onClick={async () => {
                    setPendingProfileSave(true);
                    try {
                      const res = await fetch("/api/workspace/keys", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          label: `BookmarkFS Sync Companion (${new Date().toLocaleDateString()})`
                        })
                      });
                      if (!res.ok) {
                        const errJson = await res.json().catch(() => null);
                        throw new Error(errJson?.error || `Failed to create API key: HTTP ${res.status}`);
                      }
                      const data = await res.json();
                      const token = data.key?.token;
                      if (!token) {
                        throw new Error("No API key token returned from server.");
                      }
                      await callBridge("profile.save", {
                        label: "WOX-Bin (Auto-Synced)",
                        baseUrl: window.location.origin,
                        apiKey: token,
                        passphrase: ""
                      });
                      await refreshProfiles();
                      alert("Successfully created API key and auto-synced session profile to companion extension!");
                    } catch (err) {
                      alert(err instanceof Error ? err.message : String(err));
                    } finally {
                      setPendingProfileSave(false);
                    }
                  }}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Auto-sync current session
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
