"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  RefreshCw,
  Sparkles,
  Timer
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TOOLS_CLIENT_HEADER, TOOLS_CLIENT_NAV, TOOLS_CLIENT_WIDE } from "@/lib/tools/tools-layout";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

type Preset = {
  label: string;
  expression: string;
  description: string;
};

const PRESETS: Preset[] = [
  { label: "Every minute", expression: "* * * * *", description: "Runs every single minute" },
  { label: "Every 5 minutes", expression: "*/5 * * * *", description: "Runs every 5 minutes" },
  { label: "Every 15 minutes", expression: "*/15 * * * *", description: "Runs every quarter hour" },
  { label: "Every 30 minutes", expression: "*/30 * * * *", description: "Runs twice an hour" },
  { label: "Hourly", expression: "0 * * * *", description: "Runs at minute 0 of every hour" },
  { label: "Every 2 hours", expression: "0 */2 * * *", description: "Runs every 2 hours" },
  { label: "Daily at midnight", expression: "0 0 * * *", description: "Runs at 00:00 every day" },
  { label: "Daily at 9:00 AM", expression: "0 9 * * *", description: "Runs at 09:00 every morning" },
  { label: "Weekdays at 9:00 AM", expression: "0 9 * * 1-5", description: "Runs Mon-Fri at 09:00" },
  { label: "Weekends at 10:00 AM", expression: "0 10 * * 0,6", description: "Runs Sat & Sun at 10:00" },
  { label: "Weekly on Sunday midnight", expression: "0 0 * * 0", description: "Runs once a week on Sunday" },
  { label: "Monthly on 1st at midnight", expression: "0 0 1 * *", description: "Runs on day 1 of every month" },
  { label: "Every 10 seconds (6-field)", expression: "*/10 * * * * *", description: "Runs every 10 seconds" }
];

// Helper to normalize month / weekday names to integers
function normalizePart(part: string, isMonth: boolean, isDow: boolean): string {
  let upper = part.toUpperCase();
  if (isMonth) {
    MONTH_NAMES.forEach((m, idx) => {
      upper = upper.replaceAll(m, String(idx + 1));
    });
  }
  if (isDow) {
    DAY_NAMES.forEach((d, idx) => {
      upper = upper.replaceAll(d, String(idx));
    });
    // Support 7 as Sunday (0)
    if (upper === "7") upper = "0";
  }
  return upper;
}

// Check whether a specific integer matches a cron field segment
function matchesField(
  val: number,
  fieldStr: string,
  minVal: number,
  maxVal: number,
  isMonth = false,
  isDow = false
): boolean {
  if (fieldStr === "*" || fieldStr === "?") return true;

  const subParts = fieldStr.split(",");
  for (const rawSub of subParts) {
    const sub = normalizePart(rawSub.trim(), isMonth, isDow);

    // Step check: */5 or 10-50/5 or 10/5
    if (sub.includes("/")) {
      const [rangePart, stepPart] = sub.split("/");
      const step = parseInt(stepPart!, 10);
      if (isNaN(step) || step <= 0) continue;

      let start = minVal;
      let end = maxVal;

      if (rangePart && rangePart !== "*") {
        if (rangePart.includes("-")) {
          const [s, e] = rangePart.split("-");
          start = parseInt(s!, 10);
          end = parseInt(e!, 10);
        } else {
          start = parseInt(rangePart, 10);
        }
      }

      if (val >= start && val <= end && (val - start) % step === 0) {
        return true;
      }
    }
    // Range check: 1-5
    else if (sub.includes("-")) {
      const [startStr, endStr] = sub.split("-");
      const start = parseInt(startStr!, 10);
      const end = parseInt(endStr!, 10);
      if (val >= start && val <= end) {
        return true;
      }
    }
    // Direct integer match
    else {
      const target = parseInt(sub, 10);
      if (isDow && (sub === "7" || target === 7)) {
        if (val === 0) return true;
      }
      if (val === target) {
        return true;
      }
    }
  }

  return false;
}

