"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useUiLanguage } from "@/components/providers/ui-language-provider";
import { languageLabel, UI_LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className = "",
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { language, setLanguage, t } = useUiLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cn("relative inline-flex", className)} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-background",
          open ? "border-primary/35 bg-card text-foreground shadow-[0_16px_50px_rgba(0,0,0,0.25)]" : null
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Languages className="h-4 w-4 shrink-0" />
        {!compact ? <span className="hidden sm:inline">{t("common.language")}</span> : null}
        <span className="max-w-[7rem] truncate text-sm font-medium text-foreground">{languageLabel(language)}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "rotate-180" : null)} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.55rem)] z-[90] min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-card/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          id={menuId}
          role="menu"
        >
          {UI_LANGUAGES.map((option) => {
            const active = option.value === language;
            return (
              <button
                aria-checked={active}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/12 text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
                key={option.value}
                onClick={() => {
                  setLanguage(option.value);
                  setOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span>{option.label}</span>
                <Check className={cn("h-4 w-4 shrink-0", active ? "opacity-100 text-primary" : "opacity-0")} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
