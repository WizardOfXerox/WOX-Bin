"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Copy, KeyRound, ShieldAlert, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

// Sample JWT for testing/demo
const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXggVmFuY2UiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjIsImlzcyI6IndveC1iaW4uY29tIn0." +
  "4peZ-sample-signature-only-for-demo-purposes-not-real";

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

export type ParsedJwt = {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  error: string | null;
  rawHeader: string;
  rawPayload: string;
};

export function parseJwt(token: string): ParsedJwt {
  const trimmed = token.trim();
  if (!trimmed) {
    return { header: null, payload: null, signature: "", error: null, rawHeader: "", rawPayload: "" };
  }

  const parts = trimmed.split(".");
  if (parts.length < 2 || parts.length > 3) {
    return {
      header: null,
      payload: null,
      signature: "",
      error: "Invalid JWT format. A valid token must contain 2 or 3 dot-separated segments (header.payload[.signature]).",
      rawHeader: "",
      rawPayload: ""
    };
  }

  let header: Record<string, unknown> | null = null;
  let payload: Record<string, unknown> | null = null;
  let rawHeader = "";
  let rawPayload = "";

  try {
    rawHeader = base64UrlDecode(parts[0]!);
    header = JSON.parse(rawHeader);
  } catch (e) {
    return {
      header: null,
      payload: null,
      signature: parts[2] || "",
      error: "Failed to decode or parse JWT Header as valid JSON.",
      rawHeader,
      rawPayload
    };
  }

  try {
    rawPayload = base64UrlDecode(parts[1]!);
    payload = JSON.parse(rawPayload);
  } catch (e) {
    return {
      header,
      payload: null,
      signature: parts[2] || "",
      error: "Failed to decode or parse JWT Payload as valid JSON.",
      rawHeader,
      rawPayload
    };
  }

  return {
    header,
    payload,
    signature: parts[2] || "",
    error: null,
    rawHeader,
    rawPayload
  };
}

function formatTimestamp(seconds: number): { formatted: string; relative: string; isExpired: boolean } {
  const date = new Date(seconds * 1000);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const isExpired = diffMs < 0;
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

  let relative = "";
  if (absDiffSec < 60) {
    relative = isExpired ? `${absDiffSec}s ago` : `in ${absDiffSec}s`;
  } else if (absDiffSec < 3600) {
    const mins = Math.floor(absDiffSec / 60);
    relative = isExpired ? `${mins}m ago` : `in ${mins}m`;
  } else if (absDiffSec < 86400) {
    const hours = Math.floor(absDiffSec / 3600);
    relative = isExpired ? `${hours}h ago` : `in ${hours}h`;
  } else {
    const days = Math.floor(absDiffSec / 86400);
    relative = isExpired ? `${days}d ago` : `in ${days}d`;
  }

  return {
    formatted: date.toLocaleString(),
    relative,
    isExpired
  };
}