// Generate human-friendly English description of a single field
function describeField(
  name: string,
  val: string,
  min: number,
  max: number,
  isMonth = false,
  isDow = false
): string {
  if (val === "*" || val === "?") {
    if (name === "Minute") return "Every minute";
    if (name === "Hour") return "Every hour";
    if (name === "Day of Month") return "Every day of the month";
    if (name === "Month") return "Every month";
    if (name === "Day of Week") return "Every day of the week";
    if (name === "Second") return "Every second";
    return "Every";
  }

  if (val.startsWith("*/")) {
    const step = val.slice(2);
    return `Every ${step} ${name.toLowerCase()}s`;
  }

  if (isDow) {
    if (val === "1-5") return "Monday through Friday (weekdays)";
    if (val === "0,6" || val === "6,0" || val === "6,7") return "Saturday and Sunday (weekends)";
    const parts = val.split(",");
    const names = parts
      .map((p) => {
        const num = parseInt(normalizePart(p, false, true), 10);
        return FULL_DAY_NAMES[num % 7] || p;
      })
      .join(", ");
    return `Only on ${names}`;
  }

  if (isMonth) {
    const parts = val.split(",");
    const names = parts
      .map((p) => {
        const num = parseInt(normalizePart(p, true, false), 10);
        return FULL_MONTH_NAMES[num - 1] || p;
      })
      .join(", ");
    return `In ${names}`;
  }

  if (val.includes("-")) {
    const [s, e] = val.split("-");
    return `${name} ${s} through ${e}`;
  }

  if (val.includes(",")) {
    return `At ${name.toLowerCase()}s ${val}`;
  }

  return `At ${name.toLowerCase()} ${val}`;
}

// Generate overall English explanation
function generateCronExplanation(fields: string[]): string {
  const is6Field = fields.length === 6;
  const secStr = is6Field ? fields[0]! : "0";
  const minStr = is6Field ? fields[1]! : fields[0]!;
  const hourStr = is6Field ? fields[2]! : fields[1]!;
  const domStr = is6Field ? fields[3]! : fields[2]!;
  const monthStr = is6Field ? fields[4]! : fields[3]!;
  const dowStr = is6Field ? fields[5]! : fields[4]!;

  const parts: string[] = [];

  // Time part
  if (is6Field && secStr !== "0") {
    if (secStr.startsWith("*/")) {
      parts.push(`Every ${secStr.slice(2)} seconds`);
    } else if (secStr === "*") {
      parts.push("Every second");
    } else {
      parts.push(`At second ${secStr}`);
    }
  }

  if (minStr === "*" && hourStr === "*") {
    if (!parts.length) parts.push("Every minute");
  } else if (minStr.startsWith("*/") && hourStr === "*") {
    parts.push(`Every ${minStr.slice(2)} minutes`);
  } else if (hourStr === "*") {
    parts.push(`At minute ${minStr} of every hour`);
  } else if (hourStr.startsWith("*/")) {
    parts.push(`Every ${hourStr.slice(2)} hours at minute ${minStr}`);
  } else {
    // Specific hour and minute
    const h = parseInt(hourStr, 10);
    const m = parseInt(minStr, 10);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = m.toString().padStart(2, "0");
      parts.push(`At ${displayH}:${displayM} ${ampm}`);
    } else {
      parts.push(`At hour ${hourStr}, minute ${minStr}`);
    }
  }

  // Day of Month
  if (domStr !== "*" && domStr !== "?") {
    if (domStr.startsWith("*/")) {
      parts.push(`every ${domStr.slice(2)} days`);
    } else {
      parts.push(`on day ${domStr} of the month`);
    }
  }

  // Month
  if (monthStr !== "*") {
    const months = monthStr
      .split(",")
      .map((m) => {
        const num = parseInt(normalizePart(m, true, false), 10);
        return FULL_MONTH_NAMES[num - 1] || m;
      })
      .join(", ");
    parts.push(`in ${months}`);
  }

  // Day of Week
  if (dowStr !== "*" && dowStr !== "?") {
    if (dowStr === "1-5") {
      parts.push("Monday through Friday");
    } else if (dowStr === "0,6" || dowStr === "6,0") {
      parts.push("on Saturday and Sunday");
    } else {
      const days = dowStr
        .split(",")
        .map((d) => {
          const num = parseInt(normalizePart(d, false, true), 10);
          return FULL_DAY_NAMES[num % 7] || d;
        })
        .join(", ");
      parts.push(`on ${days}`);
    }
  }

  return parts.join(", ");
}

