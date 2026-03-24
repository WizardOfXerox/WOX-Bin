"use client";

import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Vote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type PollSnapshot = {
  slug: string;
  question: string;
  allowMultiple: boolean;
  createdAt: string;
  expiresAt: string | null;
  totalVotes: number;
  selectedOptionIds: string[];
  options: {
    id: string;
    label: string;
    voteCount: number;
    percent: number;
  }[];
};

export function PollViewClient({ initialPoll }: { initialPoll: PollSnapshot }) {
  const [poll, setPoll] = useState(initialPoll);
  const [selection, setSelection] = useState<string[]>(initialPoll.selectedOptionIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = useMemo(() => new Set(selection), [selection]);

  function toggleOption(id: string) {
    setSelection((current) => {
      if (poll.allowMultiple) {
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      }
      return [id];
    });
  }

  async function submitVote() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/privacy/polls/${poll.slug}/vote`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          optionIds: selection
        })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } & Partial<PollSnapshot>;
      if (!response.ok || !payload?.slug) {
        setError(payload?.error || "Vote could not be submitted.");
        return;
      }
      setPoll(payload as PollSnapshot);
      setSelection((payload as PollSnapshot).selectedOptionIds);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Vote className="size-4" />
            Public poll
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{poll.question}</h1>
          <p className="text-sm leading-7 text-muted-foreground">
            Created {formatDate(poll.createdAt)} · {poll.totalVotes.toLocaleString()} total vote{poll.totalVotes === 1 ? "" : "s"}
            {poll.expiresAt ? ` · closes ${formatDate(poll.expiresAt)}` : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4 text-primary" />
              Cast your vote
            </div>
            <div className="space-y-3">
              {poll.options.map((option) => (
                <button
                  className={`flex w-full items-start gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition ${
                    selectedSet.has(option.id)
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/20"
                  }`}
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  type="button"
                >
                  <span className="mt-0.5">
                    <input checked={selectedSet.has(option.id)} onChange={() => toggleOption(option.id)} type={poll.allowMultiple ? "checkbox" : "radio"} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            <Button disabled={!selection.length || busy} onClick={() => void submitVote()} type="button">
              Submit vote
            </Button>
            {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="size-4 text-primary" />
              Live results
            </div>
            <div className="space-y-3">
              {poll.options.map((option) => (
                <div className="space-y-2" key={option.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground">
                      {option.voteCount.toLocaleString()} · {option.percent}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background/80">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${option.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