export function JwtToolClient() {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const parsed = useMemo(() => parseJwt(token), [token]);

  const claimsInfo = useMemo(() => {
    if (!parsed.payload) return null;
    const exp = typeof parsed.payload.exp === "number" ? formatTimestamp(parsed.payload.exp) : null;
    const iat = typeof parsed.payload.iat === "number" ? formatTimestamp(parsed.payload.iat) : null;
    const nbf = typeof parsed.payload.nbf === "number" ? formatTimestamp(parsed.payload.nbf) : null;
    const alg = typeof parsed.header?.alg === "string" ? parsed.header.alg : "Unknown";
    const isNoneAlg = alg.toLowerCase() === "none";

    return { exp, iat, nbf, alg, isNoneAlg };
  }, [parsed]);

  async function copyText(text: string, section: string) {
    await navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 1800);
  }

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
        <span className="font-medium text-foreground">JWT Inspector</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <KeyRound className="size-4" />
          Offline Token Debugger
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">JWT Inspector & Decoder</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Inspect, decode, and analyze JSON Web Tokens in real-time. Tokens are parsed completely offline in your
          browser — credentials never leave your device.
        </p>
      </header>

      {/* Input Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="jwt-input" className="text-xs font-semibold text-muted-foreground">
            Encoded JWT Token
          </label>
          <div className="flex items-center gap-2">
            <Button onClick={() => setToken(SAMPLE_JWT)} size="sm" variant="outline" className="gap-1.5 text-xs">
              <Sparkles className="size-3.5" />
              Sample
            </Button>
            <Button onClick={() => setToken("")} size="sm" variant="outline" className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>

        <textarea
          id="jwt-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste JWT string (eyJhbGciOi...)"
          className="h-28 w-full rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/20 break-all"
          spellCheck={false}
        />
      </div>

      {/* Error Banner */}
      {parsed.error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{parsed.error}</span>
        </div>
      )}

      {/* Claims & Expiration Status Bar */}
      {claimsInfo && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Expiration Status */}
          <div className="glass-panel flex flex-col justify-between p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3 text-primary" />
              Token Expiration
            </span>
            {claimsInfo.exp ? (
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                    claimsInfo.exp.isExpired
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {claimsInfo.exp.isExpired ? "Expired " + claimsInfo.exp.relative : "Active · expires " + claimsInfo.exp.relative}
                </span>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{claimsInfo.exp.formatted}</p>
              </div>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">No exp claim (Never expires)</span>
            )}
          </div>

          {/* Algorithm Badge */}
          <div className="glass-panel flex flex-col justify-between p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="size-3 text-primary" />
              Algorithm
            </span>
            <div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                  claimsInfo.isNoneAlg
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-primary/15 text-primary"
                )}
              >
                {claimsInfo.alg}
              </span>
              {claimsInfo.isNoneAlg && (
                <p className="mt-1 text-[10px] text-amber-600 font-medium">Unsecured (none algorithm)</p>
              )}
            </div>
          </div>

          {/* Issued At */}
          <div className="glass-panel flex flex-col justify-between p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Issued At (iat)</span>
            <div>
              <span className="text-xs font-semibold text-foreground">
                {claimsInfo.iat ? claimsInfo.iat.relative : "Not specified"}
              </span>
              {claimsInfo.iat && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{claimsInfo.iat.formatted}</p>
              )}
            </div>
          </div>

          {/* Subject / Issuer */}
          <div className="glass-panel flex flex-col justify-between p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject & Issuer</span>
            <div className="truncate">
              <span className="text-xs font-semibold text-foreground truncate block">
                {typeof parsed.payload?.sub === "string" ? parsed.payload.sub : "No subject"}
              </span>
              <p className="mt-1 text-[10px] text-muted-foreground truncate">
                {typeof parsed.payload?.iss === "string" ? "by " + parsed.payload.iss : "No issuer"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Decoded Sections Grid */}
      {parsed.header && parsed.payload && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Header Card */}
          <Card className="overflow-hidden border-border/70 bg-card/60">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="text-rose-500 font-bold uppercase tracking-wider text-[11px]">HEADER: Algorithm & Token Type</span>
                <Button
                  onClick={() => copyText(JSON.stringify(parsed.header, null, 2), "header")}
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-[10px]"
                >
                  {copiedSection === "header" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  {copiedSection === "header" ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="max-h-[350px] overflow-auto p-4 font-mono text-xs leading-relaxed text-rose-600 dark:text-rose-300">
                {JSON.stringify(parsed.header, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Payload Card */}
          <Card className="overflow-hidden border-border/70 bg-card/60">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span className="text-purple-500 font-bold uppercase tracking-wider text-[11px]">PAYLOAD: Data & Claims</span>
                <Button
                  onClick={() => copyText(JSON.stringify(parsed.payload, null, 2), "payload")}
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-[10px]"
                >
                  {copiedSection === "payload" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  {copiedSection === "payload" ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="max-h-[350px] overflow-auto p-4 font-mono text-xs leading-relaxed text-purple-600 dark:text-purple-300">
                {JSON.stringify(parsed.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signature Section */}
      {parsed.signature && (
        <Card className="overflow-hidden border-border/70 bg-card/60">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="text-blue-500 font-bold uppercase tracking-wider text-[11px]">SIGNATURE (HMAC / RSA / ECDSA)</span>
              <Button
                onClick={() => copyText(parsed.signature, "signature")}
                size="sm"
                variant="ghost"
                className="h-6 gap-1 px-2 text-[10px]"
              >
                {copiedSection === "signature" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                {copiedSection === "signature" ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="p-4 font-mono text-xs text-blue-600 dark:text-blue-300 break-all leading-relaxed">
              {parsed.signature}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default JwtToolClient;
