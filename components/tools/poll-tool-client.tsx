"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Plus, Vote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const EXPIRY_OPTIONS = [
  { value: "1-day", label: "1 day" },
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "never", label: "Never" }
] as const;

export function PollToolClient() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresPreset, setExpiresPreset] = useState<(typeof EXPIRY_OPTIONS)[number]["value"]>("7-days");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((entry, entryIndex) => (entryIndex === index ? value : entry)));
  }

  function addOption() {
    setOptions((current) => (current.length >= 10 ? current : [...current, ""]));
  }

  async function createPoll() {
    setBusy(true);
    setError("");
    setShareUrl("");
    try {
      const response = await fetch("/api/privacy/polls", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          question,
          optionLabels: options,
          allowMultiple,
          expiresPreset
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error || "Poll could not be created.");
        return;
      }

      setShareUrl(payload.url);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Vote className="size-4" />
            Anonymous polls
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Launch a simple public poll and share the results page.</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Poll questions and options are intentionally plain so anybody can vote without a decryption key. WOX-Bin
            rate limits votes and keeps the experience lightweight.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="poll-question">
              Question
            </label>
            <Input id="poll-question" onChange={(event) => setQuestion(event.target.value)} placeholder="Which rollout window should we use?" value={question} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Options</p>
              <Button disabled={options.length >= 10} onClick={addOption} type="button" variant="outline">
                <Plus className="size-4" />
                Add option
              </Button>
            </div>
            {options.map((option, index) => (
              <Input
                key={`option-${index}`}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
                value={option}
              />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="flex items-center gap-3 rounded-[1.25rem] border border-border bg-background/60 px-4 py-3 text-sm">
              <input checked={allowMultiple} onChange={(event) => setAllowMultiple(event.target.checked)} type="checkbox" />
              Allow multiple answers
            </label>
            <select
              className="h-11 w-full rounded-[1.25rem] border border-border bg-card/80 px-4 text-sm"
              onChange={(event) => setExpiresPreset(event.target.value as (typeof EXPIRY_OPTIONS)[number]["value"])}
              value={expiresPreset}
            >
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button disabled={busy} onClick={() => void createPoll()} type="button">
            Create poll
          </Button>

          {shareUrl ? (
            <div className="space-y-3 rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-4">
              <p className="text-sm font-medium">Poll ready</p>
              <code className="block break-all text-xs text-primary/90">{shareUrl}</code>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void copyLink()} type="button">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button asChild type="button" variant="outline">
                  <a href={shareUrl} rel="noreferrer noopener" target="_blank">
                    Open poll
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
