import { buildBackupDocument, parseBackupDocument } from "../vault/backup.js";
import { ensureIndexedEntries, findCachedFileByHash } from "../vault/file-ops.js";
import { buildImportPlan } from "../vault/import-export.js";
import {
  clearVaultIndex,
  loadVaultIndex,
  removeVaultIndexEntry,
  renameVaultIndexEntry,
  saveVaultIndex,
  summarizeMetaForIndex,
  upsertVaultIndexEntry
} from "../vault/metadata-cache.js";
import { summarizeVaultAnalytics } from "../vault/ui.js";

const ROOT_NAME = "bookmarkfs";
const MAX_BOOKMARK_SIZE = 9092;
const META_PREFIX = "!meta:";
const APP_SCHEMA_VERSION = 2;
const te = new TextEncoder();
const td = new TextDecoder();

function normalizeVirtualPath(path) {
  return String(path || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function splitVirtualName(name) {
  const cleaned = normalizeVirtualPath(name);
  const parts = cleaned.split("/").filter(Boolean);
  const displayName = parts.pop() || "";
  return {
    fullName: cleaned,
    displayName,
    dir: parts.join("/")
  };
}

function joinVirtualName(dir, base) {
  const cleanDir = normalizeVirtualPath(dir);
  const cleanBase = normalizeVirtualPath(base);
  return cleanDir ? `${cleanDir}/${cleanBase}` : cleanBase;
}

function splitBySize(raw, size) {
  const out = [];
  for (let i = 0; i < raw.length; i += size) {
    out.push(raw.slice(i, i + size));
  }
  return out;
}

function bytesToBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return btoa(out);
}

function base64ToBytes(base64) {
  const normalized = String(base64 || "").trim();
  if (!normalized) {
    return new Uint8Array();
  }
  const decoded = atob(normalized);
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    out[i] = decoded.charCodeAt(i);
  }
  return out;
}

function dataUrlToParts(dataUrl) {
  const index = String(dataUrl || "").indexOf(",");
  if (index < 0) {
    throw new Error("Invalid data URL");
  }
  return {
    meta: dataUrl.slice(0, index),
    dataB64: dataUrl.slice(index + 1)
  };
}

