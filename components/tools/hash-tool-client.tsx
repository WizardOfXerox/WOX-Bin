"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  Binary,
  Check,
  Copy,
  FileUp,
  Hash,
  KeyRound,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
  CheckCircle2,
  XCircle
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropSurface } from "@/components/ui/file-drop-surface";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

// --- RFC 1321 Pure JS MD5 Implementation ---
function md5(input: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ]);

  const S = [
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
  ];

  const len = input.length;
  const bitLen = len * 8;
  const padLen = (len % 64 < 56) ? (56 - (len % 64)) : (120 - (len % 64));
  const totalLen = len + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(input);
  padded[len] = 0x80;

  const lowBits = (bitLen & 0xffffffff) >>> 0;
  const highBits = Math.floor(bitLen / 0x100000000) >>> 0;
  padded[totalLen - 8] = lowBits & 0xff;
  padded[totalLen - 7] = (lowBits >>> 8) & 0xff;
  padded[totalLen - 6] = (lowBits >>> 16) & 0xff;
  padded[totalLen - 5] = (lowBits >>> 24) & 0xff;
  padded[totalLen - 4] = highBits & 0xff;
  padded[totalLen - 3] = (highBits >>> 8) & 0xff;
  padded[totalLen - 2] = (highBits >>> 16) & 0xff;
  padded[totalLen - 1] = (highBits >>> 24) & 0xff;

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const dataView = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);

  for (let offset = 0; offset < totalLen; offset += 64) {
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F = 0;
      let g = 0;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      const M_g = dataView.getUint32(offset + g * 4, true);
      const temp = (D >>> 0);
      D = C;
      C = B;
      const sum = (A + F + K[i] + M_g) | 0;
      const rot = S[i]!;
      const rotated = ((sum << rot) | (sum >>> (32 - rot))) | 0;
      B = (B + rotated) | 0;
      A = temp;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const result = new Uint8Array(16);
  const outView = new DataView(result.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return result;
}

// RFC 2104 HMAC-MD5 implementation
function hmacMd5(key: Uint8Array, message: Uint8Array): Uint8Array {
  const keyBlock = new Uint8Array(64);
  if (key.length > 64) {
    const hashedKey = md5(key);
    keyBlock.set(hashedKey);
  } else {
    keyBlock.set(key);
  }

  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyBlock[i]! ^ 0x5c;
    iKeyPad[i] = keyBlock[i]! ^ 0x36;
  }

  const innerMsg = new Uint8Array(64 + message.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(message, 64);
  const innerHash = md5(innerMsg);

  const outerMsg = new Uint8Array(64 + 16);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, 64);
  return md5(outerMsg);
}

function toHex(buffer: ArrayBuffer | Uint8Array, uppercase: boolean): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

type HashAlgorithm = {
  id: "md5" | "sha1" | "sha256" | "sha384" | "sha512";
  name: string;
  bits: number;
  webCryptoName?: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
};

const ALGORITHMS: HashAlgorithm[] = [
  { id: "md5", name: "MD5", bits: 128 },
  { id: "sha1", name: "SHA-1", bits: 160, webCryptoName: "SHA-1" },
  { id: "sha256", name: "SHA-256", bits: 256, webCryptoName: "SHA-256" },
  { id: "sha384", name: "SHA-384", bits: 384, webCryptoName: "SHA-384" },
  { id: "sha512", name: "SHA-512", bits: 512, webCryptoName: "SHA-512" }
];

const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

