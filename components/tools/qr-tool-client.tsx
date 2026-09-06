"use client";

import { useEffect, useId, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, FileCode, QrCode, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export function QrToolClient() {
  const [content, setContent] = useState("https://wox-bin.vercel.app");
  const [ecLevel, setEcLevel] = useState<ErrorCorrectionLevel>("M");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const [margin, setMargin] = useState(2);
  const [pngResolution, setPngResolution] = useState(1024);

  const [svgMarkup, setSvgMarkup] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const fgId = useId();
  const bgId = useId();

  // Generate QR Code dynamically on settings change
  useEffect(() => {
    let active = true;
    const text = content.trim();

    if (!text) {
      setSvgMarkup("");
      setPngDataUrl("");
      setError(null);
      return;
    }

    const lightColor = transparentBg ? "#00000000" : bgColor;

    Promise.all([
      QRCode.toString(text, {
        type: "svg",
        errorCorrectionLevel: ecLevel,
        margin,
        color: {
          dark: fgColor,
          light: lightColor
        }
      }),
      QRCode.toDataURL(text, {
        errorCorrectionLevel: ecLevel,
        margin,
        width: pngResolution,
        color: {
          dark: fgColor,
          light: lightColor
        }
      })
    ])
      .then(([svg, png]) => {
        if (!active) return;
        setSvgMarkup(svg);
        setPngDataUrl(png);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to generate QR Code.");
      });

    return () => {
      active = false;
    };
  }, [content, ecLevel, fgColor, bgColor, transparentBg, margin, pngResolution]);

  function handleDownloadPng() {
    if (!pngDataUrl) return;
    const link = document.createElement("a");
    link.href = pngDataUrl;
    link.download = `qrcode-${Date.now()}.png`;
    link.click();
  }

  function handleDownloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrcode-${Date.now()}.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function handleCopySvg() {
    if (!svgMarkup) return;
    await navigator.clipboard.writeText(svgMarkup);
    setCopiedSection("svg");
    setTimeout(() => setCopiedSection(null), 1800);
  }

  async function handleCopyPng() {
    if (!pngDataUrl) return;
    try {
      const res = await fetch(pngDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob
        })
      ]);
      setCopiedSection("png");
      setTimeout(() => setCopiedSection(null), 1800);
    } catch {
      // Fallback to text data URL if clipboard image API fails
      await navigator.clipboard.writeText(pngDataUrl);
      setCopiedSection("png");
      setTimeout(() => setCopiedSection(null), 1800);
    }
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
        <span className="font-medium text-foreground">QR Code Studio</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <QrCode className="size-4" />
          Offline Vector Generator
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">QR Code Studio</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Generate customized vector SVG and high-resolution PNG QR codes for URLs, text, Wi-Fi credentials, and
          cryptocurrency addresses. Generated entirely in the browser with zero tracking.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Controls Column (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="qr-content" className="text-xs font-semibold text-muted-foreground">
                Payload / Content
              </label>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setContent("WIFI:S:MyNetwork;T:WPA;P:SecretPassword123;;")}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px]"
                >
                  <Sparkles className="mr-1 size-3" />
                  Wi-Fi Sample
                </Button>
                <Button
                  onClick={() => setContent("")}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1 size-3" />
                  Clear
                </Button>
              </div>
            </div>
            <textarea
              id="qr-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter URL, text, or payload..."
              className="h-28 w-full rounded-xl border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed outline-none transition focus:border-primary/50 focus:bg-background focus:ring-1 focus:ring-primary/20"
              spellCheck={false}
            />
          </div>

          {/* Configuration Parameters */}
          <div className="grid gap-4 rounded-xl border border-border/70 bg-card/60 p-4 sm:grid-cols-2">
            {/* Error Correction Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Error Correction</label>
              <div className="grid grid-cols-4 gap-1">
                {(["L", "M", "Q", "H"] as ErrorCorrectionLevel[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEcLevel(level)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-center text-xs font-bold transition",
                      ecLevel === level
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {level}
                    <span className="block text-[9px] font-normal opacity-80">
                      {level === "L" ? "7%" : level === "M" ? "15%" : level === "Q" ? "25%" : "30%"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quiet Zone Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Border Margin (Quiet Zone)</label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMargin(m)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-center text-xs font-bold transition",
                      margin === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {m}px
                  </button>
                ))}
              </div>
            </div>

            {/* Foreground Color */}
            <div className="space-y-1.5">
              <label htmlFor={fgId} className="text-xs font-semibold text-muted-foreground">
                Foreground Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={fgId}
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0"
                />
                <Input
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={bgId} className="text-xs font-semibold text-muted-foreground">
                  Background Color
                </label>
                <button
                  type="button"
                  onClick={() => setTransparentBg(!transparentBg)}
                  className={cn(
                    "text-[10px] font-medium underline",
                    transparentBg ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {transparentBg ? "Using Transparent" : "Make Transparent"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id={bgId}
                  type="color"
                  value={bgColor}
                  disabled={transparentBg}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="size-8 cursor-pointer rounded border border-border bg-transparent p-0 disabled:opacity-30"
                />
                <Input
                  value={transparentBg ? "transparent" : bgColor}
                  disabled={transparentBg}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* PNG Resolution */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">PNG Export Resolution</label>
              <div className="grid grid-cols-4 gap-2">
                {[256, 512, 1024, 2048].map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setPngResolution(res)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition",
                      pngResolution === res
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {res}×{res}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview & Export Column (5 cols) */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card className="flex flex-col items-center justify-center p-6 border-border/70 bg-card/60">
            {error ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-destructive">
                <p className="text-xs">{error}</p>
              </div>
            ) : svgMarkup ? (
              <div
                className="size-64 max-w-full rounded-xl border border-border/40 p-3 shadow-inner flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: transparentBg ? "transparent" : bgColor,
                  backgroundImage: transparentBg
                    ? "radial-gradient(rgba(128,128,128,0.2) 1px, transparent 1px)"
                    : "none",
                  backgroundSize: "12px 12px"
                }}
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            ) : (
              <div className="flex size-64 flex-col items-center justify-center text-muted-foreground">
                <QrCode className="size-12 opacity-30" />
                <p className="mt-3 text-xs">Enter content to generate code</p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!pngDataUrl}
              onClick={handleDownloadPng}
              className="gap-1.5 text-xs font-medium"
              size="sm"
            >
              <Download className="size-3.5" />
              Download PNG
            </Button>
            <Button
              disabled={!svgMarkup}
              onClick={handleDownloadSvg}
              variant="outline"
              className="gap-1.5 text-xs font-medium"
              size="sm"
            >
              <Download className="size-3.5" />
              Download SVG
            </Button>
            <Button
              disabled={!pngDataUrl}
              onClick={handleCopyPng}
              variant="secondary"
              className="gap-1.5 text-xs font-medium"
              size="sm"
            >
              {copiedSection === "png" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copiedSection === "png" ? "Copied Image" : "Copy Image"}
            </Button>
            <Button
              disabled={!svgMarkup}
              onClick={handleCopySvg}
              variant="secondary"
              className="gap-1.5 text-xs font-medium"
              size="sm"
            >
              {copiedSection === "svg" ? <Check className="size-3.5 text-emerald-500" /> : <FileCode className="size-3.5" />}
              {copiedSection === "svg" ? "Copied SVG" : "Copy SVG"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QrToolClient;