function dataUrlFromBytes(mime, bytes) {
  return `data:${mime || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
}

async function sha256HexBytes(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256HexString(value) {
  return sha256HexBytes(te.encode(String(value || "")));
}

async function gzipBytes(bytes) {
  if (typeof CompressionStream === "undefined") {
    return bytes;
  }
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream === "undefined") {
    return bytes;
  }
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function deriveKey(passphrase, salt) {
  const keyMaterial = await crypto.subtle.importKey("raw", te.encode(passphrase), { name: "PBKDF2" }, false, [
    "deriveKey"
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 150000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptBytes(bytes, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes));
  return { encrypted, salt, iv };
}

async function decryptBytes(bytes, passphrase, salt, iv) {
  const key = await deriveKey(passphrase, salt);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes));
}

function migrateMeta(meta) {
  if (!meta || typeof meta !== "object") {
    return null;
  }
  const next = { ...meta };
  if (!next.schemaVersion) {
    next.schemaVersion = 1;
  }
  if (next.schemaVersion < 2) {
    next.schemaVersion = 2;
    next.chunkSize = next.chunkSize || MAX_BOOKMARK_SIZE;
    next.chunkHashes = Array.isArray(next.chunkHashes) ? next.chunkHashes : [];
  }
  return next;
}

async function verifySerializedIntegrity(serialized, metaObj) {
  const meta = migrateMeta(metaObj);
  if (!meta || !Array.isArray(meta.chunkHashes) || meta.chunkHashes.length === 0) {
    return;
  }
  const size = Number(meta.chunkSize || MAX_BOOKMARK_SIZE);
  const pieces = splitBySize(serialized, size);
  if (pieces.length !== meta.chunkHashes.length) {
    throw new Error("Integrity check failed: chunk count mismatch");
  }
  for (let i = 0; i < pieces.length; i += 1) {
    const hash = await sha256HexString(pieces[i]);
    if (hash !== meta.chunkHashes[i]) {
      throw new Error(`Integrity check failed at chunk ${i + 1}`);
    }
  }
}

function sniffMimeFromBytes(bytes) {
  if (!bytes || !bytes.length) {
    return "";
  }
  const sample = bytes;
  if (sample.length >= 8 && sample[0] === 0x89 && sample[1] === 0x50 && sample[2] === 0x4e && sample[3] === 0x47) {
    return "image/png";
  }
  if (sample.length >= 3 && sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) {
    return "image/jpeg";
  }
  if (sample.length >= 6 && sample[0] === 0x47 && sample[1] === 0x49 && sample[2] === 0x46) {
    return "image/gif";
  }
  if (
    sample.length >= 12 &&
    sample[0] === 0x52 &&
    sample[1] === 0x49 &&
    sample[2] === 0x46 &&
    sample[3] === 0x46 &&
    sample[8] === 0x57 &&
    sample[9] === 0x45 &&
    sample[10] === 0x42 &&
    sample[11] === 0x50
  ) {
    return "image/webp";
  }
  if (sample.length >= 4 && sample[0] === 0x25 && sample[1] === 0x50 && sample[2] === 0x44 && sample[3] === 0x46) {
    return "application/pdf";
  }
  if (sample.length >= 4 && sample[0] === 0x50 && sample[1] === 0x4b && sample[2] === 0x03 && sample[3] === 0x04) {
    return "application/zip";
  }
  const textSample = sample.slice(0, Math.min(512, sample.length));
  let printable = 0;
  for (let i = 0; i < textSample.length; i += 1) {
    const code = textSample[i];
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) {
      printable += 1;
    }
  }
  if (textSample.length && printable / textSample.length > 0.9) {
    return "text/plain";
  }
  return "";
}

function inferLanguage(filename, mimeType) {
  const ext = String(filename || "").split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "md":
      return "markdown";
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "py":
      return "python";
    case "sh":
      return "bash";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      if (String(mimeType || "").includes("markdown")) {
        return "markdown";
      }
      return "none";
  }
}

function isTextLike(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  );
}

function previewKindForMime(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (isTextLike(mime)) {
    return "text";
  }
  return "binary";
}

async function fsRoot() {
  const tree = await chrome.bookmarks.getTree();
  const bar = tree[0]?.children?.[1] || tree[0]?.children?.[0];
  let handle = (bar?.children || []).find((node) => node.title === ROOT_NAME);
  if (!handle) {
    handle = await chrome.bookmarks.create({ parentId: bar.id, title: ROOT_NAME });
  }
  return handle;
}

function fileObj(handle) {
  return {
    handle,
    async getChildrenFresh() {
      return (await chrome.bookmarks.getChildren(this.handle.id)) || [];
    },
    async read() {
      let data = "";
      const children = await this.getChildrenFresh();
      for (const child of children) {
        if (child.title && child.title.startsWith(META_PREFIX)) {
          continue;
        }
        data += child.title || "";
      }
      return data;
    },
    async write(rawString) {
      const pieces = splitBySize(rawString, MAX_BOOKMARK_SIZE);
      const existing = await this.getChildrenFresh();
      const dataNodes = existing.filter((node) => node.title && !node.title.startsWith(META_PREFIX));
      if (pieces.length < dataNodes.length) {
        for (let i = dataNodes.length - 1; i >= pieces.length; i -= 1) {
          try {
            await chrome.bookmarks.remove(dataNodes[i].id);
          } catch {
            // ignore stale nodes
          }
        }
      }
      const currentChildren = (await chrome.bookmarks.getChildren(this.handle.id)) || [];
      const currentDataNodes = currentChildren.filter((node) => node.title && !node.title.startsWith(META_PREFIX));
      for (let i = 0; i < pieces.length; i += 1) {
        const title = pieces[i];
        const node = currentDataNodes[i];
        if (node) {
          await chrome.bookmarks.update(node.id, { title });
        } else {
          await chrome.bookmarks.create({ parentId: this.handle.id, title });
        }
      }
    },
    async writeMeta(meta) {
      const payload = META_PREFIX + btoa(JSON.stringify(meta));
      const children = await this.getChildrenFresh();
      const metaNode = children.find((node) => node.title && node.title.startsWith(META_PREFIX));
      if (metaNode) {
        await chrome.bookmarks.update(metaNode.id, { title: payload });
      } else {
        await chrome.bookmarks.create({ parentId: this.handle.id, title: payload });
      }
      const summary = summarizeMetaForIndex(this.handle.title, meta);
      if (summary) {
        await upsertVaultIndexEntry(summary);
      }
    },
    async readMeta() {
      const children = await this.getChildrenFresh();
      const metaNode = children.find((node) => node.title && node.title.startsWith(META_PREFIX));
      if (!metaNode) {
        return null;
      }
      try {
        return migrateMeta(JSON.parse(atob(metaNode.title.slice(META_PREFIX.length))));
      } catch {
        try {
          return migrateMeta(JSON.parse(metaNode.title.slice(META_PREFIX.length)));
        } catch {
          return null;
        }
      }
    },
    async rename(nextName) {
      const previousName = this.handle.title;
      await chrome.bookmarks.update(this.handle.id, { title: nextName });
      this.handle.title = nextName;
      await renameVaultIndexEntry(previousName, nextName);
    },
    async delete() {
      const previousName = this.handle.title;
      const children = await this.getChildrenFresh();
      for (const node of children) {
        try {
          await chrome.bookmarks.remove(node.id);
        } catch {
          // ignore stale nodes
        }
      }
      await chrome.bookmarks.remove(this.handle.id);
      await removeVaultIndexEntry(previousName);
    }
  };
}

async function listFiles() {
  const root = await fsRoot();
  const children = await chrome.bookmarks.getChildren(root.id);
  return children.filter((node) => !node.url).map((node) => fileObj(node));
}

async function getFileByName(name) {
  const fullName = normalizeVirtualPath(name);
  const root = await fsRoot();
  const children = await chrome.bookmarks.getChildren(root.id);
  const handle = children.find((node) => node.title === fullName);
  return handle ? fileObj(handle) : null;
}

async function createNewFile(name) {
  const fullName = normalizeVirtualPath(name);
  if (!fullName) {
    throw new Error("File path is required.");
  }
  const root = await fsRoot();
  const children = await chrome.bookmarks.getChildren(root.id);
  if (children.some((node) => node.title === fullName)) {
    throw new Error("File already exists.");
  }
  const handle = await chrome.bookmarks.create({ parentId: root.id, title: fullName });
  return fileObj(handle);
}

async function ensureVaultIndexEntries(files) {
  const currentIndex = await loadVaultIndex();
  const next = await ensureIndexedEntries({
    currentIndex,
    files,
    readMeta: async (file) => file.readMeta(),
    summarizeMeta: summarizeMetaForIndex
  });
  if (next.mutated) {
    await saveVaultIndex(next.entries);
  }
  return next.entries;
}

async function prepareSerializedFromDataUrl(dataUrl, passphrase = "") {
  const { meta, dataB64 } = dataUrlToParts(dataUrl);
  const originalBytes = base64ToBytes(dataB64);
  const gzipped = await gzipBytes(originalBytes);
  const compressed = gzipped.length > 0 && gzipped.length < originalBytes.length;
  let processed = compressed ? gzipped : originalBytes;
  let encrypted = false;
  let enc = null;
  if (passphrase) {
    const result = await encryptBytes(processed, passphrase);
    processed = result.encrypted;
    encrypted = true;
    enc = {
      salt: bytesToBase64(result.salt),
      iv: bytesToBase64(result.iv)
    };
  }
  const tag = compressed ? "c" : "r";
  const serialized = tag + bytesToBase64(processed);
  const pieces = splitBySize(serialized, MAX_BOOKMARK_SIZE);
  const chunkHashes = [];
  for (const piece of pieces) {
    chunkHashes.push(await sha256HexString(piece));
  }
  const mime = (meta.match(/^data:([^;]+)/) || [null, "application/octet-stream"])[1];
  const metaObj = {
    schemaVersion: APP_SCHEMA_VERSION,
    name: "",
    type: mime,
    sizeOriginal: originalBytes.length,
    sizeStored: te.encode(serialized).length,
    ratio: te.encode(serialized).length / Math.max(1, originalBytes.length),
    dateISO: new Date().toISOString(),
    compressed,
    encrypted,
    enc,
    chunkSize: MAX_BOOKMARK_SIZE,
    chunkHashes,
    contentHash: await sha256HexBytes(originalBytes)
  };
  return { serialized, metaObj };
}

async function reconstructBytesFromSerialized(serialized, metaObj, passphrase = "") {
  const meta = migrateMeta(metaObj) || {};
  if (!serialized || serialized.length < 2) {
    throw new Error("Invalid serialized data.");
  }
  await verifySerializedIntegrity(serialized, meta);
  const tag = serialized[0];
  let bytes = base64ToBytes(serialized.slice(1));
  if (meta.encrypted) {
    if (!passphrase) {
      throw new Error("Passphrase required for this vault file.");
    }
    const salt = base64ToBytes(meta.enc?.salt || meta.enc?.saltB64 || meta.enc?.salt64 || "");
    const iv = base64ToBytes(meta.enc?.iv || meta.enc?.ivB64 || meta.enc?.iv64 || "");
    if (!salt.length || !iv.length) {
      throw new Error("Missing encryption metadata.");
    }
    bytes = await decryptBytes(bytes, passphrase, salt, iv);
  }
  if (tag === "c") {
    bytes = await gunzipBytes(bytes);
  }
  if (meta.contentHash) {
    const contentHash = await sha256HexBytes(bytes);
    if (contentHash !== meta.contentHash) {
      throw new Error("Integrity check failed: content hash mismatch.");
    }
  }
  const mimeType =
    meta.type && meta.type !== "application/octet-stream" ? meta.type : sniffMimeFromBytes(bytes) || meta.type || "application/octet-stream";
  return { bytes, mimeType, meta };
}

async function listVaultEntries() {
  const files = await listFiles();
  const entries = await ensureVaultIndexEntries(files);
  return {
    entries,
    analytics: summarizeVaultAnalytics(files.length, entries),
    rootName: ROOT_NAME
  };
}

async function readVaultFile(fullName, passphrase = "") {
  const file = await getFileByName(fullName);
  if (!file) {
    throw new Error("Vault file not found.");
  }
  const raw = await file.read();
  const meta = await file.readMeta();
  const { bytes, mimeType } = await reconstructBytesFromSerialized(raw, meta, passphrase);
  const parts = splitVirtualName(fullName);
  const previewKind = previewKindForMime(mimeType);
  const textLike = previewKind === "text";
  return {
    ...parts,
    mimeType,
    previewKind,
    textLike,
    encrypted: Boolean(meta?.encrypted),
    meta,
    sizeBytes: bytes.length,
    language: inferLanguage(parts.displayName, mimeType),
    dataBase64: bytesToBase64(bytes),
    textContent: textLike ? td.decode(bytes) : null
  };
}

async function upsertVaultFileFromDataUrl(fullName, dataUrl, passphrase = "") {
  const normalized = normalizeVirtualPath(fullName);
  if (!normalized) {
    throw new Error("File path is required.");
  }
  const { serialized, metaObj } = await prepareSerializedFromDataUrl(dataUrl, passphrase);
  metaObj.name = normalized;
  const existing = await getFileByName(normalized);
  const file = existing || (await createNewFile(normalized));
  await file.writeMeta(metaObj);
  await file.write(serialized);
  return {
    fullName: normalized,
    summary: summarizeMetaForIndex(normalized, metaObj)
  };
}

async function renameVaultFile(fromName, toName) {
  const existing = await getFileByName(fromName);
  if (!existing) {
    throw new Error("Vault file not found.");
  }
  const normalized = normalizeVirtualPath(toName);
  if (!normalized) {
    throw new Error("New file path is required.");
  }
  if (normalized !== normalizeVirtualPath(fromName) && (await getFileByName(normalized))) {
    throw new Error("A vault file already uses that path.");
  }
  await existing.rename(normalized);
  return { fullName: normalized };
}

async function deleteVaultFile(fullName) {
  const existing = await getFileByName(fullName);
  if (!existing) {
    throw new Error("Vault file not found.");
  }
  await existing.delete();
  return { ok: true };
}

async function exportVaultBackup() {
  const files = await listFiles();
  const items = [];
  for (const file of files) {
    items.push({
      name: file.handle.title,
      meta: await file.readMeta(),
      serialized: await file.read()
    });
  }
  return {
    count: items.length,
    json: JSON.stringify(buildBackupDocument(items, 1), null, 2)
  };
}

async function importVaultBackup(text) {
  const parsed = parseBackupDocument(text);
  const existingFiles = await listFiles();
  const plan = buildImportPlan(
    parsed.items,
    existingFiles.map((file) => file.handle.title)
  );
  for (const item of plan.items) {
    const file = await createNewFile(item.finalName);
    if (item.meta) {
      const nextMeta = migrateMeta(item.meta) || item.meta;
      nextMeta.name = item.finalName;
      await file.writeMeta(nextMeta);
    }
    await file.write(item.serialized);
  }
  return {
    total: plan.total,
    renamed: plan.renamed
  };
}

async function rebuildVaultIndex() {
  const files = await listFiles();
  const entries = [];
  for (const file of files) {
    const meta = await file.readMeta();
    const summary = summarizeMetaForIndex(file.handle.title, meta);
    if (summary) {
      entries.push(summary);
    }
  }
  await saveVaultIndex(entries);
  return {
    entries,
    analytics: summarizeVaultAnalytics(files.length, entries)
  };
}

export async function handleVaultAction(action, payload = {}) {
  switch (action) {
    case "ping":
      return {
        ok: true,
        version: chrome.runtime.getManifest().version,
        rootName: ROOT_NAME
      };
    case "vault.list":
      return listVaultEntries();
    case "vault.read":
      return readVaultFile(payload.fullName, payload.passphrase || "");
    case "vault.writeDataUrl":
      return upsertVaultFileFromDataUrl(payload.fullName, payload.dataUrl, payload.passphrase || "");
    case "vault.rename":
      return renameVaultFile(payload.fromName, payload.toName);
    case "vault.delete":
      return deleteVaultFile(payload.fullName);
    case "vault.exportBackup":
      return exportVaultBackup();
    case "vault.importBackup":
      return importVaultBackup(payload.text || "");
    case "vault.rebuildIndex":
      return rebuildVaultIndex();
    case "vault.clearIndex":
      await clearVaultIndex();
      return { ok: true };
    default:
      throw new Error(`Unsupported BookmarkFS action: ${action}`);
  }
}