export function HashToolClient() {
  const [inputType, setInputType] = useState<"text" | "file">("text");
  const [textInput, setTextInput] = useState(SAMPLE_TEXT);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; buffer: ArrayBuffer } | null>(null);
  const [isHmac, setIsHmac] = useState(false);
  const [secretKey, setSecretKey] = useState("secret-key");
  const [uppercase, setUppercase] = useState(false);
  const [compareHash, setCompareHash] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [calculating, setCalculating] = useState(false);

  const fileInputId = useId();

  // Compute hashes whenever inputs change
  useEffect(() => {
    let cancelled = false;

    async function computeAll() {
      setCalculating(true);
      const encoder = new TextEncoder();
      let dataBytes: Uint8Array;

      if (inputType === "file") {
        if (!selectedFile) {
          setResults({});
          setCalculating(false);
          return;
        }
        dataBytes = new Uint8Array(selectedFile.buffer);
      } else {
        dataBytes = encoder.encode(textInput);
      }

      const keyBytes = encoder.encode(secretKey);
      const newResults: Record<string, string> = {};

      try {
        for (const algo of ALGORITHMS) {
          if (cancelled) return;

          if (algo.id === "md5") {
            const rawBytes = isHmac ? hmacMd5(keyBytes, dataBytes) : md5(dataBytes);
            newResults[algo.id] = toHex(rawBytes, uppercase);
          } else if (algo.webCryptoName) {
            const dataBufferSource = dataBytes as unknown as BufferSource;
            if (isHmac) {
              const keyBufferSource = keyBytes as unknown as BufferSource;
              const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyBufferSource,
                { name: "HMAC", hash: { name: algo.webCryptoName } },
                false,
                ["sign"]
              );
              const sig = await crypto.subtle.sign("HMAC", cryptoKey, dataBufferSource);
              newResults[algo.id] = toHex(sig, uppercase);
            } else {
              const digest = await crypto.subtle.digest(algo.webCryptoName, dataBufferSource);
              newResults[algo.id] = toHex(digest, uppercase);
            }
          }
        }

        if (!cancelled) {
          setResults(newResults);
        }
      } catch (err) {
        console.error("Hashing failed:", err);
      } finally {
        if (!cancelled) {
          setCalculating(false);
        }
      }
    }

    void computeAll();

    return () => {
      cancelled = true;
    };
  }, [inputType, textInput, selectedFile, isHmac, secretKey, uppercase]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      setSelectedFile({
        name: file.name,
        size: file.size,
        buffer
      });
      setInputType("file");
    } catch (e) {
      console.error("Failed to read file", e);
    }
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const normalizedCompare = compareHash.trim().toLowerCase();

  return (
    <div className={TOOLS_CLIENT_WIDE}>
      <nav className={TOOLS_CLIENT_NAV}>
        <Link className="touch-manipulation hover:underline" href="/">
          Home
        </Link>
        <span className="text-border">/</span>
        <Link className="touch-manipulation hover:underline" href="/tools">
          Tools
        </Link>
        <span className="text-border">/</span>
        <span className="font-medium text-foreground">Hash & HMAC Suite</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Hash className="size-4" />
          Cryptographic Checksums & Signatures
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Hash & HMAC Suite</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes and HMAC signatures in real time. Works offline in
          your browser with Web Crypto and zero uploads.
        </p>
      </header>

      {/* Mode Controls Bar */}
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Input Type Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-card/60 p-0.5">
            <button
              type="button"
              onClick={() => setInputType("text")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                inputType === "text"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileUp className="size-3.5" />
              Text
            </button>
            <button
              type="button"
              onClick={() => setInputType("file")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                inputType === "file"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UploadCloud className="size-3.5" />
              File (Binary)
            </button>
          </div>

          {/* HMAC Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsHmac(!isHmac)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
              isHmac
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="size-3.5" />
            {isHmac ? "HMAC Mode: Active" : "Enable HMAC"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Uppercase / Lowercase toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUppercase(!uppercase)}
            className="h-8 gap-1 text-xs"
          >
            <Binary className="size-3.5" />
            {uppercase ? "Uppercase (ABC)" : "Lowercase (abc)"}
          </Button>
        </div>
      </div>

      {/* HMAC Secret Key Field (if active) */}
      {isHmac && (
        <div className="glass-panel space-y-2 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <KeyRound className="size-3.5 text-primary" />
              HMAC Secret Key (UTF-8)
            </label>
            <span className="text-[11px] text-muted-foreground">{secretKey.length} chars</span>
          </div>
          <Input
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter secret key for HMAC calculation..."
            className="h-9 font-mono text-xs"
          />
        </div>
      )}

      {/* Input Section */}
      {inputType === "text" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground">Text Input to Hash</label>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setTextInput(SAMPLE_TEXT)}
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
              >
                <Sparkles className="size-3" />
                Sample
              </Button>
              <Button
                onClick={() => setTextInput("")}
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type or paste any text to hash in real-time..."
            className="min-h-[120px] font-mono text-xs sm:text-sm"
          />
          <div className="flex justify-end text-[11px] text-muted-foreground">
            {textInput.length} characters ({new TextEncoder().encode(textInput).length} bytes)
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            id={fileInputId}
            type="file"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) {
                void handleFileUpload(Array.from(e.target.files));
              }
            }}
          />
          <FileDropSurface
            onFiles={handleFileUpload}
            overlayMessage="Drop file here to hash"
            className="cursor-pointer"
          >
            <label
              htmlFor={fileInputId}
              className="glass-panel flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center transition-colors hover:border-primary/40"
            >
              <UploadCloud className="size-8 text-primary" />
              <div className="text-sm font-semibold">
                {selectedFile ? selectedFile.name : "Choose a file or drag and drop here"}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedFile
                  ? `${formatFileSize(selectedFile.size)} • Click or drop another file to replace`
                  : "All hashing takes place in your browser memory — no data uploaded"}
              </div>
            </label>
          </FileDropSurface>

          {selectedFile && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-muted-foreground">
                Loaded: <strong className="text-foreground">{selectedFile.name}</strong> (
                {formatFileSize(selectedFile.size)})
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedFile(null)}
                className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3" />
                Remove File
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Hash Verification / Compare Checker */}
      <div className="glass-panel space-y-2 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">
            Checksum Verifier (Compare against expected hash)
          </label>
          {compareHash && (
            <button
              onClick={() => setCompareHash("")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <Input
          value={compareHash}
          onChange={(e) => setCompareHash(e.target.value)}
          placeholder="Paste an expected hash to check integrity..."
          className="h-9 font-mono text-xs"
        />
      </div>

      {/* Output Results Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            {isHmac ? "HMAC Signatures" : "Cryptographic Hashes"}
          </h2>
          {calculating && <span className="text-xs text-primary animate-pulse">Calculating...</span>}
        </div>

        <div className="grid gap-3">
          {ALGORITHMS.map((algo) => {
            const hashVal = results[algo.id] || "";
            const isMatch =
              normalizedCompare.length > 0 &&
              hashVal.length > 0 &&
              hashVal.toLowerCase() === normalizedCompare;

            return (
              <Card
                key={algo.id}
                className={cn(
                  "overflow-hidden transition-all",
                  isMatch && "border-emerald-500/50 bg-emerald-500/5"
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-primary tracking-wide">{algo.name}</span>
                      <span className="rounded-md border border-border bg-card/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {algo.bits}-bit
                      </span>
                      {normalizedCompare && hashVal && (
                        isMatch ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                            <CheckCircle2 className="size-3.5" />
                            Match!
                          </span>
                        ) : null
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(hashVal, algo.id)}
                        disabled={!hashVal}
                        className="h-7 gap-1 px-2.5 text-xs"
                      >
                        {copiedKey === algo.id ? (
                          <>
                            <Check className="size-3 text-emerald-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-border bg-card/60 p-2.5 font-mono text-xs break-all select-all text-foreground">
                    {hashVal || <span className="text-muted-foreground italic">No input to compute</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