// Calculate the next 10 occurrences
function getNextExecutions(fields: string[], count = 10): Date[] {
  const is6Field = fields.length === 6;
  const secPart = is6Field ? fields[0]! : "0";
  const minPart = is6Field ? fields[1]! : fields[0]!;
  const hourPart = is6Field ? fields[2]! : fields[1]!;
  const domPart = is6Field ? fields[3]! : fields[2]!;
  const monthPart = is6Field ? fields[4]! : fields[3]!;
  const dowPart = is6Field ? fields[5]! : fields[4]!;

  const dates: Date[] = [];
  const current = new Date();

  // Round up to next whole second / minute
  if (is6Field) {
    current.setSeconds(current.getSeconds() + 1);
    current.setMilliseconds(0);
  } else {
    current.setMinutes(current.getMinutes() + 1);
    current.setSeconds(0);
    current.setMilliseconds(0);
  }

  let iterations = 0;
  const maxIterations = 50000; // safety brake

  while (dates.length < count && iterations < maxIterations) {
    iterations++;

    const sec = current.getSeconds();
    const min = current.getMinutes();
    const hour = current.getHours();
    const dom = current.getDate();
    const month = current.getMonth() + 1; // 1-12
    const dow = current.getDay(); // 0-6

    // 1. Month check
    if (!matchesField(month, monthPart, 1, 12, true, false)) {
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // 2. Day check (both dom and dow)
    const domMatch = matchesField(dom, domPart, 1, 31, false, false);
    const dowMatch = matchesField(dow, dowPart, 0, 6, false, true);

    // Standard cron logic: if both DOM and DOW are specified (not *), OR is typically used in standard cron,
    // but if one is wildcard, the other must match.
    let dayValid = false;
    if (domPart === "*" && dowPart === "*") {
      dayValid = true;
    } else if (domPart === "*") {
      dayValid = dowMatch;
    } else if (dowPart === "*") {
      dayValid = domMatch;
    } else {
      dayValid = domMatch || dowMatch;
    }

    if (!dayValid) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // 3. Hour check
    if (!matchesField(hour, hourPart, 0, 23)) {
      current.setHours(current.getHours() + 1);
      current.setMinutes(0, 0, 0);
      continue;
    }

    // 4. Minute check
    if (!matchesField(min, minPart, 0, 59)) {
      current.setMinutes(current.getMinutes() + 1);
      current.setSeconds(0, 0);
      continue;
    }

    // 5. Second check
    if (is6Field && !matchesField(sec, secPart, 0, 59)) {
      current.setSeconds(current.getSeconds() + 1);
      continue;
    }

    // Matches! Record date
    dates.push(new Date(current));

    // Advance for next iteration
    if (is6Field) {
      current.setSeconds(current.getSeconds() + 1);
    } else {
      current.setMinutes(current.getMinutes() + 1);
    }
  }

  return dates;
}

function formatRelativeDistance(target: Date): string {
  const diffSec = Math.round((target.getTime() - Date.now()) / 1000);
  if (diffSec < 60) return `in ${Math.max(1, diffSec)}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `in ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `in ${diffDays}d`;
}

export function CronToolClient() {
  const [expression, setExpression] = useState("0 9 * * 1-5");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Parse fields
  const { fields, isValid, error, is6Field, explanation, nextDates } = useMemo(() => {
    const trimmed = expression.trim();
    if (!trimmed) {
      return {
        fields: [],
        isValid: false,
        error: "Expression is empty",
        is6Field: false,
        explanation: "",
        nextDates: []
      };
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) {
      return {
        fields: parts,
        isValid: false,
        error: `Invalid field count (${parts.length}). Standard cron requires 5 fields (minute, hour, day, month, weekday) or 6 fields (including seconds).`,
        is6Field: false,
        explanation: "",
        nextDates: []
      };
    }

    try {
      const dates = getNextExecutions(parts, 10);
      const expl = generateCronExplanation(parts);
      return {
        fields: parts,
        isValid: true,
        error: null,
        is6Field: parts.length === 6,
        explanation: expl,
        nextDates: dates
      };
    } catch (err) {
      return {
        fields: parts,
        isValid: false,
        error: err instanceof Error ? err.message : "Calculation failed",
        is6Field: parts.length === 6,
        explanation: "",
        nextDates: []
      };
    }
  }, [expression]);

  const updateField = (index: number, val: string) => {
    const parts = [...fields];
    parts[index] = val;
    setExpression(parts.join(" "));
  };

  const copyText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // ignore
    }
  };

  const fieldDefinitions = useMemo(() => {
    if (is6Field) {
      return [
        { name: "Second", range: "0-59", index: 0, isMonth: false, isDow: false, quick: ["0", "*", "*/10", "*/30"] },
        { name: "Minute", range: "0-59", index: 1, isMonth: false, isDow: false, quick: ["0", "*", "*/5", "*/15", "30"] },
        { name: "Hour", range: "0-23", index: 2, isMonth: false, isDow: false, quick: ["0", "*", "9", "12", "*/2"] },
        { name: "Day of Month", range: "1-31", index: 3, isMonth: false, isDow: false, quick: ["*", "1", "15", "*/2"] },
        { name: "Month", range: "1-12", index: 4, isMonth: true, isDow: false, quick: ["*", "1", "1,6", "*/3"] },
        { name: "Day of Week", range: "0-6", index: 5, isMonth: false, isDow: true, quick: ["*", "1-5", "0,6", "0"] }
      ];
    }
    return [
      { name: "Minute", range: "0-59", index: 0, isMonth: false, isDow: false, quick: ["0", "*", "*/5", "*/15", "30"] },
      { name: "Hour", range: "0-23", index: 1, isMonth: false, isDow: false, quick: ["0", "*", "9", "12", "*/2"] },
      { name: "Day of Month", range: "1-31", index: 2, isMonth: false, isDow: false, quick: ["*", "1", "15", "*/2"] },
      { name: "Month", range: "1-12", index: 3, isMonth: true, isDow: false, quick: ["*", "1", "1,6", "*/3"] },
      { name: "Day of Week", range: "0-6", index: 4, isMonth: false, isDow: true, quick: ["*", "1-5", "0,6", "0"] }
    ];
  }, [is6Field]);

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
        <span className="font-medium text-foreground">Cron Expression Visualizer</span>
      </nav>

      <header className={TOOLS_CLIENT_HEADER}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <CalendarClock className="size-4" />
          Schedule Visualizer & Human Translator
        </div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Cron Expression Visualizer</h1>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Translate complex cron syntax into human-readable English, visually inspect each field, and preview the next
          10 scheduled execution dates in real-time.
        </p>
      </header>

      {/* Preset Library Quick Selector */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pr-2">
          <Sparkles className="size-3 text-primary" />
          Presets:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setExpression(p.expression)}
            className={cn(
              "rounded-full border border-border bg-card/60 px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-card hover:text-foreground",
              expression === p.expression ? "border-primary bg-primary/10 text-primary font-medium" : "text-muted-foreground"
            )}
            title={p.description}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Expression Input & Plain English Summary Card */}
      <div className="glass-panel space-y-3 p-3 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Cron Expression</label>
            <div className="flex items-center gap-2">
              <Input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. 0 9 * * 1-5"
                className="h-11 font-mono text-base font-semibold tracking-wide sm:text-lg text-foreground"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyText(expression, "cron-expr")}
                className="h-11 gap-1 px-3 text-xs"
              >
                {copiedType === "cron-expr" ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Syntax Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Invalid Cron Expression</span>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Human Translation Banner */}
        {isValid && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Clock className="size-3.5" />
              Human-Readable Schedule
            </div>
            <div className="text-sm sm:text-base font-medium text-foreground capitalize">
              {explanation || "Schedule defined"}
            </div>
          </div>
        )}
      </div>

      {/* Visual Field Breakdown Cards */}
      {isValid && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Field Breakdown ({fields.length} Fields)</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {fieldDefinitions.map((f) => {
              const currentVal = fields[f.index] || "*";
              const desc = describeField(
                f.name,
                currentVal,
                0,
                59,
                f.isMonth,
                f.isDow
              );

              return (
                <Card key={f.name} className="overflow-hidden">
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">({f.range})</span>
                    </div>

                    <Input
                      value={currentVal}
                      onChange={(e) => updateField(f.index, e.target.value)}
                      className="h-8 font-mono text-xs font-bold text-center"
                    />

                    <div className="text-[11px] text-primary min-h-[30px] font-medium leading-tight">
                      {desc}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                      {f.quick.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => updateField(f.index, q)}
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-mono transition-colors",
                            currentVal === q
                              ? "border-primary bg-primary text-primary-foreground font-bold"
                              : "border-border bg-card/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Next 10 Executions Preview */}
      {isValid && nextDates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Next 10 Scheduled Executions</h2>
              <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Current Time: {new Date().toLocaleTimeString()}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copyText(
                  nextDates.map((d, i) => `${i + 1}. ${d.toLocaleString()}`).join("\n"),
                  "dates-list"
                )
              }
              className="h-7 gap-1 text-xs"
            >
              {copiedType === "dates-list" ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  Copied List
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy Dates
                </>
              )}
            </Button>
          </div>

          <div className="glass-panel divide-y divide-border/60 overflow-hidden rounded-2xl">
            {nextDates.map((date, idx) => {
              const rel = formatRelativeDistance(date);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs sm:text-sm hover:bg-card/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-foreground font-medium">
                      {date.toLocaleDateString(undefined, {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}{" "}
                      {date.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: is6Field ? "2-digit" : undefined
                      })}
                    </span>
                  </div>

                  <span className="rounded-full border border-border/80 bg-card/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
                    {rel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
